"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { aceptarSolicitudVoluntario } from "@/lib/cuentas";
import { Constants } from "@/lib/database.types";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("voluntarios");

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------
export type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

/** Registra el error de la base y devuelve un mensaje para la interfaz sin el detalle técnico. */
function falloBD(
  evento: string,
  error: unknown,
  datos: Record<string, unknown>,
  mensaje: string
): ActionResponse {
  logger.error(evento, { ...errorInfo(error), ...datos });
  return { error: mensaje };
}

// -----------------------------------------------------------------------------
// Especialidades (CRUD administradores)
// -----------------------------------------------------------------------------

// tipo de consulta que atiende la especialidad en el expediente: ninguna, médica u odontológica
function validarTipoConsulta(tipo: string | null): string | null {
  if (tipo !== null && tipo !== "Medica" && tipo !== "Odontologica") {
    throw new Error("Tipo de consulta no válido.");
  }
  return tipo;
}

export async function crearEspecialidad(
  nombre: string,
  tipoConsulta: string | null
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const tipo_consulta = validarTipoConsulta(tipoConsulta);
    const supabase = await createSupabaseServerClient();

    const nombreTrim = nombre.trim();
    const codigo = nombreTrim.toUpperCase().replace(/\s+/g, "_");

    const { error } = await supabase.from("especialidades").insert({
      nombre: nombreTrim,
      codigo: codigo,
      tipo_consulta,
    });

    if (error)
      return falloBD(
        "Specialty creation failed",
        error,
        {},
        "No se pudo crear la especialidad."
      );
    logger.info("Specialty created", { tipoConsulta: tipo_consulta });

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad creada con éxito." };
  } catch (e) {
    logger.warning("Specialty creation rejected", errorInfo(e));
    return {
      error: e instanceof Error ? e.message : "Error al crear la especialidad.",
    };
  }
}

export async function editarEspecialidad(
  id: string,
  nombre: string,
  tipoConsulta: string | null
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const tipo_consulta = validarTipoConsulta(tipoConsulta);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("especialidades")
      .update({ nombre: nombre.trim(), tipo_consulta })
      .eq("id", id);

    if (error)
      return falloBD(
        "Specialty update failed",
        error,
        { especialidadId: id },
        "No se pudo actualizar la especialidad."
      );
    logger.info("Specialty updated", {
      especialidadId: id,
      tipoConsulta: tipo_consulta,
    });

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad actualizada con éxito." };
  } catch (e) {
    logger.warning("Specialty update rejected", {
      ...errorInfo(e),
      especialidadId: id,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al actualizar la especialidad.",
    };
  }
}

export async function activarEspecialidad(id: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("especialidades")
      .update({ activo: true })
      .eq("id", id);
    if (error)
      return falloBD(
        "Specialty activation failed",
        error,
        { especialidadId: id },
        "No se pudo activar la especialidad."
      );
    logger.info("Specialty activated", { especialidadId: id });

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad activada con éxito." };
  } catch (e) {
    logger.warning("Specialty activation rejected", {
      ...errorInfo(e),
      especialidadId: id,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al activar la especialidad.",
    };
  }
}

export async function desactivarEspecialidad(
  id: string
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("especialidades")
      .update({ activo: false })
      .eq("id", id);

    if (error)
      return falloBD(
        "Specialty deactivation failed",
        error,
        { especialidadId: id },
        "No se pudo desactivar la especialidad."
      );
    logger.info("Specialty deactivated", { especialidadId: id });

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad desactivada con éxito." };
  } catch (e) {
    logger.warning("Specialty deactivation rejected", {
      ...errorInfo(e),
      especialidadId: id,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al desactivar la especialidad.",
    };
  }
}

// -----------------------------------------------------------------------------
// Obtención de Datos
// -----------------------------------------------------------------------------
export async function obtenerVoluntarios() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select(
      "*, rol:rol_id(id, nombre, color), especialidades:especialidad_id(id, nombre), asignaciones_voluntarios!asignaciones_voluntarios_perfil_id_fkey(id, brigada_id), participaciones_voluntarios!participaciones_voluntarios_perfil_id_fkey(id, brigada_id)"
    )
    .order("nombre_completo", { ascending: true });

  if (error) {
    logger.error("Volunteer list load failed", errorInfo(error));
    return [];
  }
  return data || [];
}

export async function obtenerVoluntario(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select(
      "*, rol:rol_id(id, nombre, color), especialidades:especialidad_id(id, nombre)"
    )
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Volunteer load failed", {
      ...errorInfo(error),
      perfilId: id,
    });
    return null;
  }
  return data;
}

