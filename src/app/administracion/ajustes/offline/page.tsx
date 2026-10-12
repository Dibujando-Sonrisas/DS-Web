import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MODO_OFFLINE } from "@/lib/offline";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { leerEstadoOffline } from "./estado";
import OfflinePanel from "./OfflinePanel";

export default async function AjustesOfflinePage() {
  // la sección existe solo en el servidor de la brigada (npm run offline)
  if (!MODO_OFFLINE) notFound();
  await requirePermission(PERMISSIONS.AJUSTES_READ);

  // offline_pendientes la instala scripts/offline.sql solo en la base local: no está en database.types
  const { data } = await createSupabaseAdminClient().rpc("offline_pendientes" as never);
  const porTabla = (data ?? null) as Record<string, number> | null;

  return <OfflinePanel estado={leerEstadoOffline()} pendientes={porTabla} />;
}
