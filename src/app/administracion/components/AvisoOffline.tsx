"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, WifiOff } from "lucide-react";
import { MODO_OFFLINE } from "@/lib/offline";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { usePermissions } from "./PermissionsProvider";
import styles from "@/styles/pages/admin.module.css";

const AJUSTES_OFFLINE = "/administracion/ajustes/offline";

type AvisoOfflineProps = {
  /** barra: tarjeta al pie de la barra lateral · encabezado: etiqueta para pantallas chicas, donde la barra es un cajón */
  lugar: "barra" | "encabezado";
  /** en móvil, cerrar el cajón al ir a Ajustes */
  alNavegar?: () => void;
};

/** Aviso de la versión offline (npm run offline); lleva a Ajustes → Modo offline a quien puede verlo. */
export default function AvisoOffline({ lugar, alNavegar }: AvisoOfflineProps) {
  const { can } = usePermissions();
  const pathname = usePathname();
  if (!MODO_OFFLINE) return null;

  const enlace = can(PERMISSIONS.AJUSTES_READ);
  const enAjustes = pathname.startsWith(AJUSTES_OFFLINE);

  if (lugar === "encabezado") {
    const contenido = (
      <>
        <WifiOff aria-hidden="true" />
        <span className="sr-only">Modo </span>Offline
      </>
    );
    return enlace ? (
      <Link href={AJUSTES_OFFLINE} className={styles.offlineChip} title="Modo offline: ver estado">
        {contenido}
      </Link>
    ) : (
      <span className={styles.offlineChip} title="Modo offline">
        {contenido}
      </span>
    );
  }

  const contenido = (
    <>
      <span className={styles.offlineIcono} aria-hidden="true">
        <WifiOff />
      </span>
      <span className={styles.offlineTexto}>
        <span className={styles.offlineTitulo}>Modo offline</span>
        <span className={styles.offlineDetalle}>Guardando en el servidor de la brigada</span>
      </span>
      {enlace && <ChevronRight className={styles.offlineFlecha} aria-hidden="true" />}
    </>
  );
  return enlace ? (
    <Link
      href={AJUSTES_OFFLINE}
      className={styles.offlineCard}
      title="Modo offline: ver estado"
      aria-current={enAjustes ? "page" : undefined}
      onClick={alNavegar}
    >
      {contenido}
    </Link>
  ) : (
    <div className={styles.offlineCard} title="Modo offline">
      {contenido}
    </div>
  );
}
