"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LoaderCircle, LogOut, RefreshCw } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
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
    <main className={styles.authPage}>
      <div
        className={`${styles.authCard} ${styles.authCardWide} card-soft card-drawn tone-secondary`}
      >
        <div className={styles.authHeader}>
          <div className="icon-circle" aria-hidden="true">
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

        <p className={styles.notice}>
          Tu cuenta ha sido registrada exitosamente. Un administrador te
          asignará los permisos correspondientes pronto para que puedas acceder
          a los módulos del sistema.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn-primary ${styles.fullWidth}`}
            onClick={handleRefresh}
            disabled={isChecking}
          >
            {isChecking ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {isChecking ? "Recomprobando permisos..." : "Recomprobar estado de mi rol"}
          </button>

          <form action={logoutAction}>
            <button type="submit" className={`btn-outline-blue ${styles.fullWidth}`}>
              <LogOut aria-hidden="true" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
