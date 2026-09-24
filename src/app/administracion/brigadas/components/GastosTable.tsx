"use client";

import React, { useState, useTransition } from "react";
import { z } from "zod";
import { CircleAlert, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

export type GastoRow = {
  id: string;
  brigada_id: string;
  categoria: "medicamentos" | "alimentacion" | "publicidad" | "otros";
  descripcion: string;
  monto: number;
  fecha_gasto: string; // ISO String YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
};

type GastosTableProps = {
  brigadaId: string;
  gastos: GastoRow[];
  onSaveGasto: (gasto: Omit<GastoRow, "id"> & { id?: string }, isDelete?: boolean) => Promise<void>;
  isReadOnly?: boolean;
};

// Esquema Zod 4 de Validación Estricta (Capítulo 15 - Análisis y Diseño de Datos)
const gastoSchema = z.object({
  categoria: z.enum(["medicamentos", "alimentacion", "publicidad", "otros"], {
    message: "Prueba de valores válidos: Selecciona una categoría válida.",
  }),
  descripcion: z
    .string()
    .trim()
    .min(3, "Prueba de presencia: El concepto o descripción debe tener al menos 3 caracteres.")
    .max(200, "Prueba de longitud: La descripción no debe exceder 200 caracteres."),
  monto: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z
      .number({ message: "Prueba de clase: El monto del gasto debe ser numérico." })
      .min(0.01, "Prueba de sensatez: El monto del gasto debe ser un valor positivo mayor a L 0.00.")
  ),
  fecha_gasto: z
    .string()
    .min(1, "Prueba de presencia: La fecha de registro del gasto es obligatoria."),
});

type GastoFormData = z.infer<typeof gastoSchema>;

const CATEGORIA_LABELS: Record<string, string> = {
  medicamentos: "Medicamentos / Clínica",
  alimentacion: "Alimentación / Viáticos",
  publicidad: "Publicidad / Impresión",
  otros: "Otros / Varios",
};

