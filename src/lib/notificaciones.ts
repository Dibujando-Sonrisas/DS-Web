import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export type EnviarNotificacionParams = {
  /**
   * Identificador del tipo de evento (ej: 'paciente_nuevo', 'donacion_recibida', 'stock_alerta').
   * Solo letras minúsculas, números y guiones bajos (se normaliza automáticamente).
   */
  tipo: string;
  /**
   * Título conciso del evento (máx. 200 caracteres).
   */
  titulo: string;
  /**
   * Detalle secundario o descripción breve opcional (máx. 300 caracteres).
   */
  detalle?: string | null;
  /**
   * Enlace relativo al panel administrativo (ej: '/administracion/pacientes?id=123').
   * Si no comienza con '/administracion', se normaliza automáticamente.
   */
  enlace?: string | null;
  /**
   * Permiso que debe tener el usuario para ver la notificación.
   * Si no se especifica, usa PERMISSIONS.PERFIL_READ ('perfil.read'), que permite
   * que cualquier usuario con acceso activo al panel administrativo la visualice.
   */
  permiso?: Permission | string;
  /**
   * ID del usuario que causó el evento (quien originó la acción no verá su propia campana).
   * Por defecto toma la sesión autenticada actual en Supabase.
   */
  actorId?: string | null;
  /**
   * Si es true, el evento se emite para TODOS los usuarios con el permiso,
   * incluyendo a quien realizó la acción (útil para confirmaciones del sistema o anuncios globales).
   */
  paraTodos?: boolean;
};

export type ResultadoNotificacion = {
  success: boolean;
  error?: string;
};

/**
 * Emite una notificación persistente al panel administrativo de forma completamente agnóstica.
 *
 * Puede ser invocada desde cualquier Server Action, Route Handler, o servicio de backend:
 * ```ts
 * await enviarNotificacion({
 *   tipo: "paciente_nuevo",
 *   titulo: "Nuevo paciente registrado",
 *   detalle: "Juan Pérez en Brigada Santa Bárbara",
 *   enlace: `/administracion/pacientes?id=${pacienteId}`,
 *   permiso: PERMISSIONS.PACIENTES_READ,
 * });
 * ```
 *
 * Maneja los errores de manera segura para garantizar que un fallo en la emisión
 * de la notificación no interrumpa la transacción o flujo de negocio principal.
 */
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
      console.error("[notificaciones] Error al emitir notificación:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    console.error("[notificaciones] Excepción inesperada al emitir notificación:", err);
    return { success: false, error: mensaje };
  }
}
