import { supabase } from "../supabase";
import { Database } from "../database.types";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";

export type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];
export type InsertPaciente = Database["public"]["Tables"]["pacientes"]["Insert"];
export type UpdatePaciente = Database["public"]["Tables"]["pacientes"]["Update"];

export type SignosVitales = Database["public"]["Tables"]["signos_vitales"]["Row"];
export type InsertSignosVitales = Database["public"]["Tables"]["signos_vitales"]["Insert"];

export type Consulta = Database["public"]["Tables"]["consultas"]["Row"];
export type InsertConsulta = Database["public"]["Tables"]["consultas"]["Insert"];

export type Diagnostico = Database["public"]["Tables"]["diagnosticos_consulta"]["Row"];
export type InsertDiagnostico = Database["public"]["Tables"]["diagnosticos_consulta"]["Insert"];

export type MedicamentoConsulta = Database["public"]["Tables"]["medicamentos_consulta"]["Row"];
export type InsertMedicamentoConsulta = Database["public"]["Tables"]["medicamentos_consulta"]["Insert"];

export async function getPacientesDashboard(client: any = supabase) {
  const { data, error } = await client
    .from("dashboard_pacientes")
    .select("*")
    .single();

  if (error) {
    console.error("Error al obtener dashboard de pacientes:", error);
    return null;
  }
  return data;
}

export async function getPacientesAtendidos(client: any = supabase) {
  const { data, error } = await client
    .from("v_pacientes_atendidos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener pacientes atendidos:", error);
    return [];
  }
  return data;
}

export async function getPacienteDetalle(id: string, client: any = supabase) {
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

/** Etapa 1 (ingresado): crea el paciente con su código correlativo por brigada. */
export async function registrarPaciente(paciente: InsertPaciente, client: any = supabase) {
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

  if (errPac) throw new Error(`Error paciente: ${errPac.message}`);

  return newPaciente;
}

/** Etapa 2 (preclínica): guarda los signos vitales; la fila marca la etapa aunque vaya vacía. */
export async function registrarPreclinica(
  pacienteId: string,
  signos: Partial<InsertSignosVitales>,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  // ponytail: chequeo en la app, dos envíos simultáneos podrían duplicar; índice único si pasa
  const { count } = await client
    .from("signos_vitales")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", pacienteId);
  if (count) throw new Error("La preclínica de este paciente ya fue registrada.");

  const { error: errSig } = await client
    .from("signos_vitales")
    .insert({ ...signos, paciente_id: pacienteId } as InsertSignosVitales);

  if (errSig) throw new Error(`Error signos: ${errSig.message}`);
}

/**
 * Etapa 3 (consulta): quien abre la consulta toma al paciente para que nadie más lo atienda.
 * Devuelve el nombre de quien ya lo tiene, o null si quedó tomado por el usuario actual.
 */
export async function tomarConsulta(pacienteId: string, client: any = supabase): Promise<string | null> {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const { data: { user } } = await client.auth.getUser();

  // una sola sentencia: si dos lo abren a la vez, solo uno lo toma
  const { data, error } = await client
    .from("pacientes")
    .update({ consulta_tomada_por: user.id })
    .eq("id", pacienteId)
    .or(`consulta_tomada_por.is.null,consulta_tomada_por.eq.${user.id}`)
    .select("id");

  if (error) throw new Error(`Error al tomar la consulta: ${error.message}`);
  if (data.length > 0) return null;

  const { data: paciente } = await client
    .from("pacientes")
    .select("perfiles:consulta_tomada_por(nombre_completo)")
    .eq("id", pacienteId)
    .single();
  return paciente?.perfiles?.nombre_completo || "otro usuario";
}

/** Devuelve al paciente a la espera de consulta; solo quien lo tomó puede liberarlo. */
export async function liberarConsulta(pacienteId: string, client: any = supabase) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const { data: { user } } = await client.auth.getUser();
  const { error } = await client
    .from("pacientes")
    .update({ consulta_tomada_por: null })
    .eq("id", pacienteId)
    .eq("consulta_tomada_por", user.id);

  if (error) throw new Error(`Error al liberar la consulta: ${error.message}`);
}

