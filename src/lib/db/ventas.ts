import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { generateCleanToken } from "../coding/codingUtils";
import { supabase } from "../supabase";

const logger = getLogger("db", "ventas");

// Categorías
export async function getCategoriasProductos(client: any = supabase) {
  const { data, error } = await client
    .from("categorias_productos")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) {
    logger.error("Product categories load failed", errorInfo(error));
    throw new Error("Product categories could not be loaded.");
  }
  return data;
}

export async function createCategoriaProducto(
  categoria: any,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);
  const { data, error } = await client
    .from("categorias_productos")
    .insert([categoria])
    .select()
    .single();
  if (error) {
    logger.error("Product category creation failed", errorInfo(error));
    throw new Error("No se pudo crear la categoría.");
  }
  logger.info("Product category created", { categoriaId: data.id });
  return data;
}

export async function deleteCategoriaProducto(
  id: string,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.VENTAS_DELETE);
  const { error } = await client
    .from("categorias_productos")
    .delete()
    .eq("id", id);
  if (error) {
    logger.error("Product category deletion failed", {
      ...errorInfo(error),
      categoriaId: id,
    });
    throw new Error("No se pudo eliminar la categoría.");
  }
  logger.info("Product category deleted", { categoriaId: id });
}

// Productos
export async function getProductos(client: any = supabase) {
  const { data, error } = await client
    .from("productos")
    .select(`
      id, codigo, nombre, descripcion, precio, stock, activo,
      categorias_productos (nombre)
    `)
    .order("nombre", { ascending: true });
  if (error) {
    logger.error("Products load failed", errorInfo(error));
    throw new Error("Products could not be loaded.");
  }
  return data;
}

export async function createProducto(producto: any, client: any = supabase) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);
  const { data, error } = await client
    .from("productos")
    .insert([producto])
    .select()
    .single();
  if (error) {
    logger.error("Product creation failed", errorInfo(error));
    throw new Error("No se pudo crear el producto.");
  }
  logger.info("Product created", { productoId: data.id });
  return data;
}

export async function updateStockProducto(
  id: string,
  nuevoStock: number,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.VENTAS_UPDATE);
  if (nuevoStock < 0) throw new Error("El stock no puede ser negativo");
  const { data, error } = await client
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    logger.error("Product stock update failed", {
      ...errorInfo(error),
      productoId: id,
    });
    throw new Error("No se pudo actualizar el stock.");
  }
  logger.info("Product stock updated", { productoId: id, stock: nuevoStock });
  return data;
}

export async function deleteProducto(id: string, client: any = supabase) {
  await assertPermission(PERMISSIONS.VENTAS_DELETE);
  const { error } = await client.from("productos").delete().eq("id", id);
  if (error) {
    logger.error("Product deletion failed", {
      ...errorInfo(error),
      productoId: id,
    });
    throw new Error("No se pudo eliminar el producto.");
  }
  logger.info("Product deleted", { productoId: id });
}

// Ventas Dashboard e Historial
export async function getDashboardVentas(client: any = supabase) {
  const { data, error } = await client
    .from("dashboard_ventas")
    .select("*")
    .single();
  if (error) {
    logger.error("Sales dashboard load failed", errorInfo(error));
    throw new Error("Sales dashboard could not be loaded.");
  }
  return data;
}

export async function getHistorialVentas(client: any = supabase) {
  const { data, error } = await client
    .from("v_ventas")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) {
    logger.error("Sales history load failed", errorInfo(error));
    throw new Error("Sales history could not be loaded.");
  }
  return data;
}

export async function getBajoStock(client: any = supabase) {
  const { data, error } = await client
    .from("productos")
    .select("id, codigo, nombre, stock")
    .lte("stock", 5)
    .eq("activo", true)
    .order("stock", { ascending: true });
  if (error) {
    logger.error("Low stock load failed", errorInfo(error));
    throw new Error("Low stock products could not be loaded.");
  }
  return data;
}

// Crear Venta y Detalles
export async function registrarVenta(
  ventaParams: {
    vendedor_id: string;
    brigada_id?: string;
    observaciones?: string;
    detalles: Array<{
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
    }>;
  },
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.VENTAS_CREATE);

  if (!ventaParams.detalles || ventaParams.detalles.length === 0) {
    throw new Error("La venta debe tener al menos un producto.");
  }

  const anio = new Date().getFullYear();
  const codigo = `VTA-${anio}-${generateCleanToken(5)}`;

  const { data: venta, error: errVenta } = await client
    .from("ventas")
    .insert([
      {
        codigo,
        vendedor_id: ventaParams.vendedor_id,
        brigada_id: ventaParams.brigada_id || null,
        observaciones: ventaParams.observaciones || "",
      },
    ])
    .select("id")
    .single();

  if (errVenta) {
    logger.error("Sale creation failed", errorInfo(errVenta));
    throw new Error("No se pudo registrar la venta.");
  }

  const detallesInsert = ventaParams.detalles.map((d) => ({
    venta_id: venta.id,
    producto_id: d.producto_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
    subtotal: d.cantidad * d.precio_unitario,
  }));

  const { error: errDetalles } = await client
    .from("detalle_ventas")
    .insert(detallesInsert);

  if (errDetalles) {
    logger.error("Sale items insert failed", {
      ...errorInfo(errDetalles),
      ventaId: venta.id,
    });
    const { error: errRollback } = await client
      .from("ventas")
      .delete()
      .eq("id", venta.id);
    if (errRollback)
      logger.error("Sale rollback failed", {
        ...errorInfo(errRollback),
        ventaId: venta.id,
      });
    throw new Error("No se pudieron guardar los detalles de la venta.");
  }

  logger.info("Sale registered", {
    ventaId: venta.id,
    codigo,
    items: detallesInsert.length,
  });
  return { success: true, venta_id: venta.id, codigo };
}
