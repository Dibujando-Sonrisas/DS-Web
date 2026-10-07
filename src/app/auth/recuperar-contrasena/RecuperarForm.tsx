"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleCheck, KeyRound, LoaderCircle, Mail, Send, TriangleAlert } from "lucide-react";
import { recuperarContrasenaAction } from "@/app/auth/actions";
import AuthField from "../AuthField";
import AuthShell from "../AuthShell";
import styles from "@/styles/pages/auth.module.css";

export default function RecuperarForm() {
  const [state, formAction, isPending] = useActionState(recuperarContrasenaAction, null);

  return (
    <AuthShell>
      <div className={styles.authHeader}>
        <div
          className="icon-circle icon-circle-sm tone-tertiary"
          aria-hidden="true"
        >
          <KeyRound />
        </div>
        <h1 className={styles.authTitle}>Recuperar Contraseña</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.authSubtitle}>
          Ingresa tu correo y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>
      </div>

      {state?.error && (
        <p className="form-error form-alert" role="alert">
          <TriangleAlert aria-hidden="true" />
          {state.error}
        </p>
      )}

      {state?.success ? (
        <p className="form-success" role="status">
          <CircleCheck aria-hidden="true" />
          {state.success}
        </p>
      ) : (
        <form className={styles.authForm} action={formAction} noValidate>
          <AuthField
            id="email"
            label="Correo electrónico"
            icon={<Mail />}
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
            disabled={isPending}
          />

          <button type="submit" className="btn-primary btn-block" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              <>
                <Send aria-hidden="true" />
                Enviar enlace de recuperación
              </>
            )}
          </button>
        </form>
      )}

      <div className={styles.divider}>o</div>

      <p className={styles.authFooter}>
        ¿Recordaste tu contraseña?{" "}
        <Link href="/auth/login" className={styles.textLink}>
          Iniciar Sesión
        </Link>
      </p>
    </AuthShell>
  );
}
