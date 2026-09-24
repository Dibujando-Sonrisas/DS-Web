import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { VentasClient } from "./VentasClient";

export default async function VentasPage() {
  const ctx = await requirePermission(PERMISSIONS.VENTAS_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Ventas de Apoyo"
        description="Gestión de inventario de recaudación, registro de ventas internas y estadísticas de ingresos."
      />

      <VentasClient userId={ctx?.user.id || ""} />
    </div>
  );
}
