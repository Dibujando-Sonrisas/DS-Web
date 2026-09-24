import Link from "next/link";
import { KeyRound, Mail, Send } from "lucide-react";
import AuthField from "../AuthField";
import AuthShell from "../AuthShell";
import styles from "@/styles/pages/auth.module.css";

export const metadata = {
  title: "Recuperar Contraseña — Dibujando Sonrisas",
  description:
    "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.",
};

export default function RecuperarContrasenaPage() {
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

      <form className={styles.authForm} noValidate>
        <AuthField
          id="email"
          label="Correo electrónico"
          icon={<Mail />}
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
        />

        <button type="submit" className="btn-primary btn-block">
          <Send aria-hidden="true" />
          Enviar enlace de recuperación
        </button>
      </form>

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
