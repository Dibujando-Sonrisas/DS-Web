import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { NuevoExpedienteClient } from "./NuevoExpedienteClient";

export default async function NuevoExpedientePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePermission(PERMISSIONS.PACIENTES_READ);
  // ?paciente=<id>: otro usuario continúa un expediente ya ingresado
  const { paciente } = await searchParams;
  const pacienteId = typeof paciente === "string" ? paciente : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        title={pacienteId ? "Continuar Expediente" : "Nuevo Expediente"}
        description={
          pacienteId
            ? "Completa la etapa pendiente del expediente del paciente."
            : "Digita el expediente físico llenado durante la brigada."
        }
      />

      {/* key: al pasar de un expediente a otro el formulario empieza de cero */}
      <NuevoExpedienteClient key={pacienteId ?? "nuevo"} pacienteId={pacienteId} />
    </div>
  );
}
