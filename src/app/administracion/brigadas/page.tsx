import { requireRouteAccess } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import BrigadasAdminClient from "./BrigadasAdminClient";

export default async function BrigadasPage() {
  await requireRouteAccess("/administracion/brigadas");
  const supabase = await createSupabaseServerClient();

  // Load all required data in parallel using Promise.all
  const [
    { data: brigadas, error: bError },
    { data: budgets },
    { data: expenses },
    { data: registrations },
    { data: assignments },
    { data: profiles },
    { data: images },
  ] = await Promise.all([
    supabase.from("brigadas").select("*").order("fecha_brigada", { ascending: false }),
    supabase.from("presupuestos_brigada").select("*"),
    supabase.from("gastos_brigada").select("*").order("fecha_gasto", { ascending: false }),
    supabase.from("inscripciones_voluntarios").select("*").order("created_at", { ascending: false }),
    supabase.from("asignaciones_voluntarios").select("*"),
    supabase.from("perfiles").select("*, especialidades:especialidad_id(id, nombre)").order("nombre_completo", { ascending: true }),
    supabase.from("brigada_imagenes").select("*").order("orden", { ascending: true }),
  ]);

  if (bError) {
    console.error("Error fetching brigades data:", bError.message);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestión de Brigadas"
        description="Planifica brigadas médicas, administra presupuestos y gastos, autoriza solicitudes de voluntariado y sube fotografías del evento."
      />

      <BrigadasAdminClient
        initialBrigadas={(brigadas as any) ?? []}
        initialBudgets={(budgets as any) ?? []}
        initialExpenses={(expenses as any) ?? []}
        initialRegistrations={(registrations as any) ?? []}
        initialAssignments={(assignments as any) ?? []}
        initialProfiles={(profiles as any) ?? []}
        initialImages={(images as any) ?? []}
        fetchError={bError?.message ?? null}
      />
    </div>
  );
}
