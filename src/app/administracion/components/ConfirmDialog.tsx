"use client";

import type { ReactNode } from "react";
import { CircleHelp, LoaderCircle, TriangleAlert } from "lucide-react";
import AdminModal from "./AdminModal";
import styles from "@/styles/pages/admin.module.css";

type ConfirmDialogProps = {
  title: ReactNode;
  /** el mensaje; puede llevar <strong> con el nombre del registro */
  children: ReactNode;
  confirmLabel: string;
  /** texto del botón mientras se ejecuta, p. ej. "Eliminando..." */
  busyLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  /** "danger" para borrar, rechazar o desactivar */
  tone?: "danger" | "primary";
};

/** Confirmación antes de una acción: mensaje + Cancelar / Confirmar. */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
  tone = "danger",
}: ConfirmDialogProps) {
  const isDanger = tone === "danger";

  return (
    <AdminModal
      title={title}
      onClose={onCancel}
      size="sm"
      role="alertdialog"
      busy={busy}
      icon={isDanger ? <TriangleAlert /> : <CircleHelp />}
      iconTone={isDanger ? "tertiary" : "primary"}
    >
      <div className={styles.modalBody}>
        <p>{children}</p>
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${isDanger ? "btn-danger" : "btn-primary"} btn-sm`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy && <LoaderCircle className="spin" aria-hidden="true" />}
          {busy && busyLabel ? busyLabel : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
