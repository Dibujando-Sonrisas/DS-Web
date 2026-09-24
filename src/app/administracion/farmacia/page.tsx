import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { FarmaciaClient } from "./FarmaciaClient";

export default async function FarmaciaPage() {
  const ctx = await requirePermission(PERMISSIONS.FARMACIA_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Farmacia y Entregas"
        description="Gestión de recetas pendientes y entregas de medicamentos a pacientes."
      />

      <FarmaciaClient userId={ctx?.user.id || ""} />
    </div>
  );
}
