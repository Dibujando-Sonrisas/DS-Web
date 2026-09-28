"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LoaderCircle, LogOut, RefreshCw } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import AuthShell from "../AuthShell";
import styles from "@/styles/pages/auth.module.css";

export default function SinAccesoClient({
  userName,
  userEmail,
}: {
  userName?: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = () => {
    setIsChecking(true);
    // Redirigir a /administracion para que el Proxy/Guard evalúe el rol actualizado
    router.push("/administracion");
  };

  return (
    <AuthShell>
      <div className={styles.authHeader}>
        <div
          className="icon-circle icon-circle-sm tone-secondary"
          aria-hidden="true"
        >
          <Clock />
        </div>
        <h1 className={styles.authTitle}>Cuenta Pendiente de Permisos</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {userName && (
          <p className={styles.greeting}>
            Hola, {userName} ({userEmail})
          </p>
        )}
      </div>

      <p className={styles.pendingNote}>
        Tu cuenta ha sido registrada exitosamente. Un administrador te asignará
        los permisos correspondientes pronto para que puedas acceder a los
        módulos del sistema.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={handleRefresh}
          disabled={isChecking}
        >
          {isChecking ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {isChecking
            ? "Recomprobando permisos..."
            : "Recomprobar estado de mi rol"}
        </button>

        <form action={logoutAction}>
          <button type="submit" className="btn-outline-blue btn-block">
            <LogOut aria-hidden="true" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
