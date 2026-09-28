"use client";

import { useState } from "react";
import { Ban, CircleAlert, CircleCheck, LoaderCircle, Pencil, Plus } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import { 
  crearEspecialidad, 
  editarEspecialidad, 
  activarEspecialidad, 
  desactivarEspecialidad 
} from "../actions";
import EspecialidadForm from "./EspecialidadForm";

export type Specialty = {
  id: string;
  nombre: string;
  activo?: boolean;
  activa?: boolean;
};

export default function EspecialidadesTable({
  initialSpecialties,
}: {
  initialSpecialties: Specialty[];
}) {
  const [specialties, setSpecialties] = useState(initialSpecialties);
  const [showModal, setShowModal] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActiva = (sp: Specialty) => sp.activo ?? sp.activa ?? true;

  const handleCreate = () => {
    setEditingSpecialty(null);
    setShowModal(true);
  };

  const handleEdit = (sp: Specialty) => {
    setEditingSpecialty(sp);
    setShowModal(true);
  };

  const handleToggleStatus = async (sp: Specialty) => {
    setLoadingId(sp.id);
    setError(null);
    try {
      const active = isActiva(sp);
      const res = active 
        ? await desactivarEspecialidad(sp.id)
        : await activarEspecialidad(sp.id);
      
      if (res.error) throw new Error(res.error);
      
      // Update local state to reflect change immediately
      setSpecialties(prev => prev.map(s => s.id === sp.id ? { ...s, activo: !active, activa: !active } : s));
    } catch (e: any) {
      setError(e.message || "Ocurrió un error.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSave = async (nombre: string) => {
    setError(null);
    try {
      if (editingSpecialty) {
        const res = await editarEspecialidad(editingSpecialty.id, nombre);
        if (res.error) throw new Error(res.error);
        
        setSpecialties(prev => prev.map(s => 
          s.id === editingSpecialty.id ? { ...s, nombre } : s
        ));
      } else {
        const res = await crearEspecialidad(nombre);
        if (res.error) throw new Error(res.error);
        
        // Since we don't have the new ID immediately, we should ideally refresh the route
        // But for UI optimism, we just force a page reload or we can fetch them again.
        // The server action revalidatePath handles it, so we can just reload.
        window.location.reload();
      }
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || "Ocurrió un error al guardar.");
      throw e; // Pass to form
    }
  };

  return (
    <>
      {error && (
        <p className="notice notice-bad" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>
            <strong>Error:</strong> {error}
          </span>
        </p>
      )}

      <section className={styles.panel} aria-labelledby="listado-especialidades">
        <div className={styles.panelHeader}>
          <h2 id="listado-especialidades" className={styles.panelTitle}>
            Listado de Especialidades <span className={styles.count}>{specialties.length}</span>
          </h2>
          <button type="button" className="btn-primary btn-sm" onClick={handleCreate}>
            <Plus aria-hidden="true" />
            Nueva Especialidad
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {specialties.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    No hay especialidades registradas.
                  </td>
                </tr>
              ) : (
                specialties.map((sp) => {
                  const active = isActiva(sp);
                  const busy = loadingId === sp.id;
                  const toggleLabel = busy ? "Procesando..." : active ? "Desactivar" : "Activar";
                  return (
                    <tr key={sp.id}>
                      <td className={styles.cellMain}>{sp.nombre}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles.badgeDot} ${
                            active ? styles.badgeSuccess : styles.badgeNeutral
                          }`}
                        >
                          {active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleEdit(sp)}
                            disabled={busy}
                            aria-label={`Editar ${sp.nombre}`}
                            title="Editar"
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-xs"
                            onClick={() => handleToggleStatus(sp)}
                            disabled={busy}
                            aria-label={`${toggleLabel} ${sp.nombre}`}
                          >
                            {busy ? (
                              <LoaderCircle className="spin" aria-hidden="true" />
                            ) : active ? (
                              <Ban aria-hidden="true" />
                            ) : (
                              <CircleCheck aria-hidden="true" />
                            )}
                            {toggleLabel}
                          </button>
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

      {showModal && (
        <EspecialidadForm
          specialty={editingSpecialty}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
