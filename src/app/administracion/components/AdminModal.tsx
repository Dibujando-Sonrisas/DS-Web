"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

// modales abiertos, del de abajo al de arriba: Escape solo cierra el último
const openModals: string[] = [];

const SIZE_CLASSES = {
  sm: styles.modalSm,
  md: "",
  lg: styles.modalLg,
  xl: styles.modalXl,
};

type AdminModalProps = {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  size?: keyof typeof SIZE_CLASSES;
  /** ícono en círculo junto al título */
  icon?: ReactNode;
  iconTone?: "primary" | "secondary" | "tertiary";
  /** mientras se guarda no se puede cerrar */
  busy?: boolean;
  role?: "dialog" | "alertdialog";
  children: ReactNode;
};

/**
 * Modal del panel: fondo, título, cerrar con la X, con Escape o tocando fuera.
 * El contenido va en `.modalBody` + `.modalFooter`; si es un formulario,
 * ambos dentro de un `<form className={styles.modalForm}>`.
 */
export default function AdminModal({
  title,
  description,
  onClose,
  size = "md",
  icon,
  iconTone = "primary",
  busy = false,
  role = "dialog",
  children,
}: AdminModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // al abrir, el foco entra al modal (salvo que un campo ya tenga autoFocus)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    openModals.push(titleId);
    return () => {
      openModals.splice(openModals.lastIndexOf(titleId), 1);
    };
  }, [titleId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      const isTop = openModals[openModals.length - 1] === titleId;
      if (e.key === "Escape" && isTop && !busy) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [busy, onClose, titleId]);

  return (
    <div
      className={styles.modalOverlay}
      // solo cierra si el clic empieza en el fondo (no al soltar una selección de texto)
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${styles.modal} ${SIZE_CLASSES[size]}`}
      >
        <div className={styles.modalHeader}>
          {icon && (
            <div className={`icon-circle tone-${iconTone}`} aria-hidden="true">
              {icon}
            </div>
          )}
          <div className={styles.modalHeading}>
            <h2 id={titleId} className={styles.modalTitle}>
              {title}
            </h2>
            {description && <p className={styles.modalSub}>{description}</p>}
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
