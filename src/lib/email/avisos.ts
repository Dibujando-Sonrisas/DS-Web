import "server-only";
import type { AvisoCorreo } from "@/lib/avisosCorreo";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { enviarCorreo, type Correo } from "./enviarCorreo";
import { COLOR, FUENTE, SITIO, botonCorreo, escapeHtml, filaCorreo, layoutCorreo } from "./layout";

/** Variables del servidor que faltan para enviar los avisos por correo. */
export function configuracionFaltante(): string[] {
  return ["RESEND_API_KEY", "SUPABASE_SECRET_KEY"].filter((v) => !process.env[v]);
}

/** Pie de los avisos al equipo: de qué lista de Ajustes → Correos viene. */
export function pieAviso(aviso: AvisoCorreo, extra = "") {
  return `Te llega este aviso porque estás en la lista de
      <a href="${SITIO}/administracion/ajustes/correos#aviso-${aviso}" style="color:${COLOR.primario};font-weight:600;text-decoration:none;">Ajustes → Correos</a>
      del panel.${extra}`;
}

/** Envía el correo a quienes reciben ese aviso (Ajustes → Correos); si nadie lo recibe, no hace nada. */
export async function enviarAviso(aviso: AvisoCorreo, correo: Omit<Correo, "to">): Promise<void> {
  const { data: destinatarios, error } = await createSupabaseAdminClient().rpc("correos_aviso", {
    p_aviso: aviso,
  });
  if (error) throw new Error(error.message);
  if (!destinatarios.length) return;
  await enviarCorreo({ to: destinatarios, ...correo });
}

/** Aviso "usuario_nuevo": se creó una cuenta y hay que revisar su rol. */
export function correoAvisoUsuarioNuevo(u: { nombre: string; correo: string; origen: string }) {
  const intro = "Se creó una cuenta en el panel con el rol predeterminado. Revisa si necesita otro rol o acceso.";
  return {
    subject: `Nuevo usuario: ${u.nombre}`,
    text: [
      intro,
      "",
      `Nombre: ${u.nombre}`,
      `Correo: ${u.correo}`,
      `Origen: ${u.origen}`,
      "",
      `Revisar en Usuarios: ${SITIO}/administracion/usuarios`,
    ].join("\n"),
    html: layoutCorreo({
      titulo: `Nuevo usuario: ${u.nombre}`,
      preheader: `${u.correo} · ${u.origen}`,
      cuerpo: `<p style="margin:0 0 24px;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${COLOR.gris};">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-top:1px solid ${COLOR.linea};">
  ${filaCorreo("Nombre", escapeHtml(u.nombre))}
  ${filaCorreo("Correo", escapeHtml(u.correo))}
  ${filaCorreo("Origen", escapeHtml(u.origen))}
</table>
<div style="font-size:0;">${botonCorreo(`${SITIO}/administracion/usuarios`, "Revisar en Usuarios")}</div>`,
      pie: pieAviso("usuario_nuevo"),
    }),
  };
}
