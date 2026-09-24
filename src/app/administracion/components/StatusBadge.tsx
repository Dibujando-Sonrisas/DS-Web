import styles from "@/styles/pages/admin.module.css";

type StatusBadgeProps = {
  activo: boolean;
};

export default function StatusBadge({ activo }: StatusBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles.badgeDot} ${
        activo ? styles.badgeSuccess : styles.badgeNeutral
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}
