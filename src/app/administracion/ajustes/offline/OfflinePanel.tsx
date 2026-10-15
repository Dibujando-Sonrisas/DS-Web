"use client";

import {
  Circle,
  CircleCheck,
  CircleMinus,
  CircleX,
  CloudUpload,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type {
  AccionOffline,
  EstadoOffline,
  EstadoPaso,
  PasoOffline,
} from "@/lib/offline";
import styles from "@/styles/pages/admin.module.css";
import aj from "@/styles/pages/admin-ajustes.module.css";
import { useToast } from "../../components/AdminToast";
import ConfirmDialog from "../../components/ConfirmDialog";
import { usePermissions } from "../../components/PermissionsProvider";
import { ejecutarOfflineAction } from "./actions";

const formatFecha = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Tegucigalpa",
});

const PASO: Record<
  EstadoPaso,
  { icono: ReactNode; etiqueta: string; badge: string }
> = {
  pendiente: {
    icono: <Circle />,
    etiqueta: "Pendiente",
    badge: styles.badgeNeutral,
  },
  en_curso: {
    icono: <LoaderCircle className="spin" />,
    etiqueta: "En curso",
    badge: styles.badgeInfo,
  },
  listo: {
    icono: <CircleCheck />,
    etiqueta: "Listo",
    badge: styles.badgeSuccess,
  },
  error: { icono: <CircleX />, etiqueta: "Error", badge: styles.badgeDanger },
  omitido: {
    icono: <CircleMinus />,
    etiqueta: "Omitido",
    badge: styles.badgeNeutral,
  },
};

/** La última ejecución del script: título del panel y el comando equivalente en la consola. */
const ULTIMA: Record<
  EstadoOffline["accion"],
  { titulo: string; comando: string }
> = {
  iniciar: { titulo: "Última preparación", comando: "npm run offline" },
  sincronizar: {
    titulo: "Última sincronización",
    comando: "npm run offline:sincronizar",
  },
  subir: { titulo: "Última subida", comando: "npm run offline:subir" },
};

const cambios = (n: number) => `${n} ${n === 1 ? "cambio" : "cambios"}`;

type OfflinePanelProps = {
  estado: EstadoOffline | null;
  /** cambios sin subir por tabla; null si no se pudo leer */
  pendientes: Record<string, number> | null;
};

