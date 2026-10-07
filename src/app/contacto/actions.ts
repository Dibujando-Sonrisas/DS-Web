"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";
import { notificarMensajeContacto } from "@/lib/email/contacto";

// una sola línea: el asunto también va en el asunto del correo
const linea = (max: number) =>
  z.string().trim().min(1).max(max).transform((s) => s.replace(/\s+/g, " "));

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
export async function enviarContactoAction(formData: FormData): Promise<{ error: string | null }> {
  const parsed = contactoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Revisa los datos del formulario e intenta de nuevo." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contacto").insert(parsed.data);
  if (error) {
    console.error("Error al guardar el mensaje de contacto:", error);
    return { error: "Hubo un error al enviar tu mensaje. Por favor intenta de nuevo." };
  }

  // el mensaje ya quedó guardado: si el aviso falla, el visitante no tiene que reintentar
  try {
    await notificarMensajeContacto(parsed.data);
  } catch (e) {
    console.error("No se pudo enviar el aviso del mensaje de contacto:", e);
  }
  return { error: null };
}
