import PageHeader from "@/app/administracion/components/PageHeader";
import { requireRouteAccess } from "@/lib/auth/session";
import type { Tables } from "@/lib/database.types";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import styles from "@/styles/pages/admin.module.css";
import BrigadasAdminClient from "./BrigadasAdminClient";
import type { GastoRow } from "./components/GastosTable";
import type { InscripcionRow } from "./components/InscripcionesTable";

const logger = getLogger("brigadas");

function toExpense(row: Tables<"gastos_brigada">): GastoRow {
  return {
    ...row,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

function toRegistration(
  row: Tables<"inscripciones_voluntarios">
): InscripcionRow {
  return {
    ...row,
    telefono: row.telefono ?? "",
    area_interes: row.area_interes ?? "",
    estado: row.estado ?? "pendiente",
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? undefined,
  };
}

export default async function BrigadasPage({
  searchParams,
}: {
  searchParams: Promise<{ brigada?: string | string[] }>;
}) {
  await requireRouteAccess("/administracion/brigadas");
  // ?brigada=<id> abre esa brigada (enlace desde la búsqueda)
  const { brigada } = await searchParams;
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
    supabase
      .from("brigadas")
      .select("*")
      .order("fecha_brigada", { ascending: false }),
    supabase.from("presupuestos_brigada").select("*"),
    supabase
      .from("gastos_brigada")
      .select("*")
      .order("fecha_gasto", { ascending: false }),
    supabase
      .from("inscripciones_voluntarios")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("asignaciones_voluntarios").select("*"),
    supabase
      .from("perfiles")
      .select(
        "*, rol:rol_id(nombre), especialidades:especialidad_id(id, nombre)"
      )
      .order("nombre_completo", { ascending: true }),
    supabase
      .from("brigada_imagenes")
      .select("*")
      .order("orden", { ascending: true }),
  ]);

  if (bError) {
    logger.error("Brigades page load failed", errorInfo(bError));
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gestión de Brigadas"
        description="Planifica brigadas médicas, administra presupuestos y gastos, autoriza solicitudes de voluntariado y sube fotografías del evento."
      />

      <BrigadasAdminClient
        initialBrigadas={brigadas ?? []}
        initialBudgets={budgets ?? []}
        initialExpenses={(expenses ?? []).map(toExpense)}
        initialRegistrations={(registrations ?? []).map(toRegistration)}
        initialAssignments={assignments ?? []}
        initialProfiles={profiles ?? []}
        initialImages={images ?? []}
        fetchError={bError?.message ?? null}
        initialSelectedId={typeof brigada === "string" ? brigada : null}
      />
    </div>
  );
}