/** Ajustes → Modo offline: estado del servidor, subir o volver a descargar, y los pasos de la última ejecución. */
export default function OfflinePanel({
  estado,
  pendientes,
}: OfflinePanelProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const [confirmar, setConfirmar] = useState<AccionOffline | null>(null);
  const [isPending, startTransition] = useTransition();
  const corriendo = estado?.corriendo ?? false;
  const ocupado = corriendo || isPending;
  const total = pendientes
    ? Object.values(pendientes).reduce((a, n) => a + n, 0)
    : 0;
  const ultima = estado ? ULTIMA[estado.accion] : null;

  // mientras el script trabaja, el panel se actualiza solo
  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(id);
  }, [corriendo, router]);

  const ejecutar = (accion: AccionOffline) =>
    startTransition(async () => {
      const res = await ejecutarOfflineAction(accion);
      setConfirmar(null);
      if (res.error) return showToast(res.error, "error");
      router.refresh();
    });

  return (
    <>
      <section className={styles.panel} aria-labelledby="offline-servidor">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="offline-servidor" className={styles.panelTitle}>
              Servidor de la brigada
            </h2>
            <p className={`${styles.panelSub} ${styles.muted}`}>
              Este equipo guarda los datos mientras no hay internet. Las demás
              computadoras se conectan a él por la red local.
            </p>
          </div>
          {can(PERMISSIONS.AJUSTES_UPDATE) && (
            <div className={styles.panelActions}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setConfirmar("sincronizar")}
                disabled={ocupado}
              >
                <RefreshCw aria-hidden="true" />
                Sincronizar de nuevo
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setConfirmar("subir")}
                disabled={ocupado || total === 0}
              >
                {corriendo ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <CloudUpload aria-hidden="true" />
                )}
                {corriendo ? "Trabajando..." : "Subir cambios"}
              </button>
            </div>
          )}
        </div>
        <div className={styles.panelBody}>
          {estado?.sesion ? (
            <dl className={aj.datosOffline}>
              <div>
                <dt>Al día con la base en línea desde</dt>
                <dd>
                  {formatFecha.format(new Date(estado.sesion.preparadaEn))}
                </dd>
              </div>
              <div>
                <dt>Cambios sin subir</dt>
                <dd>
                  {!pendientes
                    ? "No se pudieron contar"
                    : total === 0
                      ? "Ninguno"
                      : `${cambios(total)} en ${Object.keys(pendientes).length} ${Object.keys(pendientes).length === 1 ? "tabla" : "tablas"}`}
                </dd>
              </div>
              <div>
                <dt>Dirección para las otras computadoras</dt>
                <dd>
                  {estado.urls?.length
                    ? estado.urls.map((url) => (
                        <a key={url} href={url} className={aj.urlOffline}>
                          {url}
                        </a>
                      ))
                    : "Aparece al arrancar el servidor con npm run offline."}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="notice notice-warn" role="status">
              <TriangleAlert aria-hidden="true" />
              <span>
                Este equipo todavía no tiene los datos en línea. Ejecuta{" "}
                <code>npm run offline</code> en la consola del proyecto, con
                internet.
              </span>
            </p>
          )}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="offline-pasos">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="offline-pasos" className={styles.panelTitle}>
              {ultima?.titulo ?? "Última preparación"}
            </h2>
            <p className={`${styles.panelSub} ${styles.muted}`}>
              {estado && ultima ? (
                <>
                  Empezó el {formatFecha.format(new Date(estado.inicio))} ·
                  desde la consola: <code>{ultima.comando}</code>
                </>
              ) : (
                "Todavía no se ha preparado este equipo."
              )}
            </p>
          </div>
        </div>

        {estado?.error && !corriendo && (
          <div className={styles.panelBody}>
            <p className="notice notice-bad" role="alert">
              <TriangleAlert aria-hidden="true" />
              <span>
                <strong>No terminó:</strong> {estado.error}
              </span>
            </p>
          </div>
        )}

        {estado && (
          <ol className={aj.pasos} aria-busy={corriendo}>
            {estado.pasos.map((p) => (
              <PasoItem key={p.id} paso={p} />
            ))}
          </ol>
        )}
      </section>

      {confirmar === "subir" && (
        <ConfirmDialog
          title="¿Subir los cambios?"
          confirmLabel="Subir cambios"
          busyLabel="Iniciando..."
          tone="primary"
          busy={isPending}
          onConfirm={() => ejecutar("subir")}
          onCancel={() => setConfirmar(null)}
        >
          Se suben los <strong>{cambios(total)}</strong> hechos en este equipo,
          todo en una sola operación: si algo falla, no se sube nada. Si en
          línea cambiaron los mismos registros se combinan; si chocan en el
          mismo dato, gana lo de la brigada y lo de línea queda anotado. Si en
          línea hubo cambios, después se descargan y quienes estén conectados a
          este servidor vuelven a iniciar sesión. Necesita internet.
        </ConfirmDialog>
      )}

      {confirmar === "sincronizar" && (
        <ConfirmDialog
          title="¿Sincronizar de nuevo?"
          confirmLabel="Sincronizar"
          busyLabel="Iniciando..."
          tone="primary"
          busy={isPending}
          onConfirm={() => ejecutar("sincronizar")}
          onCancel={() => setConfirmar(null)}
        >
          {total > 0 && (
            <>
              Primero se suben los <strong>{cambios(total)}</strong> hechos en
              este equipo, combinándolos con lo de línea.{" "}
            </>
          )}
          Después se descargan otra vez todos los datos en línea y{" "}
          <strong>reemplazan los de este equipo</strong>; quienes estén
          conectados a este servidor vuelven a iniciar sesión. Necesita internet
          y tarda unos minutos.
        </ConfirmDialog>
      )}
    </>
  );
}

function PasoItem({ paso }: { paso: PasoOffline }) {
  const { icono, etiqueta, badge } = PASO[paso.estado];
  const duracion =
    paso.inicio && paso.fin ? formatDuracion(paso.inicio, paso.fin) : null;

  return (
    <li className={aj.paso} data-estado={paso.estado}>
      <span className={aj.pasoIcono} aria-hidden="true">
        {icono}
      </span>
      <div className={aj.pasoTexto}>
        <span className={aj.pasoTitulo}>{paso.titulo}</span>
        {paso.detalle && <p className={aj.pasoDetalle}>{paso.detalle}</p>}
      </div>
      <span className={aj.pasoMeta}>
        <span className={`${styles.badge} ${badge}`}>{etiqueta}</span>
        {duracion && <span>{duracion}</span>}
      </span>
    </li>
  );
}

function formatDuracion(inicio: string, fin: string) {
  const s = Math.max(
    0,
    Math.round((Date.parse(fin) - Date.parse(inicio)) / 1000)
  );
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}
