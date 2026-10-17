import type { SupabaseClient } from "@supabase/supabase-js";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import type { Database } from "../database.types";
import { supabase } from "../supabase";

const logger = getLogger("db", "pacientes");

export type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];
export type InsertPaciente =
  Database["public"]["Tables"]["pacientes"]["Insert"];
export type UpdatePaciente =
  Database["public"]["Tables"]["pacientes"]["Update"];

export type SignosVitales =
  Database["public"]["Tables"]["signos_vitales"]["Row"];
export type InsertSignosVitales =
  Database["public"]["Tables"]["signos_vitales"]["Insert"];

export type Consulta = Database["public"]["Tables"]["consultas"]["Row"];
export type InsertConsulta =
  Database["public"]["Tables"]["consultas"]["Insert"];

export type Diagnostico =
  Database["public"]["Tables"]["diagnosticos_consulta"]["Row"];
export type InsertDiagnostico =
  Database["public"]["Tables"]["diagnosticos_consulta"]["Insert"];

export type MedicamentoConsulta =
  Database["public"]["Tables"]["medicamentos_consulta"]["Row"];
export type InsertMedicamentoConsulta =
  Database["public"]["Tables"]["medicamentos_consulta"]["Insert"];

export async function getPacientesDashboard(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("dashboard_pacientes")
    .select("*")
    .single();

  if (error) {
    logger.error("Patients dashboard load failed", errorInfo(error));
    return null;
  }
  return data;
}

export async function getPacientesAtendidos(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("v_pacientes_atendidos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Patients load failed", errorInfo(error));
    return [];
  }
  return data;
}

export async function getPacienteDetalle(
  id: string,
  client: SupabaseClient<Database> = supabase
) {
  const { data: paciente, error: errorPaciente } = await client
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single();

  if (errorPaciente) throw errorPaciente;

  const { data: signos } = await client
    .from("signos_vitales")
    .select("*")
    .eq("paciente_id", id)
    .single();

  const { data: consultas } = await client
    .from("consultas")
    .select(`
      *,
      medico:medico_id (nombre_completo),
      diagnosticos_consulta (*),
      medicamentos_consulta (*, medicamentos (nombre))
    `)
    .eq("paciente_id", id)
    .order("created_at", { ascending: false });

  return { paciente, signos, consultas: consultas || [] };
}

/** Médicos y odontólogos activos: los define el tipo_consulta de la especialidad del perfil. */
export async function getProfesionalesConsulta(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("perfiles")
    .select(
      "id, nombre_completo, especialidades:especialidad_id!inner(tipo_consulta)"
    )
    .eq("activo", true)
    .in("especialidades.tipo_consulta", ["Medica", "Odontologica"])
    .order("nombre_completo");

  if (error) logger.error("Professionals load failed", errorInfo(error));
  const porTipo = (tipo: string) =>
    (data ?? [])
      .filter((p) => p.especialidades.tipo_consulta === tipo)
      .map(({ id, nombre_completo }) => ({ id, nombre_completo }));

  return { medicos: porTipo("Medica"), odontologos: porTipo("Odontologica") };
}

export type PacienteDetalle = Awaited<ReturnType<typeof getPacienteDetalle>>;
export type Profesional = Awaited<
  ReturnType<typeof getProfesionalesConsulta>
>["medicos"][number];

/** Etapa 1 (ingresado): crea el paciente con su código correlativo por brigada. */
export async function registrarPaciente(
  paciente: InsertPaciente,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_CREATE);
  if (paciente.brigada_id) {
    const { data: brigada } = await client
      .from("brigadas")
      .select("codigo")
      .eq("id", paciente.brigada_id)
      .single();

    const parsedNum = brigada?.codigo?.replace(/\D/g, "") || "1";
    const numInt = parseInt(parsedNum, 10) || 1;

    const { count } = await client
      .from("pacientes")
      .select("*", { count: "exact", head: true })
      .eq("brigada_id", paciente.brigada_id);

    const correlativo = (count || 0) + 1;
    paciente.codigo = `PAC-B${numInt}${String(correlativo).padStart(3, "0")}`;
  }

  const { data: newPaciente, error: errPac } = await client
    .from("pacientes")
    .insert(paciente)
    .select()
    .single();

  if (errPac) {
    logger.error("Patient registration failed", {
      ...errorInfo(errPac),
      brigadaId: paciente.brigada_id,
    });
    throw new Error("No se pudo registrar el paciente.");
  }

  logger.info("Patient registered", {
    pacienteId: newPaciente.id,
    brigadaId: newPaciente.brigada_id,
  });
  return newPaciente;
}

