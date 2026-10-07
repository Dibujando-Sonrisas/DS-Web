"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";

type ActionResponse = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ajustes → Correos: el usuario empieza a recibir los mensajes de contacto. */
export async function agregarDestinatarioAction(perfilId: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.AJUSTES_UPDATE);
    if (!UUID.test(perfilId)) throw new Error("Usuario no válido.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("destinatarios_contacto").insert({ perfil_id: perfilId });
    if (error?.code === "23505") throw new Error("Ese usuario ya recibe los mensajes de contacto.");
    if (error?.code === "23503") throw new Error("Ese usuario ya no existe.");
    if (error) throw new Error(error.message);

    revalidatePath("/administracion/ajustes/correos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo agregar el usuario." };
  }
}

export async function quitarDestinatarioAction(perfilId: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.AJUSTES_UPDATE);
    if (!UUID.test(perfilId)) throw new Error("Usuario no válido.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("destinatarios_contacto").delete().eq("perfil_id", perfilId);
    if (error) throw new Error(error.message);

    revalidatePath("/administracion/ajustes/correos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar el usuario." };
  }
}
