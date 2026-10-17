import type { SupabaseClient } from "@supabase/supabase-js";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import type { Database, TablesInsert } from "@/lib/database.types";
import { errorInfo, getLogger } from "@/lib/logger";
import { generateCleanToken } from "../coding/codingUtils";
import { supabase } from "../supabase";

const logger = getLogger("db", "ropa");

// tipo_donacion only picks the code prefix; donaciones_ropa has no such column
export type DonacionRopaInput = Omit<
  TablesInsert<"donaciones_ropa">,
  "codigo"
> & { tipo_donacion?: string };

export async function getDashboardRopa(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("dashboard_ropa")
    .select("*")
    .single();

  if (error) {
    logger.error("Clothing dashboard load failed", errorInfo(error));
    return null;
  }
  return data;
}

export async function getResumenRopa(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("v_resumen_ropa")
    .select("*")
    .single();

  if (error) {
    logger.error("Clothing summary load failed", errorInfo(error));
    return null;
  }
  return data;
}

export async function getDonacionesRopa(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("donaciones_ropa")
    .select("*")
    .order("fecha_donacion", { ascending: false });

  if (error) {
    logger.error("Donations load failed", errorInfo(error));
    return [];
  }
  return data;
}

export async function createDonacionRopa(
  { tipo_donacion, ...donacion }: DonacionRopaInput,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.DONACIONES_CREATE);
  const anio = new Date().getFullYear();
  let pfx = "ROP";
  if (tipo_donacion === "Dinero") pfx = "DIN";
  if (tipo_donacion === "Juguetes") pfx = "JUG";

  const codigo = `DON-${pfx}-${anio}-${generateCleanToken(5)}`;
  const { data, error } = await client
    .from("donaciones_ropa")
    .insert([{ ...donacion, codigo }])
    .select()
    .single();

  if (error) {
    logger.error("Donation creation failed", errorInfo(error));
    throw new Error("No se pudo crear la donación.");
  }
  logger.info("Donation created", {
    donacionId: data.id,
    codigo,
    tipo: tipo_donacion,
  });
  return data;
}

export async function getEntregasRopa(
  client: SupabaseClient<Database> = supabase
) {
  const { data, error } = await client
    .from("entregas_ropa")
    .select(`
      id,
      brigada_id,
      cantidad_prendas,
      fecha_entrega,
      observaciones,
      pacientes (nombres, apellidos),
      brigadas (nombre),
      perfiles (nombre_completo)
    `)
    .order("fecha_entrega", { ascending: false });

  if (error) {
    logger.error("Clothing deliveries load failed", errorInfo(error));
    return [];
  }
  return data;
}

export async function getPacientesBrigadaParaRopa(
  brigadaId: string,
  client: SupabaseClient<Database> = supabase
) {
  const { data: pacientes, error: errPacientes } = await client
    .from("pacientes")
    .select("id, nombres, apellidos, codigo")
    .eq("brigada_id", brigadaId);

  if (errPacientes) {
    logger.error("Brigade patients load failed", {
      ...errorInfo(errPacientes),
      brigadaId,
    });
    throw new Error("No se pudieron cargar los pacientes de la brigada.");
  }

  const { data: entregas, error: errEntregas } = await client
    .from("entregas_ropa")
    .select("paciente_id, cantidad_prendas")
    .eq("brigada_id", brigadaId);

  if (errEntregas) {
    logger.error("Clothing deliveries load failed", {
      ...errorInfo(errEntregas),
      brigadaId,
    });
    throw new Error("No se pudieron cargar los pacientes de la brigada.");
  }

  const consumos: Record<string, number> = {};
  for (const e of entregas) {
    consumos[e.paciente_id] =
      (consumos[e.paciente_id] || 0) + e.cantidad_prendas;
  }

  return pacientes
    .map((p) => ({
      ...p,
      prendasRecibidas: consumos[p.id] || 0,
      prendasDisponibles: 2 - (consumos[p.id] || 0),
    }))
    .filter((p) => p.prendasDisponibles > 0);
}

export async function createEntregaRopa(
  entrega: TablesInsert<"entregas_ropa">,
  client: SupabaseClient<Database> = supabase
) {
  await assertPermission(PERMISSIONS.DONACIONES_CREATE);
  if (entrega.cantidad_prendas <= 0 || entrega.cantidad_prendas > 2) {
    throw new Error("La cantidad debe ser 1 o 2.");
  }
  const { data, error } = await client
    .from("entregas_ropa")
    .insert([entrega])
    .select()
    .single();

  if (error) {
    logger.error("Clothing delivery failed", {
      ...errorInfo(error),
      brigadaId: entrega.brigada_id,
    });
    throw new Error("No se pudo registrar la entrega de ropa.");
  }
  logger.info("Clothing delivery registered", {
    entregaId: data.id,
    brigadaId: data.brigada_id,
    cantidad: data.cantidad_prendas,
  });
  return data;
}
