"use client";

import React, { useState } from "react";
import type { Brigada } from "@/lib/db/brigadas";
import CountdownCard from "./CountdownCard";
import InscripcionModal from "@/app/components/InscripcionModal";
import { Calendar, CircleAlert, FileText, Loader, Lock, MapPin } from "lucide-react";

export type CuposBannerInfo = {
  total: number | null;
  registrados: number;
  cupoLleno: boolean;
  disponibles: number | null;
};

type PublicBrigadaBannerProps = {
  brigada: Brigada;
  cuposInfo?: CuposBannerInfo;
};

export default function PublicBrigadaBanner({
  brigada,
  cuposInfo,
}: PublicBrigadaBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Próximamente";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-HN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isInscripcionesAbiertas = brigada.estado === "inscripciones_abiertas";
  const isCupoLleno = cuposInfo?.cupoLleno || false;
  const canRegister = isInscripcionesAbiertas && !isCupoLleno;

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, var(--primaryDark) 0%, var(--primaryColor) 100%)",
          borderRadius: "16px",
          padding: "3.2rem 2.4rem",
          color: "#fff",
          boxShadow: "0 10px 30px rgba(7, 92, 88, 0.25)",
          marginBottom: "4rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          alignItems: "center",
          maxWidth: "850px",
          width: "100%",
          marginLeft: "auto",
          marginRight: "auto",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", width: "100%" }}>
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center" }}>
            <span
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: "rgba(255, 255, 255, 0.2)",
                padding: "0.4rem 1.4rem",
                borderRadius: "50px",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <CircleAlert size={14} aria-hidden="true" />
              Próxima Brigada Activa
            </span>

            {isInscripcionesAbiertas && !isCupoLleno && (
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  background: "rgba(16, 185, 129, 0.3)",
                  color: "#a7f3d0",
                  padding: "0.4rem 1.2rem",
                  borderRadius: "50px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  border: "1px solid rgba(16, 185, 129, 0.5)",
                }}
              >
                <Loader size={14} aria-hidden="true" />
                Inscripciones Abiertas
                {cuposInfo?.disponibles !== null && cuposInfo?.disponibles !== undefined && (
                  <> ({cuposInfo.disponibles} cupos disponibles)</>
                )}
              </span>
            )}

            {isCupoLleno && (
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  background: "rgba(239, 68, 68, 0.3)",
                  color: "#fecaca",
                  padding: "0.4rem 1.2rem",
                  borderRadius: "50px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                }}
              >
                <CircleAlert size={14} aria-hidden="true" />
                Cupos de Voluntariado Llenos
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: "2.8rem",
              fontWeight: "bold",
              lineHeight: "1.2",
              margin: "0.6rem 0",
              color: "#fff",
            }}
          >
            {brigada.nombre}
          </h2>

          <p
            style={{
              fontSize: "1.55rem",
              color: "rgba(255, 255, 255, 0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.8rem",
              margin: "0.4rem 0 0 0",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <MapPin size={16} aria-hidden="true" />
              Comunidad: <strong>{brigada.lugar || "Por confirmar"}</strong>
            </span>
            {brigada.municipio && <span>({brigada.municipio})</span>}
          </p>

          <p
            style={{
              fontSize: "1.4rem",
              color: "rgba(255, 255, 255, 0.85)",
              margin: "0.4rem 0 0 0",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Calendar size={15} aria-hidden="true" />
            Fecha: {formatDate(brigada.fecha_brigada)}
          </p>
        </div>

        {brigada.fecha_brigada && (
          <div style={{ width: "100%", maxWidth: "480px" }}>
            <p
              style={{
                fontSize: "1.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.8)",
                marginBottom: "1rem",
                fontWeight: "bold",
              }}
            >
              Tiempo restante para iniciar
            </p>
            <CountdownCard targetDateStr={brigada.fecha_brigada} />
          </div>
        )}

        {brigada.descripcion && (
          <p
            style={{
              fontSize: "1.4rem",
              color: "rgba(255, 255, 255, 0.88)",
              maxWidth: "640px",
              lineHeight: "1.55",
              margin: "0",
              fontStyle: "italic",
            }}
          >
            &quot;{brigada.descripcion}&quot;
          </p>
        )}

        <div style={{ marginTop: "0.6rem", display: "flex", gap: "1.2rem", flexWrap: "wrap", justifyContent: "center" }}>
          {canRegister ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                background: "#fff",
                color: "var(--primaryDark)",
                padding: "1.2rem 2.8rem",
                borderRadius: "50px",
                fontSize: "1.5rem",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
                transition: "all 0.2s ease-in-out",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.8rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
              }}
            >
              <FileText size={18} aria-hidden="true" />
              Inscribirse como Voluntario
            </button>
          ) : isCupoLleno ? (
            <span
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
                padding: "1.2rem 2.4rem",
                borderRadius: "50px",
                fontSize: "1.45rem",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Lock size={16} aria-hidden="true" />
              Cupo Máximo Alcanzado
            </span>
          ) : (
            <span
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
                padding: "1.2rem 2.4rem",
                borderRadius: "50px",
                fontSize: "1.45rem",
                fontWeight: "bold",
                display: "inline-block",
              }}
            >
              Inscripciones Cerradas
            </span>
          )}
        </div>
      </div>

      <InscripcionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        brigada={brigada}
      />
    </>
  );
}
