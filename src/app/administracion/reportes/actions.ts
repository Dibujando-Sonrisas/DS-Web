"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getDashboardStatsAction() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: pac },
    { data: vol },
    { data: ven },
    { data: atencionesAnuales },
  ] = await Promise.all([
    supabase.from("dashboard_pacientes").select("*").maybeSingle(),
    supabase.from("dashboard_voluntarios").select("*").maybeSingle(),
    supabase.from("dashboard_ventas").select("*").maybeSingle(),
    supabase
      .from("v_resumen_brigadas_anual")
      .select("*")
      .order("anio", { ascending: true }),
  ]);

  return {
    pacientesAtendidos: pac?.pacientes || 0,
    brigadas:
      atencionesAnuales?.reduce(
        (acc, curr) => acc + (curr.total_brigadas || 0),
        0
      ) || 0,
    voluntarios: vol?.total_inscritos || 0,
    fondos: Number(ven?.ingresos || 0),
    atencionesAnuales: atencionesAnuales || [],
  };
}
