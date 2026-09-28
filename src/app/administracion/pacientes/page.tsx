import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { PacientesClient } from "./PacientesClient";

export default async function PacientesPage() {
  await requirePermission(PERMISSIONS.PACIENTES_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Atención de Pacientes"
        description="Expediente digital y registro de atenciones durante las brigadas."
      />

      <PacientesClient />
    </div>
  );
}
