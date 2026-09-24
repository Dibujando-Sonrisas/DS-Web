"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { loginAction } from "@/app/auth/actions";
import AuthField from "../AuthField";
import AuthShell from "../AuthShell";
import styles from "@/styles/pages/auth.module.css";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <AuthShell>
      <div className={styles.authHeader}>
        <div
          className="icon-circle icon-circle-sm tone-primary"
          aria-hidden="true"
        >
          <UserRound />
        </div>
        <h1 className={styles.authTitle}>Iniciar Sesión</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.authSubtitle}>
          Bienvenido de vuelta. Ingresa tus credenciales para continuar.
        </p>
      </div>

      {state?.error && (
        <p className="form-error form-alert" role="alert">
          <TriangleAlert aria-hidden="true" />
          {state.error}
        </p>
      )}

      <form className={styles.authForm} action={formAction} noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}

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
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={isPending}
        />

        <div className={styles.fieldRow}>
          <label className="form-check">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              disabled={isPending}
            />
            Recordar sesión
          </label>
          <Link href="/auth/recuperar-contrasena" className={styles.textLink}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <LoaderCircle className="spin" aria-hidden="true" />
              Ingresando...
            </>
          ) : (
            <>
              <LogIn aria-hidden="true" />
              Ingresar
            </>
          )}
        </button>
      </form>

      <div className={styles.divider}>o</div>

      <p className={styles.authFooter}>
        ¿No tienes una cuenta?{" "}
        <Link href="/auth/registro" className={styles.textLink}>
          Regístrate aquí
        </Link>
      </p>
    </AuthShell>
  );
}
