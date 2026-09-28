import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import EspecialidadesTable from "../components/EspecialidadesTable";

export default async function EspecialidadesPage() {
  await requirePermission(PERMISSIONS.VOLUNTARIADO_READ);

  const supabase = await createSupabaseServerClient();
  const { data: especialidades, error } = await supabase
    .from("especialidades")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader title="Gestión de Especialidades" />
        <p className="notice notice-bad" role="alert">
          <TriangleAlert aria-hidden="true" />
          Error cargando especialidades: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestión de Especialidades"
        description="Administra el catálogo de especialidades que pueden ser asignadas a los voluntarios de la organización. Las especialidades no se pueden eliminar para preservar el historial, pero puedes desactivarlas."
      >
        <Link href="/administracion/voluntarios" className="btn-ghost btn-sm">
          <ArrowLeft aria-hidden="true" />
          Volver a Voluntarios
        </Link>
      </PageHeader>

      <EspecialidadesTable initialSpecialties={(especialidades as any) || []} />
    </div>
  );
}
