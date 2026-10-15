import "server-only";

import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("notificaciones");

export type EnviarNotificacionParams = {
  tipo: string;
  titulo: string;
  detalle?: string | null;
  enlace?: string | null;
  permiso?: Permission | string;
  actorId?: string | null;
  paraTodos?: boolean;
};

export type ResultadoNotificacion = {
  success: boolean;
  error?: string;
};

export async function enviarNotificacion({
  tipo,
  titulo,
  detalle = null,
  enlace = null,
  permiso = PERMISSIONS.PERFIL_READ,
  actorId = null,
  paraTodos = false,
}: EnviarNotificacionParams): Promise<ResultadoNotificacion> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("notificar", {
      p_tipo: tipo,
      p_titulo: titulo,
      p_detalle: detalle,
      p_enlace: enlace,
      p_permiso: permiso,
      p_actor_id: actorId,
      p_para_todos: paraTodos,
    });

    if (error) {
      logger.warning("Notification emit failed", { ...errorInfo(error), tipo });
      return { success: false, error: "No se pudo emitir la notificación." };
    }

    logger.info("Notification emitted", { tipo, permiso });
    return { success: true };
  } catch (err: unknown) {
    logger.warning("Notification emit failed", { ...errorInfo(err), tipo });
    return { success: false, error: "No se pudo emitir la notificación." };
  }
}
