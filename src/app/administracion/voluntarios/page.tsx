import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { InscripcionRow } from "@/app/administracion/brigadas/components/InscripcionesTable";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { obtenerVoluntarios } from "./actions";
import VoluntariosTable from "./components/VoluntariosTable";
import VolunteerStatsCards from "./components/VolunteerStatsCards";
import SolicitudesGenerales from "./components/SolicitudesGenerales";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default async function VoluntariosPage() {
  await requirePermission(PERMISSIONS.VOLUNTARIADO_READ);
  
  const supabase = await createSupabaseServerClient();
  const [voluntarios, { data: solicitudes, error }] = await Promise.all([
    obtenerVoluntarios(),
    // las de una brigada se gestionan en Brigadas
    supabase
      .from("inscripciones_voluntarios")
      .select("*")
      .is("brigada_id", null)
      .order("created_at", { ascending: false }),
  ]);
  if (error) console.error("Error al cargar las solicitudes de voluntariado:", error.message);

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

      <SolicitudesGenerales solicitudes={(solicitudes ?? []) as InscripcionRow[]} />

      <VoluntariosTable voluntarios={voluntarios as any[]} />
    </div>
  );
}
