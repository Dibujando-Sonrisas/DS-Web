"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";
import { enviarCorreo } from "@/lib/email/enviarCorreo";
import { enviarAviso } from "@/lib/email/avisos";
import { correoAvisoInscripcion, correoSolicitudRecibida } from "@/lib/email/voluntarios";

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => s || null);

// mismos límites que las columnas de inscripciones_voluntarios
const solicitudSchema = z.object({
  brigada_id: z.string().uuid().nullable(),
  nombre_completo: z.string().trim().min(3).max(150),
  correo: emailSchema.max(150).transform((s) => s.toLowerCase()),
  telefono: z.string().trim().min(7).max(20),
  area_interes: z.string().trim().min(1).max(100),
  lugar: opcional(150),
  profesion: opcional(100),
  comentarios: opcional(2000),
});

export type SolicitudVoluntarioInput = z.input<typeof solicitudSchema>;

/**
 * Formularios públicos de voluntariado: el general (/voluntariado, sin brigada)
 * y el modal de una brigada. Guarda la solicitud y le confirma por correo.
 */
export async function inscribirVoluntarioAction(
  datos: SolicitudVoluntarioInput
): Promise<{ error: string | null }> {
  const parsed = solicitudSchema.safeParse(datos);
  if (!parsed.success) {
    return { error: "Revisa los datos del formulario e intenta de nuevo." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("inscripciones_voluntarios")
    .insert({ ...parsed.data, estado: "pendiente" });
  // índices uq_inscripciones_correo / _telefono: una vez por brigada y una como general
  if (error?.code === "23505") {
    const dato = error.message.includes("telefono") ? "este teléfono" : "este correo";
    return {
      error: parsed.data.brigada_id
        ? `Ya hay una inscripción a esta brigada con ${dato}.`
        : `Ya recibimos una solicitud de voluntariado con ${dato}. Un coordinador la revisará pronto.`,
    };
  }
  if (error) {
    console.error("Error al guardar la solicitud de voluntariado:", error);
    return { error: "Hubo un error al enviar tu solicitud. Intenta de nuevo." };
  }

  // la solicitud ya quedó guardada: si un correo falla, no tiene que reintentar
  const { data: brigada } = parsed.data.brigada_id
    ? await supabase
        .from("brigadas")
        .select("nombre, fecha_brigada, lugar")
        .eq("id", parsed.data.brigada_id)
        .maybeSingle()
    : { data: null };
  const solicitud = { ...parsed.data, brigada };
  const envios = await Promise.allSettled([
    enviarCorreo({ to: [solicitud.correo], ...correoSolicitudRecibida(solicitud) }),
    enviarAviso("voluntario_inscripcion", {
      replyTo: solicitud.correo,
      ...correoAvisoInscripcion(solicitud),
    }),
  ]);
  for (const e of envios) {
    if (e.status === "rejected") console.error("No se pudo enviar un correo de la solicitud de voluntariado:", e.reason);
  }
  return { error: null };
}
