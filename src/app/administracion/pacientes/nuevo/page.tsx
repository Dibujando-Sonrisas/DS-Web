import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { NuevoExpedienteClient } from "./NuevoExpedienteClient";

export default async function NuevoExpedientePage() {
  await requirePermission(PERMISSIONS.PACIENTES_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Nuevo Expediente"
        description="Digita el expediente físico llenado durante la brigada."
      />

      <NuevoExpedienteClient />
    </div>
  );
}
