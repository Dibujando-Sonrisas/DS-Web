import { CircleAlert, CircleCheck } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

export type ToastState = { message: string; type: "success" | "error" } | null;

/** Aviso flotante tras guardar o fallar una acción. El estado y su temporizador viven en quien lo usa. */
export default function AdminToast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      className={`${styles.toast} ${isError ? styles.toastError : ""}`}
      role={isError ? "alert" : "status"}
    >
      {isError ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
      <span>{toast.message}</span>
    </div>
  );
}
