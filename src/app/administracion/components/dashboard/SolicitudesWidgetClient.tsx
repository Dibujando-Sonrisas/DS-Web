"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Phone, X } from "lucide-react";
import { aceptarInscripcion, rechazarInscripcion } from "@/app/administracion/brigadas/actions";
import ConfirmDialog from "../ConfirmDialog";
import EmptyState from "../EmptyState";
import styles from "@/styles/pages/admin.module.css";

export type SolicitudItem = {
  id: string;
  brigada_id: string;
  nombre_completo: string;
  correo: string;
  telefono: string | null;
  area_interes: string | null;
  profesion: string | null;
  comentarios: string | null;
  estado: "pendiente" | "aceptado" | "rechazado" | string | null;
  created_at: string | null;
};

type SolicitudesWidgetClientProps = {
  initialSolicitudes: SolicitudItem[];
  brigadaId: string;
};

export default function SolicitudesWidgetClient({
  initialSolicitudes,
}: SolicitudesWidgetClientProps) {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>(initialSolicitudes);
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  // solicitud que espera confirmación antes de rechazarse
  const [rejectTarget, setRejectTarget] = useState<SolicitudItem | null>(null);

  const handleAccept = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      // Optimistic update
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: "aceptado" } : s))
      );

      const res = await aceptarInscripcion(id);
      if (res?.error) {
        alert(`Error al aceptar: ${res.error}`);
        router.refresh();
      }
      setProcessingId(null);
    });
  };

  const handleReject = (id: string) => {
    setRejectTarget(null);
    setProcessingId(id);
    startTransition(async () => {
      // Optimistic update
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: "rechazado" } : s))
      );

      const res = await rechazarInscripcion(id);
      if (res?.error) {
        alert(`Error al rechazar: ${res.error}`);
        router.refresh();
      }
      setProcessingId(null);
    });
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (solicitudes.length === 0) {
    return (
      <EmptyState icon={<Inbox />} title="Sin solicitudes todavía">
        No hay solicitudes de voluntariado registradas aún para esta brigada.
      </EmptyState>
    );
  }

  const ESTADO_CLASSES: Record<string, string> = {
    aceptado: styles.badgeSuccess,
    rechazado: styles.badgeDanger,
  };

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Voluntario</th>
              <th>Contacto</th>
              <th>Área de Interés</th>
              <th>Fecha Envío</th>
              <th>Estado</th>
              <th className={styles.num}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((sol) => {
              const isItemPending = isPending && processingId === sol.id;
              const estadoStr = sol.estado || "pendiente";

              return (
                <tr key={sol.id}>
                  <td>
                    <span className={styles.cellMain}>{sol.nombre_completo}</span>
                    {sol.profesion && <span className={styles.cellSub}>{sol.profesion}</span>}
                  </td>
                  <td>
                    {sol.correo}
                    {sol.telefono && (
                      <span className={styles.cellSub}>
                        <Phone size={12} aria-hidden="true" /> {sol.telefono}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                      {sol.area_interes || "Sin área"}
                    </span>
                  </td>
                  <td className={styles.nowrap}>{formatDate(sol.created_at)}</td>
                  <td>
                    <span className={`${styles.badge} ${ESTADO_CLASSES[estadoStr] ?? styles.badgeWarning}`}>
                      {estadoStr.charAt(0).toUpperCase() + estadoStr.slice(1)}
                    </span>
                  </td>
                  <td>
                    {estadoStr === "pendiente" ? (
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn-primary btn-xs"
                          onClick={() => handleAccept(sol.id)}
                          disabled={isItemPending}
                        >
                          <Check aria-hidden="true" />
                          Aceptar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-xs"
                          onClick={() => setRejectTarget(sol)}
                          disabled={isItemPending}
                        >
                          <X aria-hidden="true" />
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <div className={`${styles.rowActions} ${styles.muted}`}>Revisado</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rejectTarget && (
        <ConfirmDialog
          title="¿Rechazar solicitud?"
          confirmLabel="Sí, rechazar"
          onConfirm={() => handleReject(rejectTarget.id)}
          onCancel={() => setRejectTarget(null)}
        >
          ¿Estás seguro de que deseas rechazar la solicitud de inscripción de{" "}
          <strong>{rejectTarget.nombre_completo}</strong>?
        </ConfirmDialog>
      )}
    </>
  );
}
