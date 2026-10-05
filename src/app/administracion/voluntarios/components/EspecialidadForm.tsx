"use client";

import { useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import styles from "@/styles/pages/admin.module.css";
import { TIPO_CONSULTA_LABELS, type Specialty } from "./EspecialidadesTable";

type EspecialidadFormProps = {
  specialty: Specialty | null;
  onClose: () => void;
  onSave: (nombre: string, tipoConsulta: string | null) => Promise<void>;
};

export default function EspecialidadForm({ specialty, onClose, onSave }: EspecialidadFormProps) {
  const [nombre, setNombre] = useState(specialty?.nombre || "");
  const [tipoConsulta, setTipoConsulta] = useState(specialty?.tipo_consulta || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre de la especialidad es requerido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(nombre, tipoConsulta || null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      title={specialty ? "Editar Especialidad" : "Nueva Especialidad"}
      size="sm"
      onClose={onClose}
      busy={loading}
    >
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.modalBody}>
          <label className="form-field">
            <span className="form-label">Nombre de la Especialidad</span>
            <input
              id="nombre"
              type="text"
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Odontología General"
              disabled={loading}
              aria-invalid={!!error}
              autoFocus
            />
            {error && (
              <span className="form-error" role="alert">
                <CircleAlert size={14} aria-hidden="true" />
                {error}
              </span>
            )}
          </label>
          {/* define quién aparece como médico u odontólogo en el expediente */}
          <label className="form-field">
            <span className="form-label">Tipo de consulta</span>
            <select
              className="form-input"
              value={tipoConsulta}
              onChange={(e) => setTipoConsulta(e.target.value)}
              disabled={loading}
            >
              <option value="">Ninguna</option>
              {Object.entries(TIPO_CONSULTA_LABELS).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            {loading && <LoaderCircle className="spin" aria-hidden="true" />}
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
