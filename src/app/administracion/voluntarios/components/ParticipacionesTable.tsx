"use client";

import { useState } from "react";
import { CircleAlert, LoaderCircle, Pencil } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import { registrarParticipacion, actualizarParticipacion } from "../actions";

type ParticipacionRow = {
  id?: string; // Si no tiene ID, es que no se ha registrado participación aún (solo asignación)
  brigada_id: string;
  perfil_id: string;
  brigada?: {
    id: string;
    nombre: string;
    fecha_brigada: string;
  };
  hora_llegada?: string | null;
  hora_salida?: string | null;
  asistencia?: boolean;
  observaciones?: string | null;
};

type ParticipacionesTableProps = {
  perfilId: string;
  participaciones: ParticipacionRow[];
};

export default function ParticipacionesTable({ perfilId, participaciones }: ParticipacionesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [horaLlegada, setHoraLlegada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [asistencia, setAsistencia] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const handleEdit = (p: ParticipacionRow) => {
    setEditingId(p.brigada_id);
    setHoraLlegada(p.hora_llegada || "");
    setHoraSalida(p.hora_salida || "");
    setAsistencia(p.asistencia ?? false);
    setObservaciones(p.observaciones || "");
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSave = async (p: ParticipacionRow) => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        hora_llegada: horaLlegada || null,
        hora_salida: horaSalida || null,
        asistencia,
        observaciones: observaciones || null,
      };

      if (p.id) {
        // Update existing participation
        const res = await actualizarParticipacion(p.id, data, perfilId);
        if (res.error) throw new Error(res.error);
      } else {
        // Insert new participation
        const res = await registrarParticipacion({
          brigada_id: p.brigada_id,
          perfil_id: perfilId,
          ...data,
        });
        if (res.error) throw new Error(res.error);
      }
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || "Error al guardar participación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="historial-participaciones">
      <div className={styles.panelHeader}>
        <h2 id="historial-participaciones" className={styles.panelTitle}>
          Historial y Participaciones <span className={styles.count}>{participaciones.length}</span>
        </h2>
      </div>

      {error && (
        <div className={styles.panelBody}>
          <p className="notice notice-bad" role="alert">
            <CircleAlert aria-hidden="true" />
            <span>
              <strong>Error: </strong> {error}
            </span>
          </p>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Brigada</th>
              <th>Fecha</th>
              <th>Área Asignada</th>
              <th>Llegada</th>
              <th>Salida</th>
              <th>Asistencia</th>
              <th className={styles.num}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {participaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  No se registran participaciones ni asignaciones a brigadas.
                </td>
              </tr>
            ) : (
              participaciones.map(p => {
                const isEditing = editingId === p.brigada_id;
                const brigadaNombre = p.brigada?.nombre || `ID: ${p.brigada_id.substring(0,8)}...`;
                const asistenciaClass = p.asistencia
                  ? styles.badgeSuccess
                  : p.id
                  ? styles.badgeDanger
                  : styles.badgeWarning;

                return (
                  <tr key={p.brigada_id}>
                    <td className={styles.cellMain}>{brigadaNombre}</td>
                    <td className={styles.nowrap}>
                      {p.brigada?.fecha_brigada ? new Date(p.brigada.fecha_brigada).toLocaleDateString() : "N/A"}
                    </td>
                    <td>
                      {/* El área asignada viene de la tarjeta de asignaciones pero la mostraremos si la pasamos */}
                      {(p as any).area_asignada || <span className={styles.muted}>Sin asignar</span>}
                    </td>
                    <td className={styles.nowrap}>
                      {isEditing ? (
                        <label>
                          <span className="sr-only">Hora de llegada en {brigadaNombre}</span>
                          <input 
                            type="time" 
                            className="form-input form-input-sm"
                            value={horaLlegada} 
                            onChange={e => setHoraLlegada(e.target.value)} 
                          />
                        </label>
                      ) : (
                        p.hora_llegada || "--:--"
                      )}
                    </td>
                    <td className={styles.nowrap}>
                      {isEditing ? (
                        <label>
                          <span className="sr-only">Hora de salida en {brigadaNombre}</span>
                          <input 
                            type="time" 
                            className="form-input form-input-sm"
                            value={horaSalida} 
                            onChange={e => setHoraSalida(e.target.value)} 
                          />
                        </label>
                      ) : (
                        p.hora_salida || "--:--"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <label className="form-check">
                          <input 
                            type="checkbox" 
                            checked={asistencia}
                            onChange={e => setAsistencia(e.target.checked)}
                          />
                          Asistió
                        </label>
                      ) : (
                        <span className={`${styles.badge} ${asistenciaClass}`}>
                          {p.asistencia ? "Sí" : (p.id ? "No" : "Pendiente")}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {isEditing ? (
                          <>
                            <button 
                              type="button"
                              className="btn-primary btn-xs"
                              onClick={() => handleSave(p)}
                              disabled={loading}
                            >
                              {loading && <LoaderCircle className="spin" aria-hidden="true" />}
                              Guardar
                            </button>
                            <button 
                              type="button"
                              className="btn-ghost btn-xs"
                              onClick={handleCancel}
                              disabled={loading}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button 
                            type="button"
                            className="btn-ghost btn-xs"
                            onClick={() => handleEdit(p)}
                            aria-label={`Editar participación en ${brigadaNombre}`}
                          >
                            <Pencil aria-hidden="true" />
                            Editar Participación
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
