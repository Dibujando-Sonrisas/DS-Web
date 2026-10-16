"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import {
  createDonacionRopa as createDonacionRopaDB,
  createEntregaRopa as createEntregaRopaDB,
  getDashboardRopa as getDashboardRopaDB,
  getDonacionesRopa as getDonacionesRopaDB,
  getEntregasRopa as getEntregasRopaDB,
  getPacientesBrigadaParaRopa as getPacientesBrigadaParaRopaDB,
  getResumenRopa as getResumenRopaDB,
} from "@/lib/db/ropa";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

export async function getDashboardRopaAction() {
  const supabase = await getAuthedSupabase();
  return await getDashboardRopaDB(supabase);
}

export async function getResumenRopaAction() {
  const supabase = await getAuthedSupabase();
  return await getResumenRopaDB(supabase);
}

export async function getDonacionesRopaAction() {
  const supabase = await getAuthedSupabase();
  return await getDonacionesRopaDB(supabase);
}

export async function getEntregasRopaAction() {
  const supabase = await getAuthedSupabase();
  return await getEntregasRopaDB(supabase);
}

export async function getPacientesBrigadaParaRopaAction(brigadaId: string) {
  const supabase = await getAuthedSupabase();
  return await getPacientesBrigadaParaRopaDB(brigadaId, supabase);
}

export async function registrarDonacionRopaAction(donacion: any) {
  await assertPermission(PERMISSIONS.DONACIONES_CREATE);
  const supabase = await getAuthedSupabase();
  const result = await createDonacionRopaDB(donacion, supabase);
  revalidatePath("/administracion/donaciones");
  return result;
}

export async function registrarEntregaRopaAction(entrega: any) {
  await assertPermission(PERMISSIONS.DONACIONES_CREATE);
  const supabase = await getAuthedSupabase();
  const result = await createEntregaRopaDB(entrega, supabase);
  revalidatePath("/administracion/donaciones");
  return result;
}
