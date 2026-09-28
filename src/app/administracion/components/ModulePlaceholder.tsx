import { Hammer } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

export default function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className={`${styles.placeholder} tone-secondary`}>
      <div className="icon-circle" aria-hidden="true">
        <Hammer />
      </div>
      <h1>{title}</h1>
      <div className="crayons" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>
        {description ??
          "Este módulo estará disponible próximamente. Por ahora puedes navegar desde el menú lateral."}
      </p>
      <span className={`${styles.badge} ${styles.badgeBrand}`}>Próximamente</span>
    </div>
  );
}
