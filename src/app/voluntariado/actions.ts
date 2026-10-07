"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";
import { enviarCorreo } from "@/lib/email/enviarCorreo";
import { correoSolicitudRecibida } from "@/lib/email/voluntarios";

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
  if (error) {
    console.error("Error al guardar la solicitud de voluntariado:", error);
    return { error: "Hubo un error al enviar tu solicitud. Intenta de nuevo." };
  }

  // la solicitud ya quedó guardada: si el correo falla, no tiene que reintentar
  try {
    const { data: brigada } = parsed.data.brigada_id
      ? await supabase
          .from("brigadas")
          .select("nombre, fecha_brigada, lugar")
          .eq("id", parsed.data.brigada_id)
          .maybeSingle()
      : { data: null };
    await enviarCorreo({
      to: [parsed.data.correo],
      ...correoSolicitudRecibida({ ...parsed.data, brigada }),
    });
  } catch (e) {
    console.error("No se pudo enviar la confirmación de la solicitud de voluntariado:", e);
  }
  return { error: null };
}
