import { Stethoscope } from "lucide-react";
import Link from "next/link";
import type { InscripcionRow } from "@/app/administracion/brigadas/components/InscripcionesTable";
import PageHeader from "@/app/administracion/components/PageHeader";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import styles from "@/styles/pages/admin.module.css";
import { obtenerVoluntarios } from "./actions";
import SolicitudesGenerales from "./components/SolicitudesGenerales";
import VoluntariosTable from "./components/VoluntariosTable";
import VolunteerStatsCards from "./components/VolunteerStatsCards";

const logger = getLogger("voluntarios");

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
  if (error) logger.error("Volunteer requests load failed", errorInfo(error));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestión de Voluntarios"
        description="Listado general y métricas de todos los voluntarios registrados en Dibujando Sonrisas. Visualiza y administra sus participaciones y asignaciones en brigadas."
      >
        <Link
          href="/administracion/voluntarios/especialidades"
          className="btn-ghost btn-sm"
        >
          <Stethoscope aria-hidden="true" />
          Gestionar Especialidades
        </Link>
      </PageHeader>

      <VolunteerStatsCards voluntarios={voluntarios} />

      <SolicitudesGenerales
        solicitudes={(solicitudes ?? []) as InscripcionRow[]}
      />

      <VoluntariosTable voluntarios={voluntarios} />
    </div>
  );
}
