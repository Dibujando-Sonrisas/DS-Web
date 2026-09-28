import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
// Client component for donations management
import { DonacionesClient } from "./DonacionesClient";

export default async function DonacionesPage() {
  const ctx = await requirePermission(PERMISSIONS.DONACIONES_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Donaciones y Ropa"
        description="Gestión de ropa recibida por donantes y entregada a pacientes en brigadas."
      />

      <DonacionesClient userId={ctx?.user.id || ""} />
    </div>
  );
}
