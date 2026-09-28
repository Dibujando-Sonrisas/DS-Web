"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import type { LoteMedicamento } from "@/lib/db/inventario";
import styles from "@/styles/pages/admin.module.css";

export interface LoteFormValues {
  numero_lote: string;
  fabricante?: string;
  fecha_vencimiento: string;
  cantidad_actual: number;
}

interface LoteFormProps {
  initialData?: Partial<LoteMedicamento> | null;
  onSubmit: (data: LoteFormValues) => void;
  isLoading?: boolean;
  /** "Volver a Lotes" en el pie del modal */
  onCancel?: () => void;
  /** avisos y título que van sobre los campos */
  children?: React.ReactNode;
}

export function LoteForm({ initialData, onSubmit, isLoading, onCancel, children }: LoteFormProps) {
  const [formData, setFormData] = useState<LoteFormValues>({
    numero_lote: "",
    fabricante: "",
    fecha_vencimiento: "",
    cantidad_actual: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        numero_lote: initialData.numero_lote || "",
        fabricante: initialData.fabricante || "",
        fecha_vencimiento: initialData.fecha_vencimiento || "",
        cantidad_actual: initialData.cantidad_actual || 0,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "cantidad_actual" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero_lote || !formData.fecha_vencimiento || formData.cantidad_actual < 0) {
      alert("Por favor completa los campos requeridos correctamente.");
      return;
    }
    onSubmit(formData);
  };

  // se muestra dentro de AdminModal: cuerpo con los campos + pie con los botones
  return (
    <form onSubmit={handleSubmit} className={styles.modalForm}>
      <div className={styles.modalBody}>
        {children}

        <div className="form-grid">
          <label className="form-field">
            <span className="form-label">
              Número de Lote <span className="form-required" aria-hidden="true">*</span>
            </span>
            <input
              className="form-input"
              name="numero_lote"
              value={formData.numero_lote}
              onChange={handleChange}
              placeholder="Ej. L-2023-001"
              required
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Fabricante <span className="form-optional">(Opcional)</span>
            </span>
            <input
              className="form-input"
              name="fabricante"
              value={formData.fabricante}
              onChange={handleChange}
              placeholder="Ej. Bayer"
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Fecha de Vencimiento <span className="form-required" aria-hidden="true">*</span>
            </span>
            <input
              className="form-input"
              type="date"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Cantidad Actual <span className="form-required" aria-hidden="true">*</span>
            </span>
            <input
              className="form-input"
              type="number"
              min="0"
              name="cantidad_actual"
              value={formData.cantidad_actual}
              onChange={handleChange}
              required
            />
          </label>
        </div>
      </div>

      <div className={styles.modalFooter}>
        {onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            <ArrowLeft aria-hidden="true" />
            Volver a Lotes
          </button>
        )}
        <button type="submit" className="btn-primary btn-sm" disabled={isLoading}>
          {isLoading && <LoaderCircle className="spin" aria-hidden="true" />}
          {isLoading ? "Guardando..." : "Guardar Lote"}
        </button>
      </div>
    </form>
  );
}
