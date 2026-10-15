"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { esAvisoCorreo } from "@/lib/avisosCorreo";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("ajustes");

type ActionResponse = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function validar(aviso: string, perfilId: string) {
  await assertPermission(PERMISSIONS.AJUSTES_UPDATE);
  if (!esAvisoCorreo(aviso)) throw new Error("Aviso no válido.");
  if (!UUID.test(perfilId)) throw new Error("Usuario no válido.");
}

/** Ajustes → Correos: el usuario empieza a recibir ese aviso. */
export async function agregarDestinatarioAction(
  aviso: string,
  perfilId: string
): Promise<ActionResponse> {
  try {
    await validar(aviso, perfilId);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("destinatarios_correo")
      .insert({ aviso, perfil_id: perfilId });
    if (error?.code === "23505")
      throw new Error("Ese usuario ya recibe este aviso.");
    if (error?.code === "23503") throw new Error("Ese usuario ya no existe.");
    if (error) {
      logger.error("Email recipient insert failed", {
        ...errorInfo(error),
        aviso,
      });
      return { error: "No se pudo agregar el usuario." };
    }

    revalidatePath("/administracion/ajustes/correos");
    logger.info("Email recipient added", { aviso, perfilId });
    return {};
  } catch (e) {
    // aviso puede venir sin validar: no se registra
    logger.warning("Email recipient addition failed", errorInfo(e));
    return {
      error: e instanceof Error ? e.message : "No se pudo agregar el usuario.",
    };
  }
}

export async function quitarDestinatarioAction(
  aviso: string,
  perfilId: string
): Promise<ActionResponse> {
  try {
    await validar(aviso, perfilId);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("destinatarios_correo")
      .delete()
      .eq("aviso", aviso)
      .eq("perfil_id", perfilId);
    if (error) {
      logger.error("Email recipient delete failed", {
        ...errorInfo(error),
        aviso,
      });
      return { error: "No se pudo quitar el usuario." };
    }

    revalidatePath("/administracion/ajustes/correos");
    logger.info("Email recipient removed", { aviso, perfilId });
    return {};
  } catch (e) {
    // aviso puede venir sin validar: no se registra
    logger.warning("Email recipient removal failed", errorInfo(e));
    return {
      error: e instanceof Error ? e.message : "No se pudo quitar el usuario.",
    };
  }
}
