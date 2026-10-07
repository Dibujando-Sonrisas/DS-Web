import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import aj from "@/styles/pages/admin-ajustes.module.css";
import AjustesNav from "./AjustesNav";

/** Marco de Ajustes: menú de secciones a la izquierda y la sección abierta a la derecha. */
export default function AjustesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <PageHeader title="Ajustes" description="Configuración general del panel y del sitio web." />

      <div className={aj.layout}>
        <AjustesNav />
        <div className={styles.stack}>{children}</div>
      </div>
    </div>
  );
}