/** Etapa 2 (preclínica): guarda los signos vitales; la fila marca la etapa aunque vaya vacía. */
export async function registrarPreclinica(
  pacienteId: string,
  signos: Partial<InsertSignosVitales>,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  // ponytail: chequeo en la app, dos envíos simultáneos podrían duplicar; índice único si pasa
  const { count } = await client
    .from("signos_vitales")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId);
  if (count)
    throw new Error("La preclínica de este paciente ya fue registrada.");

  const { error: errSig } = await client
    .from("signos_vitales")
    .insert({ ...signos, paciente_id: pacienteId } as InsertSignosVitales);

  if (errSig) {
    logger.error("Pre-clinic registration failed", {
      ...errorInfo(errSig),
      pacienteId,
    });
    throw new Error("No se pudo registrar la preclínica.");
  }
  logger.info("Pre-clinic registered", { pacienteId });
}

async function currentUserId(client: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("An authenticated user is required.");
  return user.id;
}

/**
 * Etapa 3 (consulta): quien abre la consulta toma al paciente para que nadie más lo atienda.
 * Devuelve el nombre de quien ya lo tiene, o null si quedó tomado por el usuario actual.
 */
export async function tomarConsulta(
  pacienteId: string,
  client: SupabaseClient<Database> = supabase
): Promise<string | null> {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const userId = await currentUserId(client);

  // una sola sentencia: si dos lo abren a la vez, solo uno lo toma
  const { data, error } = await client
    .from("pacientes")
    .update({ consulta_tomada_por: userId })
    .eq("id", pacienteId)
    .or(`consulta_tomada_por.is.null,consulta_tomada_por.eq.${userId}`)
    .select("id");

  if (error) {
    logger.error("Consultation claim failed", {
      ...errorInfo(error),
      pacienteId,
    });
    throw new Error("No se pudo tomar la consulta.");
  }
  if (data.length > 0) {
    logger.info("Consultation claimed", { pacienteId });
    return null;
  }

  const { data: paciente } = await client
    .from("pacientes")
    .select("perfiles:consulta_tomada_por(nombre_completo)")
    .eq("id", pacienteId)
    .single();
  return paciente?.perfiles?.nombre_completo || "otro usuario";
}

/** Devuelve al paciente a la espera de consulta; solo quien lo tomó puede liberarlo. */
export async function liberarConsulta(
  pacienteId: string,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const userId = await currentUserId(client);
  const { error } = await client
    .from("pacientes")
    .update({ consulta_tomada_por: null })
    .eq("id", pacienteId)
    .eq("consulta_tomada_por", userId);

  if (error) {
    logger.error("Consultation release failed", {
      ...errorInfo(error),
      pacienteId,
    });
    throw new Error("No se pudo liberar la consulta.");
  }
  logger.info("Consultation released", { pacienteId });
}

/** Etapa 4 (finalizada): guarda la consulta con sus diagnósticos y la receta. */
export async function registrarConsulta(
  pacienteId: string,
  consulta: Partial<InsertConsulta>,
  diagnosticos: string[],
  medicamentos: Partial<InsertMedicamentoConsulta>[],
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const userId = await currentUserId(client);
  const { data: paciente, error: errPac } = await client
    .from("pacientes")
    .select("brigada_id, consulta_tomada_por, consultas(id)")
    .eq("id", pacienteId)
    .single();

  if (errPac) {
    logger.error("Patient load failed", { ...errorInfo(errPac), pacienteId });
    throw new Error("No se pudo cargar el paciente.");
  }
  if (paciente.consultas.length > 0)
    throw new Error("La consulta de este paciente ya fue registrada.");
  if (paciente.consulta_tomada_por !== userId)
    throw new Error("La consulta de este paciente la tiene otro usuario.");

  const { data: newConsulta, error: errCons } = await client
    .from("consultas")
    .insert({
      ...consulta,
      brigada_id: paciente.brigada_id,
      paciente_id: pacienteId,
    } as InsertConsulta)
    .select()
    .single();

  if (errCons) {
    logger.error("Consultation registration failed", {
      ...errorInfo(errCons),
      pacienteId,
    });
    throw new Error("No se pudo registrar la consulta.");
  }

  const consultaId = newConsulta.id;

  if (diagnosticos.length > 0) {
    const diagInserts = diagnosticos.map((d) => ({
      consulta_id: consultaId,
      diagnostico: d,
    }));
    const { error: errDiag } = await client
      .from("diagnosticos_consulta")
      .insert(diagInserts);
    if (errDiag)
      logger.error("Diagnoses insert failed", {
        ...errorInfo(errDiag),
        consultaId,
      });
  }

  if (medicamentos.length > 0) {
    const medInserts = medicamentos.map((m) => ({
      ...m,
      consulta_id: consultaId,
    })) as InsertMedicamentoConsulta[];
    const { error: errMed } = await client
      .from("medicamentos_consulta")
      .insert(medInserts);
    if (errMed)
      logger.error("Prescription insert failed", {
        ...errorInfo(errMed),
        consultaId,
      });
  }

  logger.info("Consultation registered", {
    pacienteId,
    consultaId,
    diagnosticos: diagnosticos.length,
    medicamentos: medicamentos.length,
  });
}

