"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Brigada } from "@/lib/db/brigadas";
import CountdownCard from "@/app/administracion/brigadas/components/CountdownCard";
import InscripcionModal from "@/app/components/InscripcionModal";
import styles from "@/styles/components/home-brigada-banner.module.css";
import { Book, Calendar, CircleAlert, FileText, Loader, Lock, MapPin, UserPlus } from "lucide-react";

export type CuposInfo = {
  total: number | null;
  registrados: number;
  cupoLleno: boolean;
  disponibles: number | null;
};

type HomeBrigadaBannerProps = {
  brigada: Brigada;
  cuposInfo?: CuposInfo;
};

export default function HomeBrigadaBanner({
  brigada,
  cuposInfo,
}: HomeBrigadaBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Fecha por confirmar";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-HN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isInscripcionesAbiertas = brigada.estado === "inscripciones_abiertas";
  const isCupoLleno = cuposInfo?.cupoLleno || false;
  const canRegister = isInscripcionesAbiertas && !isCupoLleno;

  return (
    <>
      <section
        className={styles.bannerContainer}
        aria-label="Información de la próxima brigada médica"
      >
        <div className={styles.bannerCard}>
          <div className={styles.decorCircle1} aria-hidden="true" />
          <div className={styles.decorCircle2} aria-hidden="true" />

          {/* Tags */}
          <div className={styles.tagRow}>
            <span className={styles.statusTag}>
              <CircleAlert size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} aria-hidden="true" />
              Próxima Brigada Médica
            </span>

            {isInscripcionesAbiertas && !isCupoLleno && (
              <span className={styles.cupoTag}>
                <Loader size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} aria-hidden="true" />
                Inscripciones Abiertas
                {cuposInfo?.disponibles !== null && cuposInfo?.disponibles !== undefined && (
                  <> ({cuposInfo.disponibles} cupos disponibles)</>
                )}
              </span>
            )}

            {isCupoLleno && (
              <span className={styles.cupoFullTag}>
                <CircleAlert size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} aria-hidden="true" />
                Cupos de Voluntariado Llenos
              </span>
            )}

            {brigada.estado === "inscripciones_cerradas" && (
              <span className={styles.statusTag}>
                <Lock size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} aria-hidden="true" />
                Inscripciones Cerradas
              </span>
            )}
          </div>

          {/* Título */}
          <h2 className={styles.title}>{brigada.nombre}</h2>

          {/* Metadatos */}
          <div className={styles.metaInfo}>
            <p className={styles.metaItem}>
              <MapPin size={18} aria-hidden="true" />
              <strong>
                {brigada.lugar || "Comunidad por definir"}
                {brigada.municipio ? `, ${brigada.municipio}` : ""}
              </strong>
            </p>
            <p className={styles.metaItem}>
              <Calendar size={18} aria-hidden="true" />
              <span>{formatDate(brigada.fecha_brigada)}</span>
            </p>
          </div>

          {/* Countdown */}
          {brigada.fecha_brigada && (
            <div className={styles.countdownSection}>
              <p className={styles.countdownLabel}>Tiempo restante para el inicio</p>
              <CountdownCard targetDateStr={brigada.fecha_brigada} />
            </div>
          )}

          {/* Descripción */}
          {brigada.descripcion && (
            <p className={styles.description}>&ldquo;{brigada.descripcion}&rdquo;</p>
          )}

          {/* Botones de Acción */}
          <div className={styles.ctaRow}>
            {canRegister ? (
              <button
                type="button"
                className={styles.btnActionPrimary}
                onClick={() => setIsModalOpen(true)}
              >
                <UserPlus size={20} strokeWidth={2.2} />
                Inscribirme como Voluntario
              </button>
            ) : isCupoLleno ? (
              <span
                className={styles.btnActionPrimary}
                style={{ opacity: 0.85, cursor: "default", background: "#f1f5f9", color: "#64748b" }}
              >
                <Lock size={18} aria-hidden="true" />
                Cupo Lleno para esta Brigada
              </span>
            ) : (
              <Link href="/voluntariado" className={styles.btnActionPrimary}>
                <FileText size={18} aria-hidden="true" />
                Información de Voluntariado
              </Link>
            )}

            <Link href="/brigadas" className={styles.btnActionSecondary}>
              <Book size={18} aria-hidden="true" />
              Ver Historial de Brigadas
            </Link>
          </div>
        </div>
      </section>

      {/* Modal de Inscripción */}
      <InscripcionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        brigada={brigada}
      />
    </>
  );
}
