"use client";

import InscripcionesTable, {
  type InscripcionRow,
} from "@/app/administracion/brigadas/components/InscripcionesTable";
import { useToast } from "@/app/administracion/components/AdminToast";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cambiarEstadoSolicitudGeneral } from "../actions";
import styles from "@/styles/pages/admin.module.css";

/** Solicitudes del formulario de /voluntariado: quieren ser voluntarios, sin brigada. */
export default function SolicitudesGenerales({ solicitudes }: { solicitudes: InscripcionRow[] }) {
  const { showToast } = useToast();
  const { can } = usePermissions();

  const cambiar = (estado: "aceptado" | "rechazado") => async (id: string) => {
    const res = await cambiarEstadoSolicitudGeneral(id, estado);
    if (res.error) showToast(res.error, "error");
    else showToast(estado === "aceptado" ? "Solicitud aceptada." : "Solicitud rechazada.", "success");
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelBody}>
        <InscripcionesTable
          inscripciones={solicitudes}
          onAccept={cambiar("aceptado")}
          onReject={cambiar("rechazado")}
          isReadOnly={!can(PERMISSIONS.VOLUNTARIADO_UPDATE)}
          vacio="No hay solicitudes de voluntariado general."
        />
      </div>
    </section>
  );
}
