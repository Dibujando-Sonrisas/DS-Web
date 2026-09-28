import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPacienteDetalle } from "@/lib/db/pacientes";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { ExpedienteClient } from "./ExpedienteClient";

export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.PACIENTES_READ);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [expediente, { data: resumen }, { data: profesionales }] = await Promise.all([
    getPacienteDetalle(id, supabase).catch(() => null),
    // estado y brigada salen de la misma vista que el listado
    supabase
      .from("v_pacientes_atendidos")
      .select("estado, brigada, tomado_por, tomado_por_mi")
      .eq("id", id)
      .limit(1)
      .maybeSingle(),
    // para corregir quién atendió la consulta
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol")
      .in("rol", ["medico", "odontologo"])
      .eq("activo", true)
      .order("nombre_completo"),
  ]);

  if (!expediente || !resumen) notFound();

  const { paciente } = expediente;
  const porRol = (rol: string) => (profesionales ?? []).filter((p) => p.rol === rol);

  return (
    <div className={styles.page}>
      <PageHeader
        title={`${paciente.nombres} ${paciente.apellidos ?? ""}`}
        description="Expediente clínico: datos del paciente, preclínica, consulta y receta."
      >
        <Link href="/administracion/pacientes" className="btn-ghost btn-sm">
          <ArrowLeft aria-hidden="true" />
          Volver a Pacientes
        </Link>
      </PageHeader>

      <ExpedienteClient
        expediente={expediente}
        brigada={resumen.brigada}
        estado={resumen.estado ?? "ingresado"}
        tomadoPor={resumen.tomado_por}
        tomadoPorMi={!!resumen.tomado_por_mi}
        medicos={porRol("medico")}
        odontologos={porRol("odontologo")}
      />
    </div>
  );
}
