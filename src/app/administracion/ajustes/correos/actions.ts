"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { esAvisoCorreo } from "@/lib/avisosCorreo";

type ActionResponse = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function validar(aviso: string, perfilId: string) {
  await assertPermission(PERMISSIONS.AJUSTES_UPDATE);
  if (!esAvisoCorreo(aviso)) throw new Error("Aviso no válido.");
  if (!UUID.test(perfilId)) throw new Error("Usuario no válido.");
}

/** Ajustes → Correos: el usuario empieza a recibir ese aviso. */
export async function agregarDestinatarioAction(aviso: string, perfilId: string): Promise<ActionResponse> {
  try {
    await validar(aviso, perfilId);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("destinatarios_correo").insert({ aviso, perfil_id: perfilId });
    if (error?.code === "23505") throw new Error("Ese usuario ya recibe este aviso.");
    if (error?.code === "23503") throw new Error("Ese usuario ya no existe.");
    if (error) throw new Error(error.message);

    revalidatePath("/administracion/ajustes/correos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo agregar el usuario." };
  }
}

export async function quitarDestinatarioAction(aviso: string, perfilId: string): Promise<ActionResponse> {
  try {
    await validar(aviso, perfilId);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("destinatarios_correo")
      .delete()
      .eq("aviso", aviso)
      .eq("perfil_id", perfilId);
    if (error) throw new Error(error.message);

    revalidatePath("/administracion/ajustes/correos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar el usuario." };
  }
}