// Correcciones desde la vista del expediente. Los datos llegan ya validados y limpios.

/** Falla si la actualización no tocó ninguna fila (id inexistente o sin permiso). */
function assertActualizado(
  {
    data,
    error,
  }: { data: unknown[] | null; error: { message: string } | null },
  que: string,
  // tabla e id para el registro; sin datos del paciente
  contexto: Record<string, string>
) {
  if (error) {
    logger.error("Record correction failed", {
      ...errorInfo(error),
      ...contexto,
    });
    throw new Error(`No se pudo corregir ${que}.`);
  }
  if (!data?.length) {
    logger.warning("Record correction matched no rows", contexto);
    throw new Error(`No se encontró ${que} a corregir.`);
  }
  logger.info("Record corrected", contexto);
}

export async function actualizarPaciente(
  pacienteId: string,
  datos: UpdatePaciente,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client
      .from("pacientes")
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq("id", pacienteId)
      .select("id"),
    "el paciente",
    { tabla: "pacientes", pacienteId }
  );
}

export async function actualizarSignos(
  pacienteId: string,
  datos: Partial<InsertSignosVitales>,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client
      .from("signos_vitales")
      .update(datos)
      .eq("paciente_id", pacienteId)
      .select("id"),
    "los signos vitales",
    { tabla: "signos_vitales", pacienteId }
  );
}

export async function actualizarConsulta(
  consultaId: string,
  datos: Partial<InsertConsulta>,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client
      .from("consultas")
      .update(datos)
      .eq("id", consultaId)
      .select("id"),
    "la consulta",
    { tabla: "consultas", consultaId }
  );
}

/** Reemplaza los diagnósticos: primero inserta los nuevos, luego borra los anteriores; si algo falla no se pierden. */
export async function actualizarDiagnosticos(
  consultaId: string,
  diagnosticos: string[],
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const { data: nuevos, error: errIns } = await client
    .from("diagnosticos_consulta")
    .insert(
      diagnosticos.map((d) => ({ consulta_id: consultaId, diagnostico: d }))
    )
    .select("id");
  if (errIns) {
    logger.error("Diagnoses insert failed", {
      ...errorInfo(errIns),
      consultaId,
    });
    throw new Error("No se pudieron actualizar los diagnósticos.");
  }

  const { error: errDel } = await client
    .from("diagnosticos_consulta")
    .delete()
    .eq("consulta_id", consultaId)
    .not("id", "in", `(${nuevos.map((d) => d.id).join(",")})`);
  if (errDel) {
    logger.error("Diagnoses cleanup failed", {
      ...errorInfo(errDel),
      consultaId,
    });
    throw new Error("No se pudieron actualizar los diagnósticos.");
  }
  logger.info("Diagnoses updated", { consultaId, count: nuevos.length });
}

export async function deletePaciente(
  id: string,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_DELETE);
  const { error } = await client.from("pacientes").delete().eq("id", id);

  if (error) {
    logger.error("Patient deletion failed", {
      ...errorInfo(error),
      pacienteId: id,
    });
    throw new Error("No se pudo eliminar el paciente.");
  }
  logger.info("Patient deleted", { pacienteId: id });
}
