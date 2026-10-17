import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/app/administracion/components/PageHeader";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import styles from "@/styles/pages/admin.module.css";
import AsignacionesCard from "../components/AsignacionesCard";
import ParticipacionesTable, {
  type ParticipacionRow,
} from "../components/ParticipacionesTable";
import VoluntarioProfile from "../components/VoluntarioProfile";

export default async function VoluntarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.VOLUNTARIADO_READ);
  const id = (await params).id;

  const supabase = await createSupabaseServerClient();

  // Fetch voluntario
  const { data: voluntario, error: volError } = await supabase
    .from("perfiles")
    .select(
      "*, rol:rol_id(id, nombre, color), especialidades:especialidad_id(id, nombre)"
    )
    .eq("id", id)
    .single();

  if (volError || !voluntario) {
    notFound();
  }

  // Fetch asignaciones
  const { data: asignaciones } = await supabase
    .from("asignaciones_voluntarios")
    .select("*, brigada:brigada_id(id, nombre)")
    .eq("perfil_id", id);

  // Fetch participaciones
  const { data: participaciones } = await supabase
    .from("participaciones_voluntarios")
    .select("*, brigada:brigada_id(id, nombre, fecha_brigada)")
    .eq("perfil_id", id)
    .order("created_at", { ascending: false });

  // Mezclar participaciones con asignaciones para la vista unificada
  const mergedParticipaciones: ParticipacionRow[] = (participaciones ?? []).map(
    (p) => ({ ...p })
  );

  for (const asig of asignaciones ?? []) {
    const exists = mergedParticipaciones.find(
      (p) => p.brigada_id === asig.brigada_id
    );
    if (exists) {
      // Inyectar el área asignada en la participación existente
      exists.area_asignada = asig.area_asignada;
    } else {
      // Agregar la asignación como una participación "pendiente"
      mergedParticipaciones.push({
        brigada_id: asig.brigada_id,
        brigada: asig.brigada,
        area_asignada: asig.area_asignada,
      });
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={voluntario.nombre_completo || "Sin Nombre Registrado"}
        description="Consulta la información institucional, edita sus áreas asignadas y revisa el registro de participaciones en brigadas."
      >
        <Link href="/administracion/voluntarios" className="btn-ghost btn-sm">
          <ArrowLeft aria-hidden="true" />
          Volver a Voluntarios
        </Link>
      </PageHeader>

      <div className={styles.grid2}>
        <VoluntarioProfile
          voluntario={{
            ...voluntario,
            participaciones_voluntarios: participaciones || [],
          }}
        />

        <AsignacionesCard perfilId={id} asignaciones={asignaciones || []} />
      </div>

      <ParticipacionesTable
        perfilId={id}
        participaciones={mergedParticipaciones}
      />
    </div>
  );
}
