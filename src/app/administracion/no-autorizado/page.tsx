import Link from "next/link";
import { LayoutDashboard, Lock } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

export default function NoAutorizadoPage() {
  return (
    <div className={`${styles.placeholder} tone-tertiary`}>
      <div className="icon-circle" aria-hidden="true">
        <Lock />
      </div>
      <h1>Acceso no autorizado</h1>
      <div className="crayons" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>
        Tu rol no tiene permiso para ver este módulo. Si crees que es un error,
        contacta a un administrador.
      </p>
      <Link href="/administracion" className="btn-primary btn-sm">
        <LayoutDashboard aria-hidden="true" />
        Volver al dashboard
      </Link>
    </div>
  );
}
