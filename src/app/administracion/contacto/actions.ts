"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("contacto");

export async function marcarLeidoAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await assertPermission(PERMISSIONS.CONTACTO_UPDATE);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("contacto")
      .update({ leido: true })
      .eq("id", id);
    if (error) {
      logger.error("Contact message update failed", {
        ...errorInfo(error),
        mensajeId: id,
      });
      return { error: "No se pudo marcar el mensaje como leído." };
    }

    revalidatePath("/administracion/contacto");
    logger.info("Contact message marked read", { mensajeId: id });
    return {};
  } catch (e) {
    logger.warning("Contact message marking failed", {
      ...errorInfo(e),
      mensajeId: id,
    });
    return {
      error:
        e instanceof Error
          ? e.message
          : "No se pudo marcar el mensaje como leído.",
    };
  }
}
