import "server-only";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enviarCorreo } from "@/lib/email/enviarCorreo";
import { correoAvisoUsuarioNuevo, enviarAviso } from "@/lib/email/avisos";
import { SITIO } from "@/lib/email/layout";
import {
  correoRestablecerContrasena,
  correoSolicitudAceptada,
  type SolicitudVoluntario,
} from "@/lib/email/voluntarios";

/**
 * Base de los enlaces de acceso. En producción SITE_URL y no el encabezado
 * Origin: se puede falsificar para que el enlace (con su token) apunte a otro sitio.
 */
async function urlSitio() {
  if (process.env.NODE_ENV !== "development") return SITIO;
  const h = await headers();
  return h.get("origin") ?? `http://${h.get("host")}`;
}

/** Enlace de un solo uso a /auth/crear-contrasena; null si no hay cuenta con ese correo. */
async function enlaceContrasena(correo: string, sitio: string) {
  const { data, error } = await createSupabaseAdminClient().auth.admin.generateLink({
    type: "recovery",
    email: correo,
  });
  if (error?.code === "user_not_found") return null;
  if (error) throw new Error(error.message);
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
export async function aceptarSolicitudVoluntario(id: string, { soloGeneral = false } = {}) {
  const supabase = await createSupabaseServerClient();
  let consulta = supabase
    .from("inscripciones_voluntarios")
    .select("nombre_completo, correo, telefono, area_interes, brigada:brigada_id(nombre, fecha_brigada, lugar)")
    .eq("id", id)
    .eq("estado", "pendiente");
  if (soloGeneral) consulta = consulta.is("brigada_id", null);
  const { data: solicitud, error } = await consulta.maybeSingle();
  if (error) throw new Error(error.message);
  if (!solicitud) throw new Error("La solicitud no existe o ya fue procesada.");

  // cuenta y correo primero: si fallan, sigue pendiente y se puede volver a aceptar
  await crearCuentaVoluntario(solicitud);

  const { error: errorEstado } = await supabase
    .from("inscripciones_voluntarios")
    .update({ estado: "aceptado" })
    .eq("id", id);
  if (errorEstado) throw new Error(errorEstado.message);
}

async function crearCuentaVoluntario(s: SolicitudVoluntario) {
  const admin = createSupabaseAdminClient();
  // si ya existe (se inscribió antes o un intento anterior falló) se usa esa cuenta
  const { data, error } = await admin.auth.admin.createUser({
    email: s.correo,
    email_confirm: true,
    user_metadata: { nombre_completo: s.nombre_completo },
  });
  if (error && error.code !== "email_exists") throw new Error(error.message);

  if (data.user) {
    // handle_new_user crea el perfil con el nombre; el teléfono se completa aquí
    if (s.telefono) {
      const { error: errorPerfil } = await admin
        .from("perfiles")
        .update({ telefono: s.telefono })
        .eq("id", data.user.id);
      if (errorPerfil) console.error("No se pudo guardar el teléfono del voluntario:", errorPerfil);
    }
    await avisarUsuarioNuevo(s.nombre_completo, s.correo, "Voluntario aceptado");
  }

  const sitio = await urlSitio();
  const enlace = await enlaceContrasena(s.correo, sitio);
  if (!enlace) throw new Error("No se encontró la cuenta recién creada.");

  // si ya entró alguna vez tiene contraseña: se le manda a iniciar sesión
  const conCuenta = Boolean(enlace.usuario.last_sign_in_at);
  await enviarCorreo({
    to: [s.correo],
    ...correoSolicitudAceptada(s, {
      enlace: conCuenta ? `${sitio}/auth/login` : enlace.url,
      conCuenta,
      sitio,
    }),
  });
}

/** Aviso "usuario_nuevo" a Ajustes → Correos; si falla, la cuenta ya quedó creada. */
export async function avisarUsuarioNuevo(nombre: string, correo: string, origen: string) {
  try {
    await enviarAviso("usuario_nuevo", correoAvisoUsuarioNuevo({ nombre, correo, origen }));
  } catch (e) {
    console.error("No se pudo enviar el aviso de usuario nuevo:", e);
  }
}

/** Envía el enlace para crear una contraseña nueva. No dice si el correo tiene cuenta. */
export async function enviarRestablecerContrasena(correo: string) {
  const enlace = await enlaceContrasena(correo, await urlSitio());
  if (!enlace) return;
  await enviarCorreo({ to: [correo], ...correoRestablecerContrasena(correo, enlace.url) });
}
