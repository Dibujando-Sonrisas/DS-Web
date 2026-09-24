import Link from "next/link";
import { Banknote, Gift, PackagePlus, Plus, UserPlus } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";
import { AppRole } from "@/lib/auth/roles";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export default function QuickActions({ role }: { role: AppRole }) {
  const actions = [
    {
      label: "Nueva Brigada",
      href: "/administracion/brigadas",
      icon: <Plus />,
      perm: PERMISSIONS.BRIGADAS_CREATE,
    },
    {
      label: "Registrar Paciente",
      href: "/administracion/pacientes/nuevo",
      icon: <UserPlus />,
      perm: PERMISSIONS.PACIENTES_CREATE,
    },
    {
      label: "Agregar Inventario",
      href: "/administracion/inventario",
      icon: <PackagePlus />,
      perm: PERMISSIONS.INVENTARIO_CREATE,
    },
    {
      label: "Registrar Venta",
      href: "/administracion/ventas",
      icon: <Banknote />,
      perm: PERMISSIONS.VENTAS_CREATE,
    },
    {
      label: "Registrar Donación",
      href: "/administracion/donaciones",
      icon: <Gift />,
      perm: PERMISSIONS.DONACIONES_CREATE,
    },
  ];

  const visibleActions = actions.filter((a) => hasPermission(role, a.perm));

  if (visibleActions.length === 0) return null;

  return (
    <section className={styles.stackSm} aria-labelledby="accesos-rapidos">
      <h2 id="accesos-rapidos" className={styles.sectionTitle}>
        Accesos Rápidos
      </h2>
      {/* cada acción toma un color de marca, como "Son·ri·sas" */}
      <div className={`${dash.quickActions} tone-rotate`}>
        {visibleActions.map((action) => (
          <Link key={action.label} href={action.href} className={dash.quickAction}>
            <span className={dash.quickIcon} aria-hidden="true">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
