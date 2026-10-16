"use server";

import { z } from "zod";
import { sendNewContact } from "@/lib/email/emails";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";

const logger = getLogger("contacto");

// una sola línea: el asunto también va en el asunto del correo
const linea = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((s) => s.replace(/\s+/g, " "));

const contactoSchema = z.object({
  nombre: linea(80),
  apellido: linea(80),
  email: emailSchema.max(254),
  telefono: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((s) => s || null),
  asunto: linea(150),
  mensaje: z.string().trim().min(1).max(5000),
});

/** Formulario público de contacto: guarda el mensaje y avisa por correo a los de Ajustes. */
export async function enviarContactoAction(
  formData: FormData
): Promise<{ error: string | null }> {
  const parsed = contactoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Revisa los datos del formulario e intenta de nuevo." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contacto").insert(parsed.data);
  if (error) {
    logger.error("Contact message save failed", errorInfo(error));
    return {
      error: "Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.",
    };
  }

  logger.info("Contact message received");

  // el mensaje ya quedó guardado: si el aviso falla, el visitante no tiene que reintentar
  try {
    const { nombre, apellido, email, telefono, asunto, mensaje } = parsed.data;
    await sendNewContact({
      firstName: nombre,
      lastName: apellido,
      email,
      phone: telefono,
      subject: asunto,
      message: mensaje,
    });
  } catch (e) {
    logger.warning("Contact notice failed", errorInfo(e));
  }
  return { error: null };
}
