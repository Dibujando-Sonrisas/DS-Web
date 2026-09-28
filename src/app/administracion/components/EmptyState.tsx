import type { ReactNode } from "react";
import styles from "@/styles/pages/admin.module.css";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  /** qué hacer a continuación */
  children?: ReactNode;
  /** botón o enlace para empezar */
  action?: ReactNode;
  /** fuera de un panel: borde punteado */
  dashed?: boolean;
};

/** Estado vacío: ícono, título, qué hacer y una acción opcional. */
export default function EmptyState({ icon, title, children, action, dashed = false }: EmptyStateProps) {
  return (
    <div className={`${styles.empty} ${dashed ? styles.emptyDashed : ""}`}>
      <span className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  );
}
