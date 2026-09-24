"use client";

import { useState, useTransition } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

export type InscripcionRow = {
  id: string;
  brigada_id: string;
  nombre_completo: string;
  correo: string;
  telefono: string;
  area_interes: string;
  estado: "pendiente" | "aceptado" | "rechazado";
  created_at: string;
  updated_at?: string;
};

export type PerfilMini = {
  id: string;
  nombre_completo: string | null;
};

type InscripcionesTableProps = {
  inscripciones: InscripcionRow[];
  profiles: PerfilMini[];
  assignments: Record<string, string>; // perfil_id -> area_asignada
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onAssign: (perfilId: string, area: string | null) => Promise<void>;
  isReadOnly?: boolean;
};

const AREAS_MAP: Record<string, string> = {
  registro: "Registro",
  preclinica: "Preclínica",
  consulta_medica: "Consulta Médica",
  consulta_odontologica: "Consulta Odontológica",
  farmacia: "Farmacia",
  postclinica: "Postclínica",
  ropa: "Donaciones / Ropa",
  actividades: "Actividades Infantiles",
  logistica: "Logística",
  coordinacion: "Coordinación",
};

const STATE_LABELS = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

const STATE_CLASSES = {
  pendiente: styles.badgeWarning,
  aceptado: styles.badgeSuccess,
  rechazado: styles.badgeDanger,
};

export default function InscripcionesTable({
  inscripciones,
  profiles,
  assignments,
  onAccept,
  onReject,
  onAssign,
  isReadOnly = false,
}: InscripcionesTableProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<InscripcionRow | null>(null);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleAccept = (id: string) => {
    startTransition(async () => {
      await onAccept(id);
    });
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    startTransition(async () => {
      await onReject(rejectTarget.id);
      setRejectTarget(null);
    });
  };

  const handleAssignChange = (perfilId: string, area: string) => {
    startTransition(async () => {
      await onAssign(perfilId, area === "none" ? null : area);
    });
  };

  return (
    <section className={styles.stackSm}>
      <h3 className={styles.subTitle}>
        Solicitudes de Voluntariado <span className={styles.count}>{inscripciones.length}</span>
      </h3>

      <div className={`${styles.tableWrap} ${brig.bleed}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Voluntario</th>
              <th>Contacto</th>
              <th>Área de Interés</th>
              <th>Fecha Solicitud</th>
              <th>Estado</th>
              <th>Asignación Rápida</th>
              {!isReadOnly && <th className={styles.num}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {inscripciones.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 6 : 7} className={styles.emptyCell}>
                  No hay solicitudes registradas para esta brigada.
                </td>
              </tr>
            ) : (
              inscripciones.map((ins) => {
                // Find profile matching names (since emails are only in auth.users)
                const matchingProfile = profiles.find((p) => {
                  const fullName = (p.nombre_completo || "").trim().toLowerCase();
                  return fullName === ins.nombre_completo.trim().toLowerCase();
                });

                const assignedArea = matchingProfile ? assignments[matchingProfile.id] || "none" : "none";

                return (
                  <tr key={ins.id}>
                    <td className={styles.cellMain}>{ins.nombre_completo}</td>
                    <td>
                      {ins.correo}
                      <span className={styles.cellSub}>{ins.telefono}</span>
                    </td>
                    <td>{ins.area_interes}</td>
                    <td className={styles.nowrap}>{formatDate(ins.created_at)}</td>
                    <td>
                      <span className={`${styles.badge} ${STATE_CLASSES[ins.estado]}`}>
                        {STATE_LABELS[ins.estado]}
                      </span>
                    </td>
                    <td>
                      {ins.estado === "aceptado" ? (
                        matchingProfile ? (
                          <select
                            className={`form-input form-input-sm ${brig.areaSelect}`}
                            aria-label={`Área asignada a ${ins.nombre_completo}`}
                            value={assignedArea}
                            onChange={(e) => handleAssignChange(matchingProfile.id, e.target.value)}
                            disabled={isPending || isReadOnly}
                          >
                            <option value="none">Sin asignar</option>
                            {Object.entries(AREAS_MAP).map(([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={brig.cellWarn}>
                            <TriangleAlert aria-hidden="true" />
                            Sin perfil registrado. Solicitar registro en la app.
                          </span>
                        )
                      ) : (
                        <span className={styles.muted}>Debe ser aceptado primero.</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td>
                        <div className={styles.rowActions}>
                          {ins.estado === "pendiente" ? (
                            <>
                              <button
                                type="button"
                                className="btn-primary btn-xs"
                                onClick={() => handleAccept(ins.id)}
                                disabled={isPending}
                              >
                                <Check aria-hidden="true" />
                                Aceptar
                              </button>
                              <button
                                type="button"
                                className="btn-ghost btn-xs"
                                onClick={() => setRejectTarget(ins)}
                                disabled={isPending}
                              >
                                <X aria-hidden="true" />
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rejectTarget && (
        <ConfirmDialog
          title="¿Rechazar solicitud?"
          confirmLabel="Sí, rechazar"
          busyLabel="Rechazando..."
          busy={isPending}
          onCancel={() => setRejectTarget(null)}
          onConfirm={confirmReject}
        >
          ¿Estás seguro de que deseas rechazar la solicitud de{" "}
          <strong>{rejectTarget.nombre_completo}</strong>?
        </ConfirmDialog>
      )}
    </section>
  );
}