// -----------------------------------------------------------------------------
// Participaciones y Asignaciones
// -----------------------------------------------------------------------------
export async function registrarParticipacion(data: {
  brigada_id: string;
  perfil_id: string;
  hora_llegada?: string | null;
  hora_salida?: string | null;
  asistencia?: boolean;
  observaciones?: string | null;
}): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await createSupabaseServerClient();

    // Temporal fallback until RPC is created
    const { error } = await supabase
      .from("participaciones_voluntarios")
      .insert({
        brigada_id: data.brigada_id,
        perfil_id: data.perfil_id,
        hora_llegada: data.hora_llegada,
        hora_salida: data.hora_salida,
        asistio: data.asistencia,
        observaciones: data.observaciones,
      });

    if (error)
      return falloBD(
        "Participation registration failed",
        error,
        { brigadaId: data.brigada_id, perfilId: data.perfil_id },
        "No se pudo registrar la participación."
      );
    logger.info("Participation registered", {
      brigadaId: data.brigada_id,
      perfilId: data.perfil_id,
    });

    revalidatePath(`/administracion/voluntarios/${data.perfil_id}`);
    return { success: true, message: "Participación registrada con éxito." };
  } catch (e) {
    logger.warning("Participation registration rejected", {
      ...errorInfo(e),
      brigadaId: data.brigada_id,
      perfilId: data.perfil_id,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al registrar participación.",
    };
  }
}

export async function actualizarParticipacion(
  id: string,
  data: {
    hora_llegada?: string | null;
    hora_salida?: string | null;
    asistencia?: boolean;
    observaciones?: string | null;
  },
  perfilId: string
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("participaciones_voluntarios")
      .update({
        hora_llegada: data.hora_llegada,
        hora_salida: data.hora_salida,
        asistio: data.asistencia,
        observaciones: data.observaciones,
      })
      .eq("id", id);

    if (error)
      return falloBD(
        "Participation update failed",
        error,
        { participacionId: id, perfilId },
        "No se pudo actualizar la participación."
      );
    logger.info("Participation updated", { participacionId: id, perfilId });

    revalidatePath(`/administracion/voluntarios/${perfilId}`);
    return { success: true, message: "Participación actualizada con éxito." };
  } catch (e) {
    logger.warning("Participation update rejected", {
      ...errorInfo(e),
      participacionId: id,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al actualizar participación.",
    };
  }
}

export async function actualizarAsignacion(
  id: string,
  area: string,
  perfilId: string
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const areaAsignada = Constants.public.Enums.area_voluntariado.find(
      (value) => value === area
    );
    if (!areaAsignada) {
      logger.warning("Assignment update rejected", {
        reason: "invalid area",
        asignacionId: id,
      });
      return { error: "Selecciona un área válida." };
    }
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("asignaciones_voluntarios")
      .update({ area_asignada: areaAsignada })
      .eq("id", id);

    if (error)
      return falloBD(
        "Assignment update failed",
        error,
        { asignacionId: id, area },
        "No se pudo actualizar la asignación."
      );
    logger.info("Assignment updated", { asignacionId: id, perfilId, area });

    revalidatePath(`/administracion/voluntarios/${perfilId}`);
    return { success: true, message: "Asignación actualizada con éxito." };
  } catch (e) {
    logger.warning("Assignment update rejected", {
      ...errorInfo(e),
      asignacionId: id,
    });
    return {
      error: e instanceof Error ? e.message : "Error al actualizar asignación.",
    };
  }
}

// -----------------------------------------------------------------------------
// Solicitudes generales (formulario de /voluntariado, sin brigada)
// -----------------------------------------------------------------------------
export async function cambiarEstadoSolicitudGeneral(
  id: string,
  estado: "aceptado" | "rechazado"
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);

    if (estado === "aceptado") {
      // crea la cuenta del voluntario y le envía su acceso
      await aceptarSolicitudVoluntario(id, { soloGeneral: true });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("inscripciones_voluntarios")
        .update({ estado })
        .eq("id", id)
        .is("brigada_id", null);
      if (error)
        return falloBD(
          "Volunteer request update failed",
          error,
          { inscripcionId: id, estado },
          "No se pudo actualizar la solicitud."
        );
      // la aceptación ya queda registrada en aceptarSolicitudVoluntario
      logger.info("Volunteer request declined", { inscripcionId: id });
    }

    revalidatePath("/administracion/voluntarios");
    return { success: true };
  } catch (e) {
    logger.error("Volunteer request update failed", {
      ...errorInfo(e),
      inscripcionId: id,
      estado,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al actualizar la solicitud.",
    };
  }
}
