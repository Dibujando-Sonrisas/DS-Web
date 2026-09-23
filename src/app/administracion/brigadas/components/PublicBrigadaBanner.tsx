"use client";

import React, { useState } from "react";
import type { Brigada } from "@/lib/db/brigadas";
import CountdownCard from "./CountdownCard";
import InscripcionModal from "@/app/components/InscripcionModal";

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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
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
