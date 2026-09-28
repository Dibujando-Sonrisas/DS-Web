import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import VoluntarioProfile from "../components/VoluntarioProfile";
import AsignacionesCard from "../components/AsignacionesCard";
import ParticipacionesTable from "../components/ParticipacionesTable";

export default async function VoluntarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.VOLUNTARIADO_READ);
  const id = (await params).id;

  const supabase = await createSupabaseServerClient();
  
  // Fetch voluntario
  const { data: voluntario, error: volError } = await supabase
    .from("perfiles")
    .select("*, especialidades:especialidad_id(id, nombre)")
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
  const mergedParticipaciones = [...(participaciones || [])];
  
  (asignaciones || []).forEach(asig => {
    const exists = mergedParticipaciones.find(p => p.brigada_id === asig.brigada_id);
    if (exists) {
      // Inyectar el área asignada en la participación existente
      (exists as any).area_asignada = asig.area_asignada;
    } else {
      // Agregar la asignación como una participación "pendiente"
      mergedParticipaciones.push({
        brigada_id: asig.brigada_id,
        perfil_id: id,
        brigada: asig.brigada as any,
        area_asignada: asig.area_asignada,
      } as any);
    }
  });

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
        <VoluntarioProfile voluntario={{
          ...voluntario,
          participaciones_voluntarios: participaciones || []
        }} />

        <AsignacionesCard 
          perfilId={id} 
          asignaciones={asignaciones || []} 
        />
      </div>

      <ParticipacionesTable 
        perfilId={id} 
        participaciones={mergedParticipaciones} 
      />
    </div>
  );
}