export default function GastosTable({
  brigadaId,
  gastos,
  onSaveGasto,
  isReadOnly = false,
}: GastosTableProps) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingGasto, setEditingGasto] = useState<GastoRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GastoRow | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  const [formData, setFormData] = useState<Partial<GastoFormData>>({
    categoria: "otros",
    descripcion: "",
    monto: 0,
    fecha_gasto: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof GastoFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof GastoFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) setGeneralError(null);
  };

  const openCreate = () => {
    setFormData({
      categoria: "otros",
      descripcion: "",
      monto: 0,
      fecha_gasto: new Date().toISOString().split("T")[0],
    });
    setFormErrors({});
    setGeneralError(null);
    setIsDirty(false);
    setEditingGasto(null);
    setModalMode("create");
  };

  const openEdit = (gasto: GastoRow) => {
    setFormData({
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      fecha_gasto: gasto.fecha_gasto.split("T")[0],
    });
    setFormErrors({});
    setGeneralError(null);
    setIsDirty(false);
    setEditingGasto(gasto);
    setModalMode("edit");
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      setModalMode(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return utcDate.toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validación estricta con Zod 4
    const result = gastoSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof GastoFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof GastoFormData] = issue.message;
        }
      });
      setFormErrors(errors);
      setGeneralError("Existen errores en los datos del gasto. Por favor revísalos a continuación.");
      return;
    }

    const data = result.data;
    startTransition(async () => {
      const payload: Omit<GastoRow, "id"> & { id?: string } = {
        brigada_id: brigadaId,
        categoria: data.categoria,
        descripcion: data.descripcion,
        monto: data.monto,
        fecha_gasto: new Date(data.fecha_gasto).toISOString(),
      };
      if (editingGasto) {
        payload.id = editingGasto.id;
      }
      await onSaveGasto(payload);
      setIsDirty(false);
      setModalMode(null);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await onSaveGasto(deleteTarget, true);
      setDeleteTarget(null);
    });
  };

  return (
    <section className={styles.stackSm}>
      <div className={styles.rowBetween}>
        <h3 className={styles.subTitle}>
          Gastos Registrados <span className={styles.count}>{gastos.length}</span>
        </h3>
        {!isReadOnly && (
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Registrar Nuevo Gasto
          </button>
        )}
      </div>

      <div className={`${styles.tableWrap} ${brig.bleed}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Descripción / Concepto</th>
              <th className={styles.num}>Monto (HNL)</th>
              <th>Fecha de Registro</th>
              {!isReadOnly && <th className={styles.num}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} className={styles.emptyCell}>
                  Aún no se han registrado gastos presupuestarios para esta brigada médica.
                </td>
              </tr>
            ) : (
              gastos.map((g) => (
                <tr key={g.id}>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                      {CATEGORIA_LABELS[g.categoria] || g.categoria}
                    </span>
                  </td>
                  <td>{g.descripcion}</td>
                  <td className={`${styles.num} ${brig.valueBad}`}>{formatCurrency(g.monto)}</td>
                  <td className={styles.nowrap}>{formatDate(g.fecha_gasto)}</td>
                  {!isReadOnly && (
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openEdit(g)}
                          aria-label={`Editar gasto ${g.descripcion}`}
                          title="Editar"
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setDeleteTarget(g)}
                          aria-label={`Eliminar gasto ${g.descripcion}`}
                          title="Eliminar"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Registro / Edición de Gasto (Diseño de Columna Única Vertical) */}
      {modalMode && (
        <AdminModal
          title={modalMode === "create" ? "Registrar Nuevo Gasto" : "Editar Registro de Gasto"}
          size="sm"
          onClose={handleRequestClose}
          busy={isPending}
        >
          <form onSubmit={handleFormSubmit} className={styles.modalForm}>
            <div className={styles.modalBody}>
              {/* Banner de errores de validación */}
              {generalError && (
                <p className="form-error form-alert" role="alert">
                  <CircleAlert aria-hidden="true" />
                  <span>{generalError}</span>
                </p>
              )}

              {/* Categoría del Gasto */}
              <label className="form-field">
                <span className="form-label">
                  Categoría del Gasto <span className="form-required" aria-hidden="true">*</span>
                </span>
                <select
                  name="categoria"
                  className="form-input"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  disabled={isPending}
                  required
                >
                  <option value="medicamentos">{CATEGORIA_LABELS.medicamentos}</option>
                  <option value="alimentacion">{CATEGORIA_LABELS.alimentacion}</option>
                  <option value="publicidad">{CATEGORIA_LABELS.publicidad}</option>
                  <option value="otros">{CATEGORIA_LABELS.otros}</option>
                </select>
                {formErrors.categoria && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.categoria}
                  </span>
                )}
              </label>

              {/* Descripción / Concepto del Gasto */}
              <label className="form-field">
                <span className="form-label">
                  Descripción / Concepto del Gasto <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input
                  name="descripcion"
                  className="form-input"
                  value={formData.descripcion || ""}
                  onChange={handleInputChange}
                  placeholder="Ej. Adquisición de analgésicos y material de curación"
                  maxLength={200}
                  disabled={isPending}
                  required
                />
                {formErrors.descripcion && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.descripcion}
                  </span>
                )}
              </label>

              {/* Monto en Lempiras */}
              <label className="form-field">
                <span className="form-label">
                  Monto Ejecutado (HNL) <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input
                  name="monto"
                  className="form-input"
                  value={formData.monto ?? ""}
                  onChange={handleInputChange}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 3500.00"
                  disabled={isPending}
                  required
                />
                {formErrors.monto && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.monto}
                  </span>
                )}
              </label>

              {/* Fecha de Ejecución del Gasto */}
              <label className="form-field">
                <span className="form-label">
                  Fecha de Ejecución del Gasto <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input
                  name="fecha_gasto"
                  className="form-input"
                  value={formData.fecha_gasto || ""}
                  onChange={handleInputChange}
                  type="date"
                  disabled={isPending}
                  required
                />
                {formErrors.fecha_gasto && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.fecha_gasto}
                  </span>
                )}
              </label>
            </div>

            {/* Botones de acción */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={handleRequestClose}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={isPending}>
                {isPending && <LoaderCircle className="spin" aria-hidden="true" />}
                {isPending ? "Guardando Registro..." : "Guardar Gasto"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Modal de Advertencia HCI (Descarte de Cambios) */}
      {showDiscardModal && (
        <ConfirmDialog
          title="¿Descartar Cambios no Guardados?"
          confirmLabel="Sí, Descartar"
          cancelLabel="Continuar Editando"
          onCancel={() => setShowDiscardModal(false)}
          onConfirm={() => {
            setShowDiscardModal(false);
            setIsDirty(false);
            setModalMode(null);
          }}
        >
          Has modificado información del gasto. Si cierras la ventana ahora, los datos introducidos se perderán.
        </ConfirmDialog>
      )}

      {/* Modal de Confirmación HCI para Eliminación */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar Registro de Gasto?"
          confirmLabel="Sí, Eliminar Gasto"
          busyLabel="Eliminando..."
          busy={isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        >
          ¿Estás seguro de que deseas eliminar permanentemente el gasto por{" "}
          <strong>{formatCurrency(deleteTarget.monto)}</strong> (Concepto: {deleteTarget.descripcion})? Esta acción recalculará automáticamente el presupuesto restante de la brigada.
        </ConfirmDialog>
      )}
    </section>
  );
}
