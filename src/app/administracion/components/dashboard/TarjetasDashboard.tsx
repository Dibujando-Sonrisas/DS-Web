import { Activity, Boxes, Clock, HandHeart, HeartPulse, Pill, Shirt, ShoppingCart, Tent } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import StatCard from "../StatCard";

// Cada función devuelve solo las tarjetas: la grilla (.statGrid tone-rotate) está en el dashboard.

export async function AdminStats() {
  const supabase = await createSupabaseServerClient();

  // Fetch views in parallel
  const [
    { data: vol },
    { data: inv },
    { data: pac },
    { data: far },
    { data: rop },
    { data: ven },
  ] = await Promise.all([
    supabase.from("dashboard_voluntarios").select("*").maybeSingle(),
    supabase.from("dashboard_inventario").select("*").maybeSingle(),
    supabase.from("dashboard_pacientes").select("*").maybeSingle(),
    supabase.from("dashboard_farmacia").select("*").maybeSingle(),
    supabase.from("dashboard_ropa").select("*").maybeSingle(),
    supabase.from("dashboard_ventas").select("*").maybeSingle(),
  ]);

  return (
    <>
      <StatCard
        featured
        label="Voluntarios Totales"
        value={vol?.total_inscritos || 0}
        icon={<HandHeart />}
        meta={`+${vol?.nuevos_este_ano || 0} nuevos este año`}
        metaTone="ok"
      />
      <StatCard
        label="Medicamentos"
        value={inv?.total_medicamentos || 0}
        icon={<Boxes />}
        meta={`${inv?.medicamentos_stock_bajo || 0} bajo stock • ${inv?.lotes_vencidos || 0} vencidos`}
        metaTone={inv?.medicamentos_stock_bajo ? "bad" : "neutral"}
      />
      <StatCard
        label="Pacientes Atendidos"
        value={pac?.pacientes || 0}
        icon={<HeartPulse />}
        meta={`${pac?.hombres || 0} hombres • ${pac?.mujeres || 0} mujeres`}
      />
      <StatCard
        label="Farmacia: Entregas"
        value={far?.total_entregas || 0}
        icon={<Pill />}
        meta={`${far?.total_unidades_entregadas || 0} meds. entregados`}
      />
      <StatCard
        label="Ropa: Donaciones"
        value={rop?.prendas_entregadas || 0}
        icon={<Shirt />}
        meta={`${rop?.pacientes_beneficiados || 0} pacientes beneficiados`}
      />
      <StatCard
        label="Ventas Recaudadas"
        value={`L. ${Number(ven?.ingresos || 0).toLocaleString("es-HN", {
          minimumFractionDigits: 2,
        })}`}
        icon={<ShoppingCart />}
        meta={`${ven?.ventas || 0} ventas completadas`}
        metaTone="ok"
      />
    </>
  );
}

export async function ClinicoStats({
  isEnfermeria = false,
}: {
  isEnfermeria?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const [{ data: pac }, { data: inv }] = await Promise.all([
    supabase.from("dashboard_pacientes").select("*").maybeSingle(),
    supabase.from("dashboard_inventario").select("*").maybeSingle(),
  ]);

  return (
    <>
      <StatCard
        featured
        label="Pacientes Globales"
        value={pac?.pacientes || 0}
        icon={<HeartPulse />}
        meta={`${pac?.hombres || 0} hombres • ${pac?.mujeres || 0} mujeres`}
      />
      {isEnfermeria && (
        <StatCard
          label="Signos Vitales"
          value={pac?.pacientes || 0}
          icon={<Activity />}
          meta="Registrados este mes"
        />
      )}
      <StatCard
        label="Inventario Disponible"
        value={inv?.total_medicamentos || 0}
        icon={<Boxes />}
        meta="Medicamentos en catálogo"
        metaTone="ok"
      />
    </>
  );
}

export async function FarmaciaStats() {
  const supabase = await createSupabaseServerClient();
  const [{ data: far }, { data: inv }] = await Promise.all([
    supabase.from("dashboard_farmacia").select("*").maybeSingle(),
    supabase.from("dashboard_inventario").select("*").maybeSingle(),
  ]);

  return (
    <>
      <StatCard
        featured
        label="Medicamentos Entregados"
        value={far?.total_unidades_entregadas || 0}
        icon={<Pill />}
        meta={`${far?.total_entregas || 0} recetas despachadas`}
      />
      <StatCard
        label="Catálogo Inventario"
        value={inv?.total_medicamentos || 0}
        icon={<Boxes />}
        meta={`${inv?.medicamentos_stock_bajo || 0} bajo stock • ${inv?.lotes_vencidos || 0} vencidos`}
        metaTone={inv?.medicamentos_stock_bajo ? "bad" : "neutral"}
      />
    </>
  );
}

export async function VoluntarioStats() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { count } = await supabase
    .from("asignaciones_voluntarios")
    .select("*", { count: "exact", head: true })
    .eq("perfil_id", user?.id || "");

  return (
    <>
      <StatCard
        featured
        label="Mi Participación"
        value={count || 0}
        icon={<Tent />}
        meta="Brigadas asignadas"
      />
      <StatCard
        label="Horas de Voluntariado"
        value={(count || 0) * 8}
        icon={<Clock />}
        meta="Horas estimadas"
      />
    </>
  );
}
