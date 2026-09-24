import type { AppRole } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/auth/roles";
import styles from "@/styles/pages/admin.module.css";

type RoleBadgeProps = {
  role: AppRole;
};

// un color por rol para distinguirlos de un vistazo (no son estados)
const ROLE_CLASSES: Partial<Record<AppRole, string>> = {
  admin: styles.badgeBrand,
  coordinador: styles.badgeInfo,
  atencion_pacientes: styles.badgeSuccess,
  encargado_farmacia: styles.badgeWarning,
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`${styles.badge} ${ROLE_CLASSES[role] ?? styles.badgeNeutral}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
