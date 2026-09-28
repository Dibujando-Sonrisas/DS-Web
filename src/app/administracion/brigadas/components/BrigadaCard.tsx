"use client";

import { Calendar, MapPin } from "lucide-react";
import type { Brigada, EstadoBrigada } from "@/lib/db/brigadas";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

type BrigadaCardProps = {
  brigada: Brigada;
  isSelected: boolean;
  onSelect: () => void;
};

const ESTADO_CLASSES: Record<EstadoBrigada, string> = {
  inscripciones_abiertas: styles.badgeInfo,
  inscripciones_cerradas: styles.badgeNeutral,
  finalizada: styles.badgeNeutral,
  cancelada: styles.badgeDanger,
};

const ESTADO_LABELS: Record<EstadoBrigada, string> = {
  inscripciones_abiertas: "Inscripciones Abiertas",
  inscripciones_cerradas: "Cerrada / Programada",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export default function BrigadaCard({
  brigada,
  isSelected,
  onSelect,
}: BrigadaCardProps) {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Sin fecha";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-HN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div onClick={onSelect} className={`${brig.card} ${isSelected ? brig.cardSelected : ""}`}>
      <div className={brig.cardTop}>
        <span className={brig.cardCode}>{brigada.codigo}</span>
        <span className={`${styles.badge} ${ESTADO_CLASSES[brigada.estado]}`}>
          {ESTADO_LABELS[brigada.estado]}
        </span>
      </div>

      <h4 className={brig.cardTitle}>{brigada.nombre}</h4>

      <p className={`${brig.cardMeta} ${styles.muted}`}>
        <MapPin aria-hidden="true" />
        {brigada.lugar || "Lugar no especificado"}
      </p>

      <p className={`${brig.cardMeta} ${styles.muted}`}>
        <Calendar aria-hidden="true" />
        {formatDate(brigada.fecha_brigada)}
      </p>
    </div>
  );
}
