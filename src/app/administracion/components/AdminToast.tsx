"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

type ToastType = "success" | "error";
type Toast = { id: number; message: string; type: ToastType; leaving?: boolean };

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

// los errores se quedan más tiempo en pantalla para alcanzar a leerlos
const DURACION: Record<ToastType, number> = { success: 4000, error: 7000 };

/** Avisos flotantes del panel. Vive en el layout, así el aviso sigue visible al cambiar de página. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  // marca la salida; se quita de la lista cuando termina su animación
  const cerrar = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++nextId.current;
      setToasts((ts) => [...ts, { id, message, type }]);
      setTimeout(() => cerrar(id), DURACION[type]);
    },
    [cerrar]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.toasts} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${t.type === "error" ? styles.toastError : ""}`}
            role={t.type === "error" ? "alert" : undefined}
            data-leaving={t.leaving || undefined}
            onAnimationEnd={() => t.leaving && setToasts((ts) => ts.filter((x) => x.id !== t.id))}
          >
            {t.type === "error" ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
            <span className={styles.toastMessage}>{t.message}</span>
            <button type="button" className={styles.toastClose} aria-label="Cerrar aviso" onClick={() => cerrar(t.id)}>
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** showToast(mensaje, "success" | "error") desde cualquier pantalla del panel. */
export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast debe usarse dentro de ToastProvider");
  return { showToast };
}
