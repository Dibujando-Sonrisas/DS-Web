"use client";

import { useState } from "react";
import { CircleAlert, ClipboardList, LoaderCircle, Pencil } from "lucide-react";
import EmptyState from "@/app/administracion/components/EmptyState";
import styles from "@/styles/pages/admin.module.css";
import { actualizarAsignacion } from "../actions";

type AsignacionRow = {
  id: string;
  brigada_id: string;
  area_asignada: string | null;
  brigada?: {
    id: string;
    nombre: string;
  };
};

type AsignacionesCardProps = {
  perfilId: string;
  asignaciones: AsignacionRow[];
};

export default function AsignacionesCard({ perfilId, asignaciones }: AsignacionesCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (asig: AsignacionRow) => {
    setEditingId(asig.id);
    setArea(asig.area_asignada || "");
    setError(null);
  };

  const handleSave = async (asigId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await actualizarAsignacion(asigId, area, perfilId);
      if (res.error) throw new Error(res.error);
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || "Error al actualizar asignación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="areas-asignadas">
      <div className={styles.panelHeader}>
        <h2 id="areas-asignadas" className={styles.panelTitle}>
          Áreas Asignadas <span className={styles.count}>{asignaciones.length}</span>
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

      {asignaciones.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No tiene asignaciones en brigadas pendientes." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Brigada</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map(asig => {
                const isEditing = editingId === asig.id;
                const brigadaNombre = asig.brigada?.nombre || `Brigada ID: ${asig.brigada_id.substring(0,8)}...`;
                return (
                  <tr key={asig.id}>
                    <td>
                      <span className={styles.cellMain}>{brigadaNombre}</span>
                      {isEditing ? (
                        <label className={styles.cellSub}>
                          <span className="sr-only">Área asignada en {brigadaNombre}</span>
                          <input 
                            type="text" 
                            className="form-input form-input-sm"
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            placeholder="Ej. Triage, Farmacia..."
                          />
                        </label>
                      ) : (
                        <span className={styles.cellSub}>
                          <strong>Área:</strong> {asig.area_asignada || "Sin área específica"}
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
                              onClick={() => handleSave(asig.id)}
                              disabled={loading}
                            >
                              {loading && <LoaderCircle className="spin" aria-hidden="true" />}
                              Guardar
                            </button>
                            <button 
                              type="button"
                              className="btn-ghost btn-xs"
                              onClick={() => setEditingId(null)}
                              disabled={loading}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button 
                            type="button"
                            className="btn-ghost btn-xs"
                            onClick={() => handleEdit(asig)}
                            aria-label={`Cambiar área en ${brigadaNombre}`}
                          >
                            <Pencil aria-hidden="true" />
                            Cambiar Área
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
