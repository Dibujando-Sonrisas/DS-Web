"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import {
  getDashboardFarmacia as getDashboardFarmaciaDB,
  getEntregasFarmacia as getEntregasFarmaciaDB,
  getFefoSuggestions as getFefoSuggestionsDB,
  getRecetasPendientes as getRecetasPendientesDB,
  registrarEntregaManual as registrarEntregaManualDB,
} from "@/lib/db/farmacia";
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

export async function getDashboardFarmaciaAction() {
  const supabase = await getAuthedSupabase();
  return await getDashboardFarmaciaDB(supabase);
}

export async function getEntregasFarmaciaAction() {
  const supabase = await getAuthedSupabase();
  return await getEntregasFarmaciaDB(supabase);
}

export async function getRecetasPendientesAction() {
  const supabase = await getAuthedSupabase();
  return await getRecetasPendientesDB(supabase);
}

export async function getFefoSuggestionsAction(consultaId: string) {
  const supabase = await getAuthedSupabase();
  return await getFefoSuggestionsDB(consultaId, supabase);
}

export async function registrarEntregaManualAction(
  entregas: any[],
  observaciones: string,
  consultaId: string,
  entregadoPor: string
) {
  await assertPermission(PERMISSIONS.FARMACIA_PROCESS);
  const supabase = await getAuthedSupabase();
  const result = await registrarEntregaManualDB(
    entregas,
    observaciones,
    consultaId,
    entregadoPor,
    supabase
  );
  revalidatePath("/administracion/farmacia");
  return result;
}
