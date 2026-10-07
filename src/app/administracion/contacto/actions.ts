"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function marcarLeidoAction(id: string): Promise<{ error?: string }> {
  try {
    await assertPermission(PERMISSIONS.CONTACTO_UPDATE);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("contacto").update({ leido: true }).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/administracion/contacto");
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo marcar el mensaje como leído.",
    };
  }
}
