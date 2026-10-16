import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { supabase } from "../supabase";

const logger = getLogger("db", "farmacia");

export async function getDashboardFarmacia(client: any = supabase) {
  const { data, error } = await client
    .from("dashboard_farmacia")
    .select("*")
    .single();

  if (error) {
    logger.error("Pharmacy dashboard load failed", errorInfo(error));
    return null;
  }
  return data;
}

export async function getEntregasFarmacia(client: any = supabase) {
  const { data, error } = await client
    .from("v_entregas_farmacia")
    .select("*")
    .order("fecha_entrega", { ascending: false });

  if (error) {
    logger.error("Pharmacy deliveries load failed", errorInfo(error));
    return [];
  }
  return data;
}

export async function getRecetasPendientes(client: any = supabase) {
  const { data: consultas, error: errorConsultas } = await client
    .from("consultas")
    .select(`
      id, created_at, tipo_consulta, brigada_id,
      pacientes (codigo, nombres, apellidos, comunidad),
      medicamentos_consulta ( medicamento_id, cantidad, indicaciones, medicamentos (nombre) )
    `)
    .order("created_at", { ascending: false });

  if (errorConsultas) {
    logger.error("Prescriptions load failed", errorInfo(errorConsultas));
    return [];
  }

  const { data: entregas, error: errorEntregas } = await client
    .from("entregas_farmacia")
    .select("consulta_id");

  if (errorEntregas) {
    logger.error(
      "Delivered prescriptions load failed",
      errorInfo(errorEntregas)
    );
    return [];
  }

  const entregadasSet = new Set(entregas.map((e: any) => e.consulta_id));

  const pendientes = consultas.filter((c: any) => {
    return (
      c.medicamentos_consulta &&
      c.medicamentos_consulta.length > 0 &&
      !entregadasSet.has(c.id)
    );
  });

  return pendientes;
}

export async function getFefoSuggestions(
  consultaId: string,
  client: any = supabase
) {
  const { data: medsReq, error: errMeds } = await client
    .from("medicamentos_consulta")
    .select("medicamento_id, cantidad, indicaciones, medicamentos(nombre)")
    .eq("consulta_id", consultaId);

  if (errMeds)
    logger.error("Prescription items load failed", {
      ...errorInfo(errMeds),
      consultaId,
    });
  if (errMeds || !medsReq || medsReq.length === 0) {
    throw new Error("No se encontraron medicamentos para esta receta.");
  }

  // Agrupar y consolidar las solicitudes por medicamento_id
  const mapMeds = new Map<
    string,
    {
      medicamento_id: string;
      cantidad: number;
      indicaciones: string;
      medicamento_nombre: string;
    }
  >();

  for (const req of medsReq) {
    const medId = req.medicamento_id;
    const qty = Number(req.cantidad) || 0;
    const medNombre =
      (req.medicamentos as any)?.nombre || "Medicamento Desconocido";
    const indic = req.indicaciones || "";

    if (mapMeds.has(medId)) {
      const prev = mapMeds.get(medId)!;
      prev.cantidad += qty;
      if (indic) prev.indicaciones += ` / ${indic}`;
    } else {
      mapMeds.set(medId, {
        medicamento_id: medId,
        cantidad: qty,
        indicaciones: indic,
        medicamento_nombre: medNombre,
      });
    }
  }

  const suggestions: any[] = [];

  for (const [medId, item] of mapMeds.entries()) {
    const requiredQty = item.cantidad;
    const medNombre = item.medicamento_nombre;

    const { data: lotes } = await client
      .from("lotes_medicamentos")
      .select("id, numero_lote, cantidad_actual, fecha_vencimiento")
      .eq("medicamento_id", medId)
      .gt("cantidad_actual", 0)
      .order("fecha_vencimiento", { ascending: true });

    const totalStock = (lotes || []).reduce(
      (acc: number, l: any) => acc + Number(l.cantidad_actual),
      0
    );
    const primerLote = lotes && lotes.length > 0 ? lotes[0] : null;

    suggestions.push({
      medicamento_id: medId,
      medicamento_nombre: medNombre,
      lote_id: primerLote ? primerLote.id : "",
      lote_numero: primerLote ? primerLote.numero_lote : "SIN STOCK",
      cantidad_requerida: requiredQty,
      cantidad_sugerida: Math.min(requiredQty, totalStock),
      stock_disponible: totalStock,
      error: totalStock === 0 ? "Agotado en inventario" : undefined,
      warning:
        totalStock > 0 && totalStock < requiredQty
          ? "Stock insuficiente para entrega completa"
          : undefined,
    });
  }

  return suggestions;
}

export async function registrarEntregaManual(
  entregas: any[],
  observaciones: string,
  consultaId: string,
  entregadoPor: string,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.FARMACIA_PROCESS);

  // 1. Verificación idempotente: Evitar entregas duplicadas para la misma receta
  const { data: entregasPrevias } = await client
    .from("entregas_farmacia")
    .select("id")
    .eq("consulta_id", consultaId);

  if (entregasPrevias && entregasPrevias.length > 0) {
    throw new Error("Esta receta ya fue procesada y entregada anteriormente.");
  }

  const inserts: any[] = [];

  for (const item of entregas) {
    const cantidadEntregadaReal = Number(item.cantidad_sugerida);
    if (!cantidadEntregadaReal || cantidadEntregadaReal <= 0) continue;

    // Validar disponibilidad de stock en los lotes activos FEFO
    const { data: lotes } = await client
      .from("lotes_medicamentos")
      .select("id, cantidad_actual")
      .eq("medicamento_id", item.medicamento_id)
      .gt("cantidad_actual", 0)
      .order("fecha_vencimiento", { ascending: true });

    if (!lotes || lotes.length === 0) {
      throw new Error(
        `El medicamento ${item.medicamento_nombre} no cuenta con stock suficiente en lotes.`
      );
    }

    const totalDisponible = lotes.reduce(
      (sum: number, l: any) => sum + Number(l.cantidad_actual),
      0
    );
    if (totalDisponible < cantidadEntregadaReal) {
      throw new Error(
        `El medicamento ${item.medicamento_nombre} solo cuenta con ${totalDisponible} unidades disponibles en inventario.`
      );
    }

    const lotePrincipalId = item.lote_id || lotes[0].id;

    // Unica insercion en la aplicacion.
    // El trigger PostgreSQL `trg_entrega_farmacia_after_insert` descontara del lote y registrara en movimientos_inventario.
    inserts.push({
      consulta_id: consultaId,
      medicamento_id: item.medicamento_id,
      lote_id: lotePrincipalId,
      cantidad: cantidadEntregadaReal,
      entregado_por: entregadoPor,
      observaciones: observaciones || "Entregado en farmacia",
    });
  }

  if (inserts.length === 0) {
    throw new Error("No hay cantidades válidas para entregar.");
  }

  const { error } = await client.from("entregas_farmacia").insert(inserts);

  if (error) {
    logger.error("Pharmacy delivery failed", {
      ...errorInfo(error),
      consultaId,
    });
    throw new Error("No se pudo registrar la entrega.");
  }

  logger.info("Pharmacy delivery registered", {
    consultaId,
    count: inserts.length,
  });
  return { success: true, count: inserts.length };
}
