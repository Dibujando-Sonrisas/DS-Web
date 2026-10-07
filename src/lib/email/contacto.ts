import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enviarCorreo } from "./enviarCorreo";
import { COLOR, FUENTE, SITIO, botonCorreo, escapeHtml, filaCorreo, layoutCorreo } from "./layout";

export type MensajeContacto = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  asunto: string;
  mensaje: string;
};

/** Variables del servidor que faltan para avisar por correo de los mensajes de contacto. */
export function configuracionFaltante(): string[] {
  return ["RESEND_API_KEY", "CORREOS_CONTACTO_CLAVE"].filter((v) => !process.env[v]);
}

const formatFecha = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
});

/** Asunto, texto plano y HTML con la marca del aviso de un mensaje de contacto. */
export function armarCorreoContacto(m: MensajeContacto, recibido = new Date()) {
  const nombre = `${m.nombre} ${m.apellido}`;
  const fecha = formatFecha.format(recibido);
  const telefono = m.telefono ?? "No indicado";

  const cuerpo = `<p style="margin:0 0 24px;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${COLOR.gris};">
  <strong style="color:${COLOR.oscuro};">${escapeHtml(nombre)}</strong> escribió desde el formulario de contacto del sitio web.<br>
  <span style="font-size:14px;">Recibido el ${escapeHtml(fecha)}</span>
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLOR.linea};">
  ${filaCorreo("Correo", `<a href="mailto:${escapeHtml(m.email)}" style="color:${COLOR.primario};font-weight:600;text-decoration:none;">${escapeHtml(m.email)}</a>`)}
  ${filaCorreo("Teléfono", escapeHtml(telefono))}
  ${filaCorreo("Asunto", escapeHtml(m.asunto))}
</table>
<p style="margin:28px 0 10px;font-family:${FUENTE};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${COLOR.gris};">Mensaje</p>
<div style="padding:18px 20px;background:${COLOR.suave};border:1px solid ${COLOR.linea};border-radius:12px;font-family:${FUENTE};font-size:16px;line-height:1.65;color:${COLOR.oscuro};word-break:break-word;">${escapeHtml(m.mensaje).replace(/\r?\n/g, "<br>")}</div>
<div style="margin-top:28px;font-size:0;">
  ${botonCorreo(`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.asunto}`)}`, `Responder a ${m.nombre}`)}${botonCorreo(`${SITIO}/administracion/contacto`, "Ver en el panel", "secundario")}
</div>`;

  return {
    subject: `Nuevo mensaje de contacto: ${m.asunto}`,
    text: [
      `${nombre} escribió desde el formulario de contacto del sitio web.`,
      `Recibido el ${fecha}`,
      "",
      `Correo: ${m.email}`,
      `Teléfono: ${telefono}`,
      `Asunto: ${m.asunto}`,
      "",
      m.mensaje,
      "",
      "—",
      `Responde a este correo para contestarle directamente. También puedes verlo en ${SITIO}/administracion/contacto`,
    ].join("\n"),
    html: layoutCorreo({
      titulo: `Nuevo mensaje de ${m.nombre}`,
      preheader: `${m.asunto} · ${m.mensaje.slice(0, 90)}`,
      cuerpo,
      pie: `Te llega este aviso porque estás en la lista de
      <a href="${SITIO}/administracion/ajustes/correos" style="color:${COLOR.primario};font-weight:600;text-decoration:none;">Ajustes → Correos</a>
      del panel.<br>Si respondes este correo, la respuesta le llega directo a ${escapeHtml(m.nombre)}.`,
    }),
  };
}

/** Avisa a los usuarios de Ajustes → Correos que llegó un mensaje del formulario de contacto. */
export async function notificarMensajeContacto(m: MensajeContacto): Promise<void> {
  const clave = process.env.CORREOS_CONTACTO_CLAVE;
  if (!clave) throw new Error("Falta CORREOS_CONTACTO_CLAVE en las variables de entorno.");

  // el visitante no tiene sesión: la clave solo abre la lista de destinatarios
  const supabase = await createSupabaseServerClient();
  const { data: destinatarios, error } = await supabase.rpc("correos_contacto", { p_clave: clave });
  if (error) throw new Error(error.message);
  if (!destinatarios.length) return;

  await enviarCorreo({ to: destinatarios, replyTo: m.email, ...armarCorreoContacto(m) });
}
