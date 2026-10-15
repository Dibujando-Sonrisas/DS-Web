import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { MODO_OFFLINE } from "@/lib/offline";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { leerEstadoOffline } from "./estado";
import OfflinePanel from "./OfflinePanel";

const logger = getLogger("offline");

export default async function AjustesOfflinePage() {
  // la sección existe solo en el servidor de la brigada (npm run offline)
  if (!MODO_OFFLINE) notFound();
  await requirePermission(PERMISSIONS.AJUSTES_READ);

  // offline_pendientes la instala scripts/offline.sql solo en la base local: no está en database.types
  const { data, error } = await createSupabaseAdminClient().rpc(
    "offline_pendientes" as never
  );
  if (error)
    logger.warning("Pending offline changes query failed", errorInfo(error));
  const porTabla = (data ?? null) as Record<string, number> | null;

  return <OfflinePanel estado={leerEstadoOffline()} pendientes={porTabla} />;
}
