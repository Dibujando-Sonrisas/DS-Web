"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import {
  actualizarConsulta as actualizarConsultaDB,
  actualizarDiagnosticos as actualizarDiagnosticosDB,
  actualizarPaciente as actualizarPacienteDB,
  actualizarSignos as actualizarSignosDB,
  deletePaciente as deletePacienteDB,
  getPacienteDetalle as getPacienteDetalleDB,
  getPacientesAtendidos as getPacientesAtendidosDB,
  getPacientesDashboard as getPacientesDashboardDB,
  getProfesionalesConsulta as getProfesionalesConsultaDB,
  type InsertMedicamentoConsulta,
  liberarConsulta as liberarConsultaDB,
  registrarConsulta as registrarConsultaDB,
  registrarPaciente as registrarPacienteDB,
  registrarPreclinica as registrarPreclinicaDB,
  tomarConsulta as tomarConsultaDB,
} from "@/lib/db/pacientes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  assertValido,
  type Datos,
  limpiarConsulta,
  limpiarPaciente,
  limpiarSignos,
  listaDiagnosticos,
  validarConsulta,
  validarDiagnosticos,
  validarPaciente,
  validarSignos,
} from "@/lib/validation/expediente";

async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }

  return supabase;
}

export async function getPacientesDashboardAction() {
  const supabase = await getAuthedSupabase();
  return await getPacientesDashboardDB(supabase);
}

export async function getPacientesAtendidosAction() {
  const supabase = await getAuthedSupabase();
  return await getPacientesAtendidosDB(supabase);
}

export async function getPacienteDetalleAction(id: string) {
  const supabase = await getAuthedSupabase();
  return await getPacienteDetalleDB(id, supabase);
}

export async function getProfesionalesConsultaAction() {
  await assertPermission(PERMISSIONS.PACIENTES_READ);
  const supabase = await getAuthedSupabase();
  return await getProfesionalesConsultaDB(supabase);
}

export async function registrarPacienteAction(paciente: Datos) {
  await assertPermission(PERMISSIONS.PACIENTES_CREATE);
  if (!paciente.brigada_id)
    throw new Error("Debe seleccionar una brigada activa obligatoriamente.");
  assertValido(validarPaciente(paciente));
  const supabase = await getAuthedSupabase();
  // el código lo genera registrarPaciente a partir de la brigada
  const result = await registrarPacienteDB(
    {
      ...limpiarPaciente(paciente),
      brigada_id: String(paciente.brigada_id),
      codigo: "",
    },
    supabase
  );
  revalidatePath("/administracion/pacientes");
  return result;
}

export async function registrarPreclinicaAction(
  pacienteId: string,
  signos: Datos
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido(validarSignos(signos));
  const supabase = await getAuthedSupabase();
  await registrarPreclinicaDB(pacienteId, limpiarSignos(signos), supabase);
  revalidatePath("/administracion/pacientes");
}

export async function tomarConsultaAction(pacienteId: string) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const supabase = await getAuthedSupabase();
  const result = await tomarConsultaDB(pacienteId, supabase);
  revalidatePath("/administracion/pacientes");
  return result;
}

export async function liberarConsultaAction(pacienteId: string) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  const supabase = await getAuthedSupabase();
  await liberarConsultaDB(pacienteId, supabase);
  revalidatePath("/administracion/pacientes");
}

export async function registrarConsultaAction(
  pacienteId: string,
  consulta: Datos,
  diagnosticos: string,
  medicamentos: Partial<InsertMedicamentoConsulta>[]
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido({
    ...validarConsulta(consulta),
    ...validarDiagnosticos(diagnosticos),
  });
  const supabase = await getAuthedSupabase();
  await registrarConsultaDB(
    pacienteId,
    limpiarConsulta(consulta),
    listaDiagnosticos(diagnosticos),
    medicamentos,
    supabase
  );
  revalidatePath("/administracion/pacientes");
}

// Correcciones desde la vista del expediente: mismas reglas que al registrar

export async function actualizarPacienteAction(
  pacienteId: string,
  datos: Datos
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido(validarPaciente(datos));
  const supabase = await getAuthedSupabase();
  await actualizarPacienteDB(pacienteId, limpiarPaciente(datos), supabase);
  revalidatePath("/administracion/pacientes");
}

export async function actualizarSignosAction(pacienteId: string, datos: Datos) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido(validarSignos(datos));
  const supabase = await getAuthedSupabase();
  await actualizarSignosDB(pacienteId, limpiarSignos(datos), supabase);
}

export async function actualizarConsultaAction(
  consultaId: string,
  datos: Datos
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido(validarConsulta(datos));
  const supabase = await getAuthedSupabase();
  await actualizarConsultaDB(consultaId, limpiarConsulta(datos), supabase);
  revalidatePath("/administracion/pacientes");
}

export async function actualizarDiagnosticosAction(
  consultaId: string,
  diagnosticos: string
) {
  await assertPermission(PERMISSIONS.PACIENTES_UPDATE);
  assertValido(validarDiagnosticos(diagnosticos));
  const supabase = await getAuthedSupabase();
  await actualizarDiagnosticosDB(
    consultaId,
    listaDiagnosticos(diagnosticos),
    supabase
  );
}

export async function deletePacienteAction(id: string) {
  await assertPermission(PERMISSIONS.PACIENTES_DELETE);
  const supabase = await getAuthedSupabase();
  const result = await deletePacienteDB(id, supabase);
  revalidatePath("/administracion/pacientes");
  return result;
}
