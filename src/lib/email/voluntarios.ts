import "server-only";
import { COLOR, FUENTE, SITIO, botonCorreo, escapeHtml, filaCorreo, layoutCorreo } from "./layout";
import { pieAviso } from "./avisos";

/** Lo que el voluntario llenó en el formulario (con la brigada, si eligió una). */
export type SolicitudVoluntario = {
  nombre_completo: string;
  correo: string;
  telefono: string | null;
  area_interes: string | null;
  brigada: { nombre: string; fecha_brigada: string; lugar: string } | null;
};

// fecha_brigada es una fecha sin hora: en UTC para que no se corra un día
const formatFecha = new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeZone: "UTC" });

const parrafo = (html: string, extra = "") =>
  `<p style="margin:0 0 20px;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${COLOR.gris};${extra}">${html}</p>`;

const nota = (html: string) => parrafo(html, "font-size:14px;margin:20px 0 0;");

function datos(s: SolicitudVoluntario, conCorreo: boolean, extra: [string, string | null][] = []) {
  const filas: [string, string | null][] = [
    ["Nombre", s.nombre_completo],
    ["Correo", conCorreo ? s.correo : null],
    ["Teléfono", s.telefono],
    ["Área", s.area_interes],
    [
      "Brigada",
      s.brigada &&
        `${s.brigada.nombre} · ${formatFecha.format(new Date(s.brigada.fecha_brigada))} · ${s.brigada.lugar}`,
    ],
    ...extra,
  ];
  const presentes = filas.filter((f): f is [string, string] => Boolean(f[1]));
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-top:1px solid ${COLOR.linea};">
  ${presentes.map(([etiqueta, valor]) => filaCorreo(etiqueta, escapeHtml(valor))).join("")}
</table>`,
    text: presentes.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
  };
}

const primerNombre = (s: SolicitudVoluntario) => s.nombre_completo.split(" ")[0];
const destino = (s: SolicitudVoluntario) =>
  s.brigada ? `a la brigada ${s.brigada.nombre}` : "como voluntario de Dibujando Sonrisas";

/** Confirmación al voluntario apenas envía el formulario. */
export function correoSolicitudRecibida(s: SolicitudVoluntario) {
  const tabla = datos(s, false);
  const intro = `Recibimos tu solicitud para unirte ${destino(s)}.`;
  const siguiente =
    "Un coordinador la revisará pronto. Cuando sea aprobada te enviaremos otro correo con las instrucciones para entrar a tu cuenta de voluntario.";

  return {
    subject: s.brigada
      ? `Recibimos tu inscripción a la brigada ${s.brigada.nombre}`
      : "Recibimos tu solicitud de voluntariado",
    text: [`Hola, ${primerNombre(s)}:`, "", intro, siguiente, "", ...tabla.text].join("\n"),
    html: layoutCorreo({
      titulo: `¡Gracias, ${primerNombre(s)}!`,
      preheader: siguiente,
      cuerpo: parrafo(escapeHtml(intro)) + parrafo(escapeHtml(siguiente)) + tabla.html,
      pie: "Te llega este correo porque te inscribiste como voluntario en nuestro sitio web.<br>Si no fuiste tú, puedes ignorarlo.",
    }),
  };
}

/**
 * Aviso de solicitud aceptada con su acceso: el enlace para crear la contraseña
 * o, si ya tenía cuenta, el de iniciar sesión.
 */
export function correoSolicitudAceptada(
  s: SolicitudVoluntario,
  { enlace, conCuenta, sitio }: { enlace: string; conCuenta: boolean; sitio: string }
) {
  const tabla = datos(s, true);
  const intro = `Tu solicitud para unirte ${destino(s)} fue aceptada.`;
  const cuenta = conCuenta
    ? "Ya tenías una cuenta con este correo: entra con tu contraseña de siempre."
    : "Creamos tu cuenta de voluntario con estos datos. Para entrar, crea tu contraseña:";
  const boton = conCuenta ? "Iniciar sesión" : "Crear mi contraseña";
  const recuperar = `${sitio}/auth/recuperar-contrasena`;

  return {
    subject: "Tu solicitud de voluntariado fue aceptada",
    text: [
      `Hola, ${primerNombre(s)}:`,
      "",
      intro,
      cuenta,
      "",
      ...tabla.text,
      "",
      `${boton}: ${enlace}`,
      ...(conCuenta ? [] : ["", `El enlace es personal y vence pronto. Si ya no funciona, pide uno nuevo en ${recuperar}`]),
    ].join("\n"),
    html: layoutCorreo({
      titulo: `¡Te damos la bienvenida, ${primerNombre(s)}!`,
      preheader: intro,
      cuerpo:
        parrafo(escapeHtml(intro)) +
        parrafo(escapeHtml(cuenta)) +
        tabla.html +
        `<div style="font-size:0;">${botonCorreo(enlace, boton)}</div>` +
        (conCuenta
          ? ""
          : nota(
              `El enlace es personal y vence pronto. Si ya no funciona, pide uno nuevo en <a href="${escapeHtml(recuperar)}" style="color:${COLOR.primario};font-weight:600;text-decoration:none;">Recuperar contraseña</a>.`
            )),
      pie: "Te llega este correo porque te inscribiste como voluntario en nuestro sitio web.",
    }),
  };
}

/** Aviso "voluntario_inscripcion" al equipo (Ajustes → Correos). */
export function correoAvisoInscripcion(
  s: SolicitudVoluntario & {
    brigada_id: string | null;
    lugar: string | null;
    profesion: string | null;
    comentarios: string | null;
  }
) {
  const tabla = datos(s, true, [
    ["Vive en", s.lugar],
    ["Profesión", s.profesion],
    ["Comentarios", s.comentarios],
  ]);
  const titulo = s.brigada ? `Nueva inscripción a la brigada ${s.brigada.nombre}` : "Nueva solicitud de voluntariado";
  const intro = s.brigada
    ? `${s.nombre_completo} se inscribió como voluntario a la brigada ${s.brigada.nombre}.`
    : `${s.nombre_completo} quiere ser voluntario. Es una solicitud general, sin brigada.`;
  const panel = s.brigada_id
    ? `${SITIO}/administracion/brigadas?brigada=${s.brigada_id}`
    : `${SITIO}/administracion/voluntarios`;

  return {
    subject: `${titulo}: ${s.nombre_completo}`,
    text: [intro, "", ...tabla.text, "", `Revisar la solicitud: ${panel}`].join("\n"),
    html: layoutCorreo({
      titulo,
      preheader: intro,
      cuerpo:
        parrafo(escapeHtml(intro)) +
        tabla.html +
        `<div style="font-size:0;">${botonCorreo(panel, "Revisar la solicitud")}${botonCorreo(`mailto:${s.correo}`, `Escribir a ${primerNombre(s)}`, "secundario")}</div>`,
      pie: pieAviso("voluntario_inscripcion"),
    }),
  };
}

/** Enlace para crear una contraseña nueva, pedido desde /auth/recuperar-contrasena. */
export function correoRestablecerContrasena(correo: string, enlace: string) {
  const intro = `Recibimos una solicitud para crear o cambiar la contraseña de tu cuenta (${correo}).`;
  const aviso = "Si no lo pediste, ignora este correo: tu contraseña no cambia. El enlace vence pronto.";

  return {
    subject: "Crea tu nueva contraseña",
    text: [intro, "", `Crear nueva contraseña: ${enlace}`, "", aviso].join("\n"),
    html: layoutCorreo({
      titulo: "Crea tu nueva contraseña",
      preheader: intro,
      cuerpo:
        parrafo(escapeHtml(intro)) +
        `<div style="font-size:0;">${botonCorreo(enlace, "Crear nueva contraseña")}</div>` +
        nota(escapeHtml(aviso)),
      pie: "Te llega este correo porque alguien pidió restablecer la contraseña de tu cuenta.",
    }),
  };
}
