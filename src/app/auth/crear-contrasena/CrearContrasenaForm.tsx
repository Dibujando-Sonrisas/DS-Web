"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound, LoaderCircle, Lock, Save, TriangleAlert } from "lucide-react";
import { crearContrasenaAction } from "@/app/auth/actions";
import AuthField from "../AuthField";
import AuthShell from "../AuthShell";
import styles from "@/styles/pages/auth.module.css";

export default function CrearContrasenaForm({ tokenHash }: { tokenHash: string | null }) {
  const [state, formAction, isPending] = useActionState(crearContrasenaAction, null);

  return (
    <AuthShell>
      <div className={styles.authHeader}>
        <div className="icon-circle icon-circle-sm tone-primary" aria-hidden="true">
          <KeyRound />
        </div>
        <h1 className={styles.authTitle}>Crea tu Contraseña</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.authSubtitle}>
          Elige la contraseña con la que vas a entrar a tu cuenta.
        </p>
      </div>

      {!tokenHash ? (
        <p className="form-error form-alert" role="alert">
          <TriangleAlert aria-hidden="true" />
          Este enlace no es válido. Abre el enlace del correo que te enviamos o pide uno nuevo.
        </p>
      ) : (
        <>
          {state?.error && (
            <p className="form-error form-alert" role="alert">
              <TriangleAlert aria-hidden="true" />
              {state.error}
            </p>
          )}

          <form className={styles.authForm} action={formAction} noValidate>
            <input type="hidden" name="token_hash" value={tokenHash} />

            <AuthField
              id="password"
              label="Contraseña nueva"
              icon={<Lock />}
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              disabled={isPending}
            />

            <AuthField
              id="confirmPassword"
              label="Confirmar contraseña"
              icon={<Lock />}
              type="password"
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              minLength={8}
              required
              disabled={isPending}
            />

            <button type="submit" className="btn-primary btn-block" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save aria-hidden="true" />
                  Guardar contraseña
                </>
              )}
            </button>
          </form>
        </>
      )}

      <div className={styles.divider}>o</div>

      <p className={styles.authFooter}>
        ¿El enlace venció?{" "}
        <Link href="/auth/recuperar-contrasena" className={styles.textLink}>
          Pide uno nuevo
        </Link>
      </p>
    </AuthShell>
  );
}
