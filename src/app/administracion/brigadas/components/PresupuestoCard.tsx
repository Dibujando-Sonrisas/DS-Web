"use client";

import React, { useState } from "react";
import { CircleAlert, LoaderCircle, Pencil } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

type PresupuestoCardProps = {
  presupuestoEstimado: number;
  presupuestoEjecutado: number;
  onUpdateBudget: (newAmount: number) => Promise<void>;
  isReadOnly?: boolean;
};

export default function PresupuestoCard({
  presupuestoEstimado,
  presupuestoEjecutado,
  onUpdateBudget,
  isReadOnly = false,
}: PresupuestoCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(presupuestoEstimado.toString());
  const [loading, setLoading] = useState(false);

  const disponible = presupuestoEstimado - presupuestoEjecutado;
  
  // Calculate percentage, avoid divide by zero
  const percentage = presupuestoEstimado > 0 
    ? Math.round((presupuestoEjecutado / presupuestoEstimado) * 100) 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputValue);
    if (Number.isNaN(parsed) || parsed < 0) return;
    
    setLoading(true);
    await onUpdateBudget(parsed);
    setLoading(false);
    setEditing(false);
  };

  // barra: amarilla desde el 80 %, roja al sobrepasar el presupuesto
  const isOver = disponible < 0;
  const progressTone = isOver ? styles.progressBad : percentage >= 80 ? styles.progressWarn : "";

  return (
    <section className={styles.stackSm}>
      <div className={styles.rowBetween}>
        <h3 className={styles.subTitle}>Presupuesto Financiero</h3>
        {!isReadOnly && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setInputValue(presupuestoEstimado.toString());
              setEditing(!editing);
            }}
          >
            {editing ? (
              "Cancelar"
            ) : (
              <>
                <Pencil aria-hidden="true" />
                Editar Presupuesto Inicial
              </>
            )}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className={brig.budgetForm}>
          <label className={`form-field ${brig.budgetField}`}>
            <span className="form-label">Nuevo presupuesto estimado (HNL)</span>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            {loading && <LoaderCircle className="spin" aria-hidden="true" />}
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      ) : (
        <dl className={brig.figures}>
          <div className={brig.figure}>
            <dt>Presupuesto Inicial</dt>
            <dd>{formatCurrency(presupuestoEstimado)}</dd>
          </div>
          <div className={`${brig.figure} ${isOver ? brig.figureBad : ""}`}>
            <dt>Total Gastado</dt>
            <dd>{formatCurrency(presupuestoEjecutado)}</dd>
          </div>
          <div className={`${brig.figure} ${isOver ? brig.figureBad : brig.figureOk}`}>
            <dt>Presupuesto Disponible</dt>
            <dd>{formatCurrency(disponible)}</dd>
          </div>
        </dl>
      )}

      {/* Progress Bar */}
      <div className={styles.stackSm}>
        <div className={brig.progressHead}>
          <span>Progreso del Presupuesto Ejecutado</span>
          <strong className={isOver ? brig.valueBad : ""}>{percentage}%</strong>
        </div>
        <div className={styles.progress}>
          <div
            className={`${styles.progressFill} ${progressTone}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {isOver && (
          <p className="notice notice-bad">
            <CircleAlert aria-hidden="true" />
            <span>
              <strong>Alerta:</strong> El presupuesto ejecutado ha sobrepasado el límite inicial estimado por {formatCurrency(Math.abs(disponible))}.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
