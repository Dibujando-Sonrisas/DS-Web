"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Boxes,
  CircleCheck,
  HeartHandshake,
  Mail,
  Package,
  Pill,
  Sparkles,
  Tent,
  TriangleAlert,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  marcarNotificacionesVistasAction,
  obtenerNotificacionesAction,
  type Notificacion,
} from "../notificaciones/actions";
import { useCambiosEnVivo } from "@/lib/realtime";
import styles from "@/styles/pages/admin.module.css";

type Tono = "primary" | "secondary" | "tertiary";

/** Íconos específicos registrados directamente. */
const TIPOS: Record<string, { icono: ReactNode; tono: Tono }> = {
  stock_minimo: { icono: <TriangleAlert />, tono: "tertiary" },
  contacto_nuevo: { icono: <Mail />, tono: "primary" },
  usuario_nuevo: { icono: <UserPlus />, tono: "secondary" },
  brigada_actualizada: { icono: <Tent />, tono: "primary" },
  brigada_nueva: { icono: <Tent />, tono: "primary" },
};
const TIPO_GENERICO: { icono: ReactNode; tono: Tono } = { icono: <Bell />, tono: "primary" };

/** Resuelve ícono y tono de forma agnóstica según la categoría o prefijo del evento. */
function resolverIconoYTono(tipo: string): { icono: ReactNode; tono: Tono } {
  if (TIPOS[tipo]) return TIPOS[tipo];

  if (tipo.startsWith("paciente") || tipo.includes("consulta")) {
    return { icono: <UserRound />, tono: "primary" };
  }
  if (tipo.startsWith("voluntario")) {
    return { icono: <HeartHandshake />, tono: "secondary" };
  }
  if (tipo.startsWith("donacion") || tipo.startsWith("ropa")) {
    return { icono: <Package />, tono: "secondary" };
  }
  if (tipo.startsWith("farmacia") || tipo.startsWith("medicamento")) {
    return { icono: <Pill />, tono: "tertiary" };
  }
  if (tipo.startsWith("inventario") || tipo.startsWith("stock")) {
    return { icono: <Boxes />, tono: "tertiary" };
  }
  if (tipo.startsWith("actividad")) {
    return { icono: <Sparkles />, tono: "secondary" };
  }
  if (tipo.startsWith("alerta") || tipo.startsWith("error") || tipo.startsWith("critico")) {
    return { icono: <TriangleAlert />, tono: "tertiary" };
  }
  if (tipo.startsWith("exito") || tipo.startsWith("completado")) {
    return { icono: <CircleCheck />, tono: "primary" };
  }

  return TIPO_GENERICO;
}

const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 5 minutos", "ayer"... respecto al momento en que se cargó la lista. */
function hace(iso: string, ahora: number) {
  const segundos = Math.round((new Date(iso).getTime() - ahora) / 1000);
  const unidad = UNIDADES.find(([, s]) => Math.abs(segundos) >= s);
  return unidad ? relativo.format(Math.round(segundos / unidad[1]), unidad[0]) : "ahora";
}

export default function NotificacionesBtn() {
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [ahora, setAhora] = useState(0);
  const [vistas, setVistas] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = useCallback(
    () =>
      obtenerNotificacionesAction().then(
        (datos) => {
          setItems(datos);
          setAhora(Date.now());
          setVistas(false);
        },
        (e) => console.error("No se pudieron cargar las notificaciones:", e)
      ),
    []
  );

  useEffect(() => {
    cargar();
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [cargar]);

  // la RLS ya filtra qué eventos le llegan; se recarga para recalcular nuevas y alertas
  useCambiosEnVivo("notificaciones", cargar, { evento: "INSERT" });

  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const abrir = async () => {
    setOpen(true);
    await cargar();
    await marcarNotificacionesVistasAction();
    setVistas(true);
  };

  const lista = items ?? [];
  const nuevas = lista.filter((n) => n.nueva).length;
  const alertas = lista.filter((n) => n.alerta).length;
  const contador = alertas + (vistas ? 0 : nuevas);

  return (
    <div className={styles.menuWrap} ref={ref}>
      <button
        type="button"
        className={`btn-icon ${styles.notifBtn}`}
        onClick={() => (open ? setOpen(false) : abrir())}
        aria-label={contador > 0 ? `Notificaciones: ${contador} por revisar` : "Notificaciones"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
      >
        <Bell aria-hidden="true" />
        {contador > 0 && (
          <span className={styles.notifBadge} aria-hidden="true">
            {contador > 99 ? "99+" : contador}
          </span>
        )}
      </button>

      {open && (
        <div className={`${styles.dropdown} ${styles.notifPanel}`} role="dialog" aria-label="Notificaciones">
          <div className={styles.notifHead}>
            <span className={styles.notifTitle}>
              <Bell aria-hidden="true" />
              Notificaciones
            </span>
            {nuevas > 0 && (
              <span className={`${styles.badge} ${styles.badgeInfo}`}>
                {nuevas} {nuevas === 1 ? "nueva" : "nuevas"}
              </span>
            )}
          </div>

          <div className={styles.notifList}>
            {items === null ? (
              <p className={styles.notifEmpty}>Cargando notificaciones...</p>
            ) : lista.length === 0 ? (
              <div className={styles.notifEmpty}>
                <CircleCheck aria-hidden="true" />
                No tienes notificaciones
              </div>
            ) : (
              lista.map((n) => (
                <NotificacionItem key={n.id} n={n} ahora={ahora} onNavegar={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificacionItem({
  n,
  ahora,
  onNavegar,
}: {
  n: Notificacion;
  ahora: number;
  onNavegar: () => void;
}) {
  const { icono, tono } = resolverIconoYTono(n.tipo);
  const contenido = (
    <>
      <span className={`icon-circle tone-${tono} ${styles.notifIcon}`} aria-hidden="true">
        {icono}
      </span>
      <span className={styles.notifInfo}>
        <span className={styles.notifName}>{n.titulo}</span>
        {n.detalle && <span className={styles.notifMeta}>{n.detalle}</span>}
        {n.fecha && <span className={styles.notifTime}>{hace(n.fecha, ahora)}</span>}
      </span>
      {n.nueva && (
        <span className={styles.notifDot}>
          <span className="sr-only">Nueva</span>
        </span>
      )}
    </>
  );

  return n.enlace ? (
    <Link href={n.enlace} className={styles.notifItem} onClick={onNavegar}>
      {contenido}
    </Link>
  ) : (
    <div className={styles.notifItem}>{contenido}</div>
  );
}
