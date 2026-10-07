/**
 * AVISOS POR CORREO PARA EL EQUIPO
 * Cada aviso tiene su lista de destinatarios en Ajustes → Correos (tabla
 * destinatarios_correo). Para uno nuevo: agrégalo aquí, ponle ícono en
 * CorreosPanel y envíalo con enviarAviso() (lib/email/avisos.ts).
 */
export const AVISOS_CORREO = [
  {
    id: "contacto",
    titulo: "Mensajes de contacto",
    cuando: "Alguien escribe desde el formulario de contacto del sitio web.",
  },
  {
    id: "voluntario_inscripcion",
    titulo: "Inscripciones de voluntarios",
    cuando: "Alguien se inscribe como voluntario, a una brigada o de forma general.",
  },
  {
    id: "usuario_nuevo",
    titulo: "Usuarios nuevos",
    cuando: "Se crea una cuenta: registro desde el sitio o voluntario aceptado. Para revisar su rol.",
  },
] as const;

export type AvisoCorreo = (typeof AVISOS_CORREO)[number]["id"];

export const esAvisoCorreo = (id: string): id is AvisoCorreo => AVISOS_CORREO.some((a) => a.id === id);
