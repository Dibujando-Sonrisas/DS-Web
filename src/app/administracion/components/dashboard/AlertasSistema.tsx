import { CircleCheck, TriangleAlert } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EmptyState from "../EmptyState";

export default async function AlertasSistema() {
  const supabase = await createSupabaseServerClient();
  const { data: alertas } = await supabase
    .from("v_alertas_sistema")
    .select("*");

  const hayAlertas = !!alertas && alertas.length > 0;

  return (
    <section className={styles.panel} aria-labelledby="alertas-sistema">
      <div className={styles.panelHeader}>
        <h2 id="alertas-sistema" className={styles.panelTitle}>
          Alertas del Sistema
        </h2>
        <span className={`${styles.badge} ${hayAlertas ? styles.badgeWarning : styles.badgeSuccess}`}>
          {alertas?.length || 0} activas
        </span>
      </div>

      {!hayAlertas ? (
        <EmptyState icon={<CircleCheck />} title="Todo en orden">
          No hay advertencias activas en inventario ni citas.
        </EmptyState>
      ) : (
        <ul className={dash.alertList}>
          {alertas.map((alerta: any, i: number) => (
            <li key={i} className={dash.alertItem}>
              <TriangleAlert aria-hidden="true" />
              <div>
                <p className={dash.alertTitle}>{alerta.mensaje}</p>
                <p className={dash.alertText}>{alerta.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
