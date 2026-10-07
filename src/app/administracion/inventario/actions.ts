"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getMedicamentos as getMedicamentosDB,
  createMedicamento as createMedicamentoDB,
  updateMedicamento as updateMedicamentoDB,
  deleteMedicamento as deleteMedicamentoDB,
  getLotesByMedicamento as getLotesByMedicamentoDB,
  createLote as createLoteDB,
  updateLote as updateLoteDB,
  deleteLote as deleteLoteDB,
  getCategoriasInventario as getCategoriasInventarioDB,
  createCategoria as createCategoriaDB,
  updateCategoria as updateCategoriaDB,
  deleteCategoria as deleteCategoriaDB,
  type TipoRecurso,
  type InsertMedicamento,
  type UpdateMedicamento,
  type InsertLoteMedicamento,
  type UpdateLoteMedicamento,
} from "@/lib/db/inventario";

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

export async function getMedicamentosAction(tipoRecurso?: TipoRecurso | "todos") {
  const supabase = await getAuthedSupabase();
  return await getMedicamentosDB(tipoRecurso, supabase);
}

export async function createMedicamentoAction(
  medicamento: InsertMedicamento,
  cantidadInicial: number = 0
) {
  await assertPermission(PERMISSIONS.INVENTARIO_CREATE);
  const supabase = await getAuthedSupabase();
  const res = await createMedicamentoDB(medicamento, cantidadInicial, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function updateMedicamentoAction(
  id: string,
  medicamento: UpdateMedicamento
) {
  await assertPermission(PERMISSIONS.INVENTARIO_UPDATE);
  const supabase = await getAuthedSupabase();
  const res = await updateMedicamentoDB(id, medicamento, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function deleteMedicamentoAction(id: string) {
  await assertPermission(PERMISSIONS.INVENTARIO_DELETE);
  const supabase = await getAuthedSupabase();
  const res = await deleteMedicamentoDB(id, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function getLotesByMedicamentoAction(medicamentoId: string) {
  const supabase = await getAuthedSupabase();
  return await getLotesByMedicamentoDB(medicamentoId, supabase);
}

export async function createLoteAction(lote: InsertLoteMedicamento) {
  await assertPermission(PERMISSIONS.INVENTARIO_CREATE);
  const supabase = await getAuthedSupabase();
  const res = await createLoteDB(lote, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function updateLoteAction(id: string, lote: UpdateLoteMedicamento) {
  await assertPermission(PERMISSIONS.INVENTARIO_UPDATE);
  const supabase = await getAuthedSupabase();
  const res = await updateLoteDB(id, lote, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function deleteLoteAction(id: string) {
  await assertPermission(PERMISSIONS.INVENTARIO_DELETE);
  const supabase = await getAuthedSupabase();
  const res = await deleteLoteDB(id, supabase);
  revalidatePath("/administracion/inventario");
  return res;
}

export async function getCategoriasInventarioAction() {
  const supabase = await getAuthedSupabase();
  return await getCategoriasInventarioDB(supabase);
}

// las categorías devuelven { error } en vez de lanzar: así el mensaje llega igual en producción
type ActionResponse = { error?: string };

async function categoriaAction(
  run: (supabase: Awaited<ReturnType<typeof getAuthedSupabase>>) => Promise<void>
): Promise<ActionResponse> {
  try {
    await run(await getAuthedSupabase());
    revalidatePath("/administracion/inventario");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar la categoría." };
  }
}

export async function createCategoriaAction(nombre: string, tipoRecurso: TipoRecurso) {
  return categoriaAction((supabase) => createCategoriaDB(nombre, tipoRecurso, supabase));
}

export async function updateCategoriaAction(id: string, nombre: string) {
  return categoriaAction((supabase) => updateCategoriaDB(id, nombre, supabase));
}

export async function deleteCategoriaAction(id: string) {
  return categoriaAction((supabase) => deleteCategoriaDB(id, supabase));
}
