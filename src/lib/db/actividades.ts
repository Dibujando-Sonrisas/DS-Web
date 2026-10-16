import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { supabase } from "../supabase";

const logger = getLogger("db", "actividades");

export async function getDashboardActividades(client: any = supabase) {
  const { data, error } = await client
    .from("dashboard_actividades")
    .select("*")
    .single();

  if (error) {
    logger.error("Activities dashboard load failed", errorInfo(error));
    return null;
  }
  return data;
}

export async function getActividades(client: any = supabase) {
  const { data, error } = await client
    .from("actividades_infantiles")
    .select(`
      id,
      nombre,
      descripcion,
      cantidad_regalos,
      created_at,
      brigadas (nombre),
      perfiles (nombre_completo),
      participantes_actividad (cantidad_ninos)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Activities load failed", errorInfo(error));
    return [];
  }

  return data.map((act: any) => {
    const totalNinos =
      act.participantes_actividad?.reduce(
        (sum: number, p: any) => sum + p.cantidad_ninos,
        0
      ) || 0;
    return {
      ...act,
      total_ninos: totalNinos,
    };
  });
}

export async function createActividad(
  actividad: {
    brigada_id: string;
    nombre: string;
    descripcion: string;
    cantidad_regalos: number;
    responsable_id: string;
  },
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.ACTIVIDADES_CREATE);
  const { data, error } = await client
    .from("actividades_infantiles")
    .insert([actividad])
    .select()
    .single();

  if (error) {
    logger.error("Activity creation failed", {
      ...errorInfo(error),
      brigadaId: actividad.brigada_id,
    });
    throw new Error("No se pudo crear la actividad.");
  }
  logger.info("Activity created", {
    actividadId: data.id,
    brigadaId: actividad.brigada_id,
  });
  return data;
}

export async function addParticipantesActividad(
  actividadId: string,
  cantidadNinos: number,
  client: any = supabase
) {
  await assertPermission(PERMISSIONS.ACTIVIDADES_UPDATE);
  if (cantidadNinos <= 0) {
    throw new Error("La cantidad de niños debe ser mayor a 0");
  }

  const { data, error } = await client
    .from("participantes_actividad")
    .insert([{ actividad_id: actividadId, cantidad_ninos: cantidadNinos }])
    .select()
    .single();

  if (error) {
    logger.error("Participants registration failed", {
      ...errorInfo(error),
      actividadId,
    });
    throw new Error("No se pudieron agregar los participantes.");
  }
  logger.info("Participants registered", { actividadId, cantidadNinos });
  return data;
}
