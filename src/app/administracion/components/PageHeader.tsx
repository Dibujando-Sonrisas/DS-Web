import type { ReactNode } from "react";
import styles from "@/styles/pages/admin.module.css";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** acciones a la derecha del título (botones, enlaces) */
  children?: ReactNode;
};

/** Encabezado de todas las páginas del panel: título, trazos de crayón, descripción y acciones. */
export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {description && <p className={styles.pageLead}>{description}</p>}
      </div>
      {children && <div className={styles.pageActions}>{children}</div>}
    </header>
  );
}
