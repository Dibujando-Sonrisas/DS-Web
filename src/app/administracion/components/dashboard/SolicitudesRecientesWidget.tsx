import Link from "next/link";
import { ArrowRight, Check, UsersRound, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SolicitudesWidgetClient from "./SolicitudesWidgetClient";
import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";

export default async function SolicitudesRecientesWidget() {
  const supabase = await createSupabaseServerClient();

  // 1. Obtener la brigada activa programada (no finalizada y no cancelada)
  const { data: brigadas } = await supabase
    .from("brigadas")
    .select("id, nombre, codigo, lugar, fecha_brigada, estado")
    .neq("estado", "finalizada")
    .neq("estado", "cancelada")
    .order("fecha_brigada", { ascending: true })
    .limit(1);

  const activeBrigada = brigadas?.[0] ?? null;

  // Si no hay brigada activa, no mostrar el widget de recepción
  if (!activeBrigada) {
    return null;
  }

  // 2. Obtener solicitudes de inscripción para esta brigada activa
  const { data: solicitudes, error } = await supabase
    .from("inscripciones_voluntarios")
    .select("*")
    .eq("brigada_id", activeBrigada.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching volunteer registrations:", error.message);
  }

  const list = (solicitudes as any[]) ?? [];
  const pendientesCount = list.filter((s) => s.estado === "pendiente").length;

  return (
    <section className={styles.panel} aria-labelledby="solicitudes-recientes">
      <div className={styles.panelHeader}>
        <div className={dash.widgetHead}>
          <div className="icon-circle icon-circle-sm" aria-hidden="true">
            <UsersRound />
          </div>
          <div>
            <h2 id="solicitudes-recientes" className={styles.panelTitle}>
              Solicitudes de Inscripción Recibidas
            </h2>
            <p className={styles.panelSub}>
              Brigada Activa: <strong>{activeBrigada.nombre}</strong> ({activeBrigada.lugar})
            </p>
          </div>
        </div>

        <div className={styles.panelActions}>
          {pendientesCount > 0 ? (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              <Zap aria-hidden="true" />
              {pendientesCount} {pendientesCount === 1 ? "pendiente" : "pendientes"}
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              <Check aria-hidden="true" />
              Al día
            </span>
          )}

          <Link href="/administracion/brigadas" className="btn-ghost btn-sm">
            Ver todas en Brigadas
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Lista / Tabla de solicitudes con acciones interactivas */}
      <SolicitudesWidgetClient
        initialSolicitudes={list}
        brigadaId={activeBrigada.id}
      />
    </section>
  );
}
