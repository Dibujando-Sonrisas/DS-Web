"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------
export type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

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

export async function crearEspecialidad(nombre: string, tipoConsulta: string | null): Promise<ActionResponse> {
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

    if (error) throw new Error(error.message);

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad creada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear la especialidad." };
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

    if (error) throw new Error(error.message);

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad actualizada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar la especialidad." };
  }
}

export async function activarEspecialidad(id: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("especialidades").update({ activo: true }).eq("id", id);
    if (error) {
      if (error.message.includes("column \"activo\" of relation \"especialidades\" does not exist")) {
        const { error: fallback } = await supabase.from("especialidades").update({ activa: true } as any).eq("id", id);
        if (fallback) throw new Error(fallback.message);
      } else {
        throw new Error(error.message);
      }
    }

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad activada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al activar la especialidad." };
  }
}

export async function desactivarEspecialidad(id: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.VOLUNTARIADO_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("especialidades")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      if (error.message.includes("column \"activo\" of relation \"especialidades\" does not exist")) {
        const { error: fallback } = await supabase.from("especialidades").update({ activa: false } as any).eq("id", id);
        if (fallback) throw new Error(fallback.message);
      } else {
        throw new Error(error.message);
      }
    }

    revalidatePath("/administracion/voluntarios/especialidades");
    return { success: true, message: "Especialidad desactivada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al desactivar la especialidad." };
  }
}

// -----------------------------------------------------------------------------
// Obtención de Datos
// -----------------------------------------------------------------------------
export async function obtenerVoluntarios() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("*, rol:rol_id(id, nombre, color), especialidades:especialidad_id(id, nombre), asignaciones_voluntarios!asignaciones_voluntarios_perfil_id_fkey(id, brigada_id), participaciones_voluntarios!participaciones_voluntarios_perfil_id_fkey(id, brigada_id)")
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("Error fetching volunteers:", error);
    return [];
  }
  return data || [];
}

export async function obtenerVoluntario(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("*, rol:rol_id(id, nombre, color), especialidades:especialidad_id(id, nombre)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching volunteer:", error);
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
    const { error } = await supabase.from("participaciones_voluntarios").insert({
      brigada_id: data.brigada_id,
      perfil_id: data.perfil_id,
      hora_llegada: data.hora_llegada,
      hora_salida: data.hora_salida,
      observaciones: data.observaciones,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/administracion/voluntarios/${data.perfil_id}`);
    return { success: true, message: "Participación registrada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al registrar participación." };
  }
}

export async function actualizarParticipacion(id: string, data: {
  hora_llegada?: string | null;
  hora_salida?: string | null;
  asistencia?: boolean;
  observaciones?: string | null;
}, perfilId: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("participaciones_voluntarios")
      .update({
        hora_llegada: data.hora_llegada,
        hora_salida: data.hora_salida,
        observaciones: data.observaciones,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath(`/administracion/voluntarios/${perfilId}`);
    return { success: true, message: "Participación actualizada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar participación." };
  }
}

export async function actualizarAsignacion(id: string, area: string, perfilId: string): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("asignaciones_voluntarios")
      .update({ area_asignada: area as any })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath(`/administracion/voluntarios/${perfilId}`);
    return { success: true, message: "Asignación actualizada con éxito." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar asignación." };
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
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("inscripciones_voluntarios")
      .update({ estado })
      .eq("id", id)
      .is("brigada_id", null);

    if (error) throw new Error(error.message);

    revalidatePath("/administracion/voluntarios");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar la solicitud." };
  }
}
