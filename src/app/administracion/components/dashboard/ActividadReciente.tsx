import { History } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EmptyState from "../EmptyState";

export default async function ActividadReciente() {
  const supabase = await createSupabaseServerClient();
  const { data: actividad } = await supabase
    .from("v_actividad_reciente")
    .select("*");

  return (
    <section className={styles.panel} aria-labelledby="actividad-reciente">
      <div className={styles.panelHeader}>
        <h2 id="actividad-reciente" className={styles.panelTitle}>
          Actividad Reciente
        </h2>
      </div>

      {!actividad || actividad.length === 0 ? (
        <EmptyState icon={<History />} title="No hay actividad reciente registrada." />
      ) : (
        <ul className={`${dash.feed} tone-rotate`}>
          {actividad.map((act: any, i: number) => {
            const date = new Date(act.created_at);
            return (
              <li key={i} className={dash.feedItem}>
                <span className={dash.feedDot} aria-hidden="true" />
                <div>
                  <p className={dash.feedTitle}>{act.tipo}</p>
                  <p className={dash.feedText}>{act.descripcion}</p>
                  <time className={dash.feedTime} dateTime={act.created_at}>
                    {date.toLocaleDateString("es-HN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
