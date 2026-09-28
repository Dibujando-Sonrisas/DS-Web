import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { ActividadesClient } from "./ActividadesClient";

export default async function ActividadesPage() {
  const ctx = await requirePermission(PERMISSIONS.ACTIVIDADES_READ);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Actividades Infantiles"
        description="Gestión de actividades, entrega de regalos y control de niños beneficiados."
      />

      <ActividadesClient userId={ctx?.user.id || ""} />
    </div>
  );
}
