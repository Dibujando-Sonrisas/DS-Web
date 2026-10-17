import "server-only";
import { headers } from "next/headers";
import {
  SITE_URL,
  sendAcceptedVolunteerRequest,
  sendNewUser,
  sendPasswordReset,
  type VolunteerRequest,
} from "@/lib/email/emails";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("cuentas");

/**
 * Base de los enlaces de acceso. En producción SITE_URL y no el encabezado
 * Origin: se puede falsificar para que el enlace (con su token) apunte a otro sitio.
 */
async function urlSitio() {
  if (process.env.NODE_ENV !== "development") return SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `http://${h.get("host")}`;
}

/** Enlace de un solo uso a /auth/crear-contrasena; null si no hay cuenta con ese correo. */
async function enlaceContrasena(correo: string, sitio: string) {
  const { data, error } =
    await createSupabaseAdminClient().auth.admin.generateLink({
      type: "recovery",
      email: correo,
    });
  if (error?.code === "user_not_found") return null;
  if (error) {
    logger.error("Access link generation failed", errorInfo(error));
    throw new Error("No se pudo generar el enlace de acceso.");
  }
  return {
    usuario: data.user,
    url: `${sitio}/auth/crear-contrasena?token_hash=${encodeURIComponent(data.properties.hashed_token)}`,
  };
}

/**
 * Acepta una solicitud de voluntariado: crea la cuenta con su nombre y correo
 * (rol predeterminado, Voluntario), le envía el acceso y la marca aceptada.
 * Quien llama ya comprobó el permiso; la lectura y el cambio de estado van con
 * su sesión, así que la RLS también lo exige.
 */
export async function aceptarSolicitudVoluntario(
  id: string,
  { soloGeneral = false } = {}
) {
  const supabase = await createSupabaseServerClient();
  let consulta = supabase
    .from("inscripciones_voluntarios")
    .select(
      "fullName:nombre_completo, email:correo, phone:telefono, areaOfInterest:area_interes, brigade:brigada_id(name:nombre, date:fecha_brigada, location:lugar)"
    )
    .eq("id", id)
    .eq("estado", "pendiente");
  if (soloGeneral) consulta = consulta.is("brigada_id", null);
  const { data: solicitud, error } = await consulta.maybeSingle();
  if (error) {
    logger.error("Volunteer request load failed", {
      ...errorInfo(error),
      solicitudId: id,
    });
    throw new Error("No se pudo cargar la solicitud.");
  }
  if (!solicitud) throw new Error("La solicitud no existe o ya fue procesada.");

  // cuenta y correo primero: si fallan, sigue pendiente y se puede volver a aceptar
  await crearCuentaVoluntario(solicitud);

  const { error: errorEstado } = await supabase
    .from("inscripciones_voluntarios")
    .update({ estado: "aceptado" })
    .eq("id", id);
  if (errorEstado) {
    logger.error("Volunteer request update failed", {
      ...errorInfo(errorEstado),
      solicitudId: id,
    });
    throw new Error("No se pudo actualizar la solicitud.");
  }
  logger.info("Volunteer request accepted", { solicitudId: id });
}

async function crearCuentaVoluntario(s: VolunteerRequest) {
  const admin = createSupabaseAdminClient();
  // si ya existe (se inscribió antes o un intento anterior falló) se usa esa cuenta
  const { data, error } = await admin.auth.admin.createUser({
    email: s.email,
    email_confirm: true,
    user_metadata: { nombre_completo: s.fullName },
  });
  if (error && error.code !== "email_exists") {
    logger.error("Volunteer account creation failed", errorInfo(error));
    throw new Error("No se pudo crear la cuenta del voluntario.");
  }

  if (data.user) {
    logger.info("Volunteer account created", { perfilId: data.user.id });
    // handle_new_user crea el perfil con el nombre; el teléfono se completa aquí
    if (s.phone) {
      const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ telefono: s.phone })
        .eq("id", data.user.id);
      if (errorPerfil)
        logger.warning("Volunteer phone update failed", {
          ...errorInfo(errorPerfil),
          perfilId: data.user.id,
        });
    }
    await avisarUsuarioNuevo(s.fullName, s.email, "Voluntario aceptado");
  }

  const sitio = await urlSitio();
  const enlace = await enlaceContrasena(s.email, sitio);
  if (!enlace) throw new Error("No se encontró la cuenta recién creada.");

  // si ya entró alguna vez tiene contraseña: se le manda a iniciar sesión
  const conCuenta = Boolean(enlace.usuario.last_sign_in_at);
  await sendAcceptedVolunteerRequest(s, {
    accessUrl: conCuenta ? `${sitio}/auth/login` : enlace.url,
    hasAccount: conCuenta,
    appUrl: sitio,
  });
}

/** Aviso "usuario_nuevo" a Ajustes → Correos; si falla, la cuenta ya quedó creada. */
export async function avisarUsuarioNuevo(
  nombre: string,
  correo: string,
  origen: string
) {
  try {
    await sendNewUser({ name: nombre, email: correo, source: origen });
  } catch (e) {
    logger.warning("New user notice failed", errorInfo(e));
  }
}

/** Envía el enlace para crear una contraseña nueva. No dice si el correo tiene cuenta. */
export async function enviarRestablecerContrasena(correo: string) {
  const enlace = await enlaceContrasena(correo, await urlSitio());
  if (!enlace) return;
  await sendPasswordReset(correo, enlace.url);
}
