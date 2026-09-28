import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { obtenerVoluntarios } from "./actions";
import VoluntariosTable from "./components/VoluntariosTable";
import VolunteerStatsCards from "./components/VolunteerStatsCards";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default async function VoluntariosPage() {
  await requirePermission(PERMISSIONS.VOLUNTARIADO_READ);
  
  const voluntarios = await obtenerVoluntarios();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestión de Voluntarios"
        description="Listado general y métricas de todos los voluntarios registrados en Dibujando Sonrisas. Visualiza y administra sus participaciones y asignaciones en brigadas."
      >
        <Link href="/administracion/voluntarios/especialidades" className="btn-ghost btn-sm">
          <Stethoscope aria-hidden="true" />
          Gestionar Especialidades
        </Link>
      </PageHeader>

      <VolunteerStatsCards voluntarios={voluntarios as any[]} />
      
      <VoluntariosTable voluntarios={voluntarios as any[]} />
    </div>
  );
}
