"use client";

import { useState, useEffect } from "react";
import { CircleAlert, CircleCheck, Pencil, Plus, Trash2 } from "lucide-react";
import type { LoteMedicamento } from "@/lib/db/inventario";
import {
  getLotesByMedicamentoAction as getLotesByMedicamento,
  createLoteAction as createLote,
  updateLoteAction as updateLote,
  deleteLoteAction as deleteLote,
} from "../actions";
import { LoteForm, LoteFormValues } from "./LoteForm";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import styles from "@/styles/pages/admin.module.css";

interface LotesModalProps {
  medicamentoId: string;
  medicamentoNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onLotesChanged?: () => void;
}

export function LotesModal({ medicamentoId, medicamentoNombre, isOpen, onClose, onLotesChanged }: LotesModalProps) {
  const [lotes, setLotes] = useState<LoteMedicamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteMedicamento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoteMedicamento | null>(null);

  const fetchLotes = async () => {
    try {
      setIsLoading(true);
      const data = await getLotesByMedicamento(medicamentoId);
      setLotes(data);
    } catch (_error) {
      console.error("Error al cargar lotes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (isOpen && medicamentoId && mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLotes();
    }
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, medicamentoId]);

  if (!isOpen) return null;

  const handleOpenForm = (lote?: LoteMedicamento) => {
    setSelectedLote(lote || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedLote(null);
    setIsFormOpen(false);
  };

  const onSubmitForm = async (data: LoteFormValues) => {
    setFeedbackMessage(null);
    try {
      setIsSubmitting(true);
      if (selectedLote) {
        await updateLote(selectedLote.id, {
          numero_lote: data.numero_lote,
          fabricante: data.fabricante,
          fecha_vencimiento: data.fecha_vencimiento,
          cantidad_actual: data.cantidad_actual,
        });
        setFeedbackMessage({ type: "success", text: "¡Lote actualizado exitosamente!" });
      } else {
        await createLote({
          medicamento_id: medicamentoId,
          numero_lote: data.numero_lote,
          fabricante: data.fabricante,
          fecha_vencimiento: data.fecha_vencimiento,
          cantidad_actual: data.cantidad_actual,
          cantidad_inicial: data.cantidad_actual,
        });
        setFeedbackMessage({ type: "success", text: "¡Lote registrado exitosamente!" });
      }
      setTimeout(() => {
        handleCloseForm();
        fetchLotes();
        if (onLotesChanged) onLotesChanged();
      }, 1200);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFeedbackMessage({ type: "error", text: error.message });
      } else {
        setFeedbackMessage({ type: "error", text: "Error al guardar el lote" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (lote: LoteMedicamento) => {
    if (lote.cantidad_actual !== lote.cantidad_inicial) {
      setFeedbackMessage({ type: "error", text: "No se puede eliminar un lote que ya ha sido utilizado." });
      return;
    }
    setDeleteTarget(lote);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setFeedbackMessage(null);
    try {
      await deleteLote(deleteTarget.id);
      setDeleteTarget(null);
      setFeedbackMessage({ type: "success", text: "Lote eliminado correctamente." });
      fetchLotes();
      if (onLotesChanged) onLotesChanged();
    } catch (_error) {
      setFeedbackMessage({ type: "error", text: "Error al eliminar el lote" });
    }
  };

  const getStatusBadge = (lote: LoteMedicamento) => {
    if (lote.cantidad_actual === 0) {
      return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Sin existencias</span>;
    }

    const hoy = new Date();
    const vencimiento = new Date(lote.fecha_vencimiento);
    const diasVencimiento = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

    if (diasVencimiento < 0) {
      return <span className={`${styles.badge} ${styles.badgeDanger}`}>Vencido</span>;
    }
    if (diasVencimiento <= 30) {
      return <span className={`${styles.badge} ${styles.badgeWarning}`}>Próximo a vencer</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>Normal</span>;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('es-ES').format(date);
    } catch {
      return dateStr;
    }
  };

  const feedbackNotice = feedbackMessage && (
    <p
      className={`notice ${feedbackMessage.type === "success" ? "notice-ok" : "notice-bad"}`}
      role={feedbackMessage.type === "error" ? "alert" : "status"}
    >
      {feedbackMessage.type === "success" ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      <span>{feedbackMessage.text}</span>
    </p>
  );

  return (
    <>
      <AdminModal
        title={`Lotes - ${medicamentoNombre}`}
        description="Gestiona los lotes para este medicamento. Política FEFO."
        size="lg"
        onClose={onClose}
        // con la confirmación de borrado abierta, Escape solo cierra la confirmación
        busy={isSubmitting || deleteTarget !== null}
      >
        {!isFormOpen ? (
          <>
            <div className={styles.modalBody}>
              {feedbackNotice}

              {isLoading ? (
                <div className={`${styles.skeleton} ${styles.skeletonBlock}`} />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Lote</th>
                        <th>Fabricante</th>
                        <th>Vencimiento</th>
                        <th className={styles.num}>Cantidad</th>
                        <th>Estado</th>
                        <th className={styles.num}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.emptyCell}>
                            No hay lotes registrados para este medicamento.
                          </td>
                        </tr>
                      ) : (
                        lotes.map((lote) => (
                          <tr key={lote.id}>
                            <td className={styles.cellCode}>{lote.numero_lote}</td>
                            <td>{lote.fabricante || "-"}</td>
                            <td className={styles.nowrap}>{formatDate(lote.fecha_vencimiento)}</td>
                            <td className={`${styles.num} ${styles.cellMain}`}>{lote.cantidad_actual}</td>
                            <td>{getStatusBadge(lote)}</td>
                            <td>
                              <div className={styles.rowActions}>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => handleOpenForm(lote)}
                                  aria-label={`Editar lote ${lote.numero_lote}`}
                                  title="Editar"
                                >
                                  <Pencil aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon-danger"
                                  onClick={() => handleDelete(lote)}
                                  aria-label={`Eliminar lote ${lote.numero_lote}`}
                                  title="Eliminar"
                                >
                                  <Trash2 aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className="btn-primary btn-sm" onClick={() => handleOpenForm()}>
                <Plus aria-hidden="true" />
                Agregar Lote
              </button>
            </div>
          </>
        ) : (
          <LoteForm
            initialData={selectedLote}
            onSubmit={onSubmitForm}
            isLoading={isSubmitting}
            onCancel={handleCloseForm}
          >
            {feedbackNotice}
            <h3 className={styles.formSectionTitle}>{selectedLote ? "Editar Lote" : "Nuevo Lote"}</h3>
          </LoteForm>
        )}
      </AdminModal>

      {/* Modal Confirmación de Eliminación de Lote */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar Lote?"
          confirmLabel="Sí, Eliminar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        >
          ¿Estás seguro de que deseas eliminar el lote <strong>{deleteTarget.numero_lote}</strong>? Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}
    </>
  );
}
