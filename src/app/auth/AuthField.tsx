import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "@/styles/pages/auth.module.css";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: ReactNode;
};

/* Campo con ícono a la izquierda, compartido por las páginas de /auth */
export default function AuthField({ id, label, icon, required, ...input }: AuthFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="form-required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      <div className={styles.fieldWrapper}>
        <span className={styles.fieldIcon} aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          className={`form-input ${styles.fieldInput}`}
          required={required}
          {...input}
        />
      </div>
    </div>
  );
}