/** Etapa 4 (finalizada): guarda la consulta con sus diagnósticos y la receta. */
export async function registrarConsulta(
  pacienteId: string,
  consulta: Partial<InsertConsulta>,
  diagnosticos: string[],
  medicamentos: Partial<InsertMedicamentoConsulta>[],
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const { data: { user } } = await client.auth.getUser();
  const { data: paciente, error: errPac } = await client
    .from("pacientes")
    .select("brigada_id, consulta_tomada_por, consultas(id)")
    .eq("id", pacienteId)
    .single();

  if (errPac) throw new Error(`Error paciente: ${errPac.message}`);
  if (paciente.consultas.length > 0) throw new Error("La consulta de este paciente ya fue registrada.");
  if (paciente.consulta_tomada_por !== user.id) throw new Error("La consulta de este paciente la tiene otro usuario.");

  const { data: newConsulta, error: errCons } = await client
    .from("consultas")
    .insert({ ...consulta, brigada_id: paciente.brigada_id, paciente_id: pacienteId } as InsertConsulta)
    .select()
    .single();

  if (errCons) throw new Error(`Error consulta: ${errCons.message}`);

  const consultaId = newConsulta.id;

  if (diagnosticos.length > 0) {
    const diagInserts = diagnosticos.map(d => ({
      consulta_id: consultaId,
      diagnostico: d
    }));
    await client.from("diagnosticos_consulta").insert(diagInserts);
  }

  if (medicamentos.length > 0) {
    const medInserts = medicamentos.map(m => ({
      ...m,
      consulta_id: consultaId
    })) as InsertMedicamentoConsulta[];
    await client.from("medicamentos_consulta").insert(medInserts);
  }
}

// Correcciones desde la vista del expediente. Los datos llegan ya validados y limpios.

/** Falla si la actualización no tocó ninguna fila (id inexistente o sin permiso). */
function assertActualizado({ data, error }: { data: unknown[] | null; error: { message: string } | null }, que: string) {
  if (error) throw new Error(`Error ${que}: ${error.message}`);
  if (!data?.length) throw new Error(`No se encontró ${que} a corregir.`);
}

export async function actualizarPaciente(pacienteId: string, datos: UpdatePaciente, client: any = supabase) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client
      .from("pacientes")
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq("id", pacienteId)
      .select("id"),
    "el paciente"
  );
}

export async function actualizarSignos(
  pacienteId: string,
  datos: Partial<InsertSignosVitales>,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client.from("signos_vitales").update(datos).eq("paciente_id", pacienteId).select("id"),
    "los signos vitales"
  );
}

export async function actualizarConsulta(consultaId: string, datos: Partial<InsertConsulta>, client: any = supabase) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertActualizado(
    await client.from("consultas").update(datos).eq("id", consultaId).select("id"),
    "la consulta"
  );
}

/** Reemplaza los diagnósticos: primero inserta los nuevos, luego borra los anteriores; si algo falla no se pierden. */
export async function actualizarDiagnosticos(consultaId: string, diagnosticos: string[], client: any = supabase) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const { data: nuevos, error: errIns } = await client
    .from("diagnosticos_consulta")
    .insert(diagnosticos.map((d) => ({ consulta_id: consultaId, diagnostico: d })))
    .select("id");
  if (errIns) throw new Error(`Error diagnósticos: ${errIns.message}`);

  const { error: errDel } = await client
    .from("diagnosticos_consulta")
    .delete()
    .eq("consulta_id", consultaId)
    .not("id", "in", `(${nuevos.map((d: { id: string }) => d.id).join(",")})`);
  if (errDel) throw new Error(`Error diagnósticos: ${errDel.message}`);
}

export async function deletePaciente(id: string, client: any = supabase) {
  await assertPermission(PERMISSIONS.PACIENTES_DELETE);
  const { error } = await client
    .from("pacientes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
