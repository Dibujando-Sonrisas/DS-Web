import styles from "@/styles/pages/admin.module.css";

type RoleBadgeProps = {
  /** rol desde la base: perfiles → rol:rol_id(nombre, color) */
  role: { nombre: string; color?: string | null } | null | undefined;
};

// el color lo elige quien crea el rol (roles.color); los nombres son los de las clases badge*
const TONOS: Record<string, string> = {
  brand: styles.badgeBrand,
  info: styles.badgeInfo,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  neutral: styles.badgeNeutral,
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) {
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Sin rol</span>;
  }
  return (
    <span className={`${styles.badge} ${TONOS[role.color ?? ""] ?? styles.badgeNeutral}`}>
      {role.nombre}
    </span>
  );
}
