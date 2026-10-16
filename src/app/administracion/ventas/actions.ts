"use server";

import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import {
  createCategoriaProducto as createCategoriaProductoDB,
  createProducto as createProductoDB,
  deleteCategoriaProducto as deleteCategoriaProductoDB,
  deleteProducto as deleteProductoDB,
  getBajoStock as getBajoStockDB,
  getCategoriasProductos as getCategoriasProductosDB,
  getDashboardVentas as getDashboardVentasDB,
  getHistorialVentas as getHistorialVentasDB,
  getProductos as getProductosDB,
  registrarVenta as registrarVentaDB,
  updateStockProducto as updateStockProductoDB,
} from "@/lib/db/ventas";
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

export async function getDashboardVentasAction() {
  const supabase = await getAuthedSupabase();
  return await getDashboardVentasDB(supabase);
}

export async function getCategoriasProductosAction() {
  const supabase = await getAuthedSupabase();
  return await getCategoriasProductosDB(supabase);
}

export async function getProductosAction() {
  const supabase = await getAuthedSupabase();
  return await getProductosDB(supabase);
}

export async function getHistorialVentasAction() {
  const supabase = await getAuthedSupabase();
  return await getHistorialVentasDB(supabase);
}

export async function getBajoStockAction() {
  const supabase = await getAuthedSupabase();
  return await getBajoStockDB(supabase);
}

export async function crearCategoriaProductoAction(categoria: any) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);
  const supabase = await getAuthedSupabase();
  const result = await createCategoriaProductoDB(categoria, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}

export async function crearProductoAction(producto: any) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);
  const supabase = await getAuthedSupabase();
  const result = await createProductoDB(producto, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}

export async function updateStockProductoAction(
  id: string,
  nuevoStock: number
) {
  await assertPermission(PERMISSIONS.VENTAS_UPDATE);
  const supabase = await getAuthedSupabase();
  const result = await updateStockProductoDB(id, nuevoStock, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}

export async function registrarVentaAction(ventaParams: {
  vendedor_id: string;
  brigada_id?: string;
  observaciones?: string;
  detalles: Array<{
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);
  const supabase = await getAuthedSupabase();
  const result = await registrarVentaDB(ventaParams, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}

export async function deleteCategoriaProductoAction(id: string) {
  await assertPermission(PERMISSIONS.VENTAS_DELETE);
  const supabase = await getAuthedSupabase();
  const result = await deleteCategoriaProductoDB(id, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}

export async function deleteProductoAction(id: string) {
  await assertPermission(PERMISSIONS.VENTAS_DELETE);
  const supabase = await getAuthedSupabase();
  const result = await deleteProductoDB(id, supabase);
  revalidatePath("/administracion/ventas");
  return result;
}
