"use server";

import { z } from "zod";
import {
  sendNewVolunteerRequest,
  sendReceivedVolunteerRequest,
} from "@/lib/email/emails";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";

const logger = getLogger("voluntariado");

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
    const dato = error.message.includes("telefono")
      ? "este teléfono"
      : "este correo";
    return {
      error: parsed.data.brigada_id
        ? `Ya hay una inscripción a esta brigada con ${dato}.`
        : `Ya recibimos una solicitud de voluntariado con ${dato}. Un coordinador la revisará pronto.`,
    };
  }
  if (error) {
    logger.error("Volunteer request save failed", errorInfo(error));
    return { error: "Hubo un error al enviar tu solicitud. Intenta de nuevo." };
  }

  logger.info("Volunteer request received", {
    brigadaId: parsed.data.brigada_id,
  });

  // la solicitud ya quedó guardada: si un correo falla, no tiene que reintentar
  const { data: brigade } = parsed.data.brigada_id
    ? await supabase
        .from("brigadas")
        .select("name:nombre, date:fecha_brigada, location:lugar")
        .eq("id", parsed.data.brigada_id)
        .maybeSingle()
    : { data: null };
  const request = {
    fullName: parsed.data.nombre_completo,
    email: parsed.data.correo,
    phone: parsed.data.telefono,
    areaOfInterest: parsed.data.area_interes,
    brigade,
  };
  const envios = await Promise.allSettled([
    sendReceivedVolunteerRequest(request),
    sendNewVolunteerRequest({
      ...request,
      brigadeId: parsed.data.brigada_id,
      residence: parsed.data.lugar,
      profession: parsed.data.profesion,
      comments: parsed.data.comentarios,
    }),
  ]);
  for (const [i, e] of envios.entries()) {
    if (e.status === "rejected")
      logger.warning("Volunteer request email failed", {
        ...errorInfo(e.reason),
        correo: i === 0 ? "confirmacion" : "aviso",
      });
  }
  return { error: null };
}
