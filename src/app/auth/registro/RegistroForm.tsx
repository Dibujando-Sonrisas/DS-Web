"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UserRound,
} from "lucide-react";
import { signUpAction } from "@/app/auth/actions";
import AuthField from "../AuthField";
import styles from "@/styles/pages/auth.module.css";

export default function RegistroForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <main className={styles.authPage}>
      <div className={`${styles.authCard} card-soft card-drawn tone-secondary`}>
        <div className={styles.authHeader}>
          <div className="icon-circle" aria-hidden="true">
            <UserPlus />
          </div>
          <h1 className={styles.authTitle}>Crear Cuenta</h1>
          <div className="crayons" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className={styles.authSubtitle}>
            Completa tus datos para registrarte en el portal de la fundación.
          </p>
        </div>

        {state?.error && (
          <p className="form-error form-alert" role="alert">
            <TriangleAlert aria-hidden="true" />
            {state.error}
          </p>
        )}

        <form className={styles.authForm} action={formAction} noValidate>
          <AuthField
            id="fullName"
            label="Nombre completo"
            icon={<UserRound />}
            type="text"
            autoComplete="name"
            placeholder="Ej. María Josefa Rodríguez"
            required
            disabled={isPending}
          />

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

          <AuthField
            id="password"
            label="Contraseña"
            icon={<Lock />}
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            required
            disabled={isPending}
          />

          <AuthField
            id="confirmPassword"
            label="Confirmar contraseña"
            icon={<ShieldCheck />}
            type="password"
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            required
            disabled={isPending}
          />

          <button
            type="submit"
            className={`btn-primary ${styles.fullWidth}`}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" />
                Registrando cuenta...
              </>
            ) : (
              <>
                <UserPlus aria-hidden="true" />
                Crear mi cuenta
              </>
            )}
          </button>
        </form>

        <div className={styles.divider}>o</div>

        <p className={styles.authFooter}>
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/login" className={styles.textLink}>
            Iniciar sesión aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
