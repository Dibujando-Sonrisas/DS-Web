import type { ReactNode } from "react";
import styles from "@/styles/pages/admin.module.css";

export type StatTone = "ok" | "warn" | "bad" | "info" | "neutral";

const BADGE_CLASSES: Record<StatTone, string> = {
  ok: styles.badgeSuccess,
  warn: styles.badgeWarning,
  bad: styles.badgeDanger,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
};

const VALUE_CLASSES: Partial<Record<StatTone, string>> = {
  ok: styles.statValueOk,
  warn: styles.statValueWarn,
  bad: styles.statValueBad,
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** dato de apoyo bajo la cifra, en una etiqueta */
  meta?: ReactNode;
  metaTone?: StatTone;
  /** colorea la cifra (p. ej. ingresos en verde, agotados en rojo) */
  valueTone?: StatTone;
  /** la métrica principal lleva el borde punteado de marca */
  featured?: boolean;
};

/**
 * Tarjeta de métrica. Dentro de un `.statGrid` con `tone-rotate` cada ícono
 * toma un color de marca distinto (verde, amarillo, rojo).
 */
export default function StatCard({
  label,
  value,
  icon,
  meta,
  metaTone = "neutral",
  valueTone,
  featured = false,
}: StatCardProps) {
  return (
    <div className={`${styles.statCard} ${featured ? styles.statCardFeatured : ""}`}>
      <div className={styles.statTop}>
        <p className={styles.statLabel}>{label}</p>
        {icon && (
          <span className={styles.statIcon} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className={`${styles.statValue} ${valueTone ? VALUE_CLASSES[valueTone] ?? "" : ""}`}>
        {value}
      </p>
      {meta && (
        <div className={styles.statMeta}>
          <span className={`${styles.badge} ${BADGE_CLASSES[metaTone]}`}>{meta}</span>
        </div>
      )}
    </div>
  );
}
