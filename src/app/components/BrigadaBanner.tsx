"use client";

import { useState } from "react";
import Link from "next/link";
import type { Brigada } from "@/lib/db/brigadas";
import CountdownCard from "@/app/components/CountdownCard";
import InscripcionModal from "@/app/components/InscripcionModal";
import styles from "@/styles/components/brigada-banner.module.css";
import {
  ArrowRight,
  Calendar,
  CircleAlert,
  Clock,
  FileText,
  Lock,
  MapPin,
  UserPlus,
} from "lucide-react";

export type CuposInfo = {
  total: number | null;
  registrados: number;
  cupoLleno: boolean;
  disponibles: number | null;
};

type BrigadaBannerProps = {
  brigada: Brigada;
  cuposInfo?: CuposInfo;
};

const formatDate = (isoString?: string | null) => {
  if (!isoString) return "Fecha por confirmar";
  const date = new Date(isoString).toLocaleDateString("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return date.charAt(0).toUpperCase() + date.slice(1);
};

/* Tarjeta de la próxima brigada: se usa en el inicio y en /voluntariado */
export default function BrigadaBanner({ brigada, cuposInfo }: BrigadaBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isInscripcionesAbiertas = brigada.estado === "inscripciones_abiertas";
  const isCupoLleno = cuposInfo?.cupoLleno || false;
  const canRegister = isInscripcionesAbiertas && !isCupoLleno;
  const disponibles = cuposInfo?.disponibles;

  return (
    <>
      <section className={styles.banner} aria-label="Próxima brigada médica">
        <div className={`${styles.card} card-soft`}>
          <div className={styles.info}>
            {/* solo el estado de inscripción: el título habla por sí mismo */}
            <div className={styles.tags}>
              {canRegister && (
                <span className={`${styles.tag} tone-primary`}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  Inscripciones abiertas
                  {disponibles != null && ` · ${disponibles} cupos`}
                </span>
              )}

              {isCupoLleno && (
                <span className={`${styles.tag} tone-tertiary`}>
                  <CircleAlert aria-hidden="true" />
                  Cupos de voluntariado llenos
                </span>
              )}

              {brigada.estado === "inscripciones_cerradas" && (
                <span className={`${styles.tag} ${styles.tagMuted}`}>
                  <Lock aria-hidden="true" />
                  Inscripciones cerradas
                </span>
              )}
            </div>

            <h2 className={styles.title}>
              Próxima brigada: <span>{brigada.nombre}</span>
            </h2>
            <div className="crayons" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <ul className={`${styles.meta} tone-rotate`}>
              <li className="chip">
                <MapPin aria-hidden="true" />
                {brigada.lugar || "Comunidad por definir"}
                {brigada.municipio && brigada.municipio !== brigada.lugar
                  ? `, ${brigada.municipio}`
                  : ""}
              </li>
              <li className="chip">
                <Calendar aria-hidden="true" />
                {formatDate(brigada.fecha_brigada)}
              </li>
            </ul>

            {brigada.descripcion && (
              <p className={styles.description}>{brigada.descripcion}</p>
            )}

            <div className={styles.actions}>
              {canRegister ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsModalOpen(true)}
                >
                  <UserPlus aria-hidden="true" />
                  Inscribirme como Voluntario
                </button>
              ) : isCupoLleno ? (
                <span className="btn-primary btn-disabled">
                  <Lock aria-hidden="true" />
                  Cupo lleno para esta brigada
                </span>
              ) : (
                <Link href="/voluntariado" className="btn-primary">
                  <FileText aria-hidden="true" />
                  Información de Voluntariado
                </Link>
              )}

              <Link href="/brigadas" className="btn-outline-blue">
                Brigadas anteriores
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          {brigada.fecha_brigada && (
            <div className={styles.countdownPanel}>
              <p className={styles.countdownLabel}>
                <Clock aria-hidden="true" />
                Cuenta regresiva
              </p>
              <CountdownCard targetDateStr={brigada.fecha_brigada} />
              <p className={styles.countdownDate}>
                {formatDate(brigada.fecha_brigada)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* se monta solo al abrir, así cada apertura empieza limpia */}
      {isModalOpen && (
        <InscripcionModal
          isOpen
          onClose={() => setIsModalOpen(false)}
          brigada={brigada}
        />
      )}
    </>
  );
}
