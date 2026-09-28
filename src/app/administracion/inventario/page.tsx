import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { InventarioClient } from "./InventarioClient";

export default async function InventarioPage() {
  await requirePermission(PERMISSIONS.INVENTARIO_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Inventario Médico"
        description="Control de insumos, medicamentos y materiales utilizados en las brigadas."
      />

      <InventarioClient />
    </div>
  );
}
