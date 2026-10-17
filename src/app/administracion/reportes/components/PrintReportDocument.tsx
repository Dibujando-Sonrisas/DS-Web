"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import styles from "@/styles/pages/reportes.module.css";

export interface MetaItem {
  label: string;
  value: string | number;
}

export interface SummaryCard {
  label: string;
  value: string | number;
}

interface PrintReportDocumentProps {
  title: string;
  userRole?: string;
  metaItems?: MetaItem[];
  summaryCards?: SummaryCard[];
  children: React.ReactNode;
  footerNote?: string;
}

export default function PrintReportDocument({
  title,
  userRole = "Administrador",
  metaItems = [],
  summaryCards = [],
  children,
  footerNote = "Reporte de control interno — Fundación Dibujando Sonrisas",
}: PrintReportDocumentProps) {
  const [fechaGeneracion, setFechaGeneracion] = useState("");

  useEffect(() => {
    setFechaGeneracion(
      new Date().toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  return (
    <div className={styles.printOnlyDocument}>
      {/* Membrete Oficial Institucional */}
      <div className={styles.printHeaderBlock}>
        <div className={styles.printBrandRow}>
          <Image
            src="/logo.png"
            alt="Logo Fundación Dibujando Sonrisas"
            width={52}
            height={52}
            loading="eager"
          />
          <div>
            <h1 className={styles.printFoundationTitle}>
              Fundación Dibujando Sonrisas
            </h1>
            <p className={styles.printSystemSubtitle}>
              Sistema Web de Gestión Integral
            </p>
          </div>
        </div>

        <h2 className={styles.printReportTitle}>{title.toUpperCase()}</h2>

        <div className={styles.printMetaGrid}>
          <div className={styles.printMetaItem}>
            <strong>Solicitado por:</strong> {userRole}
          </div>
          <div className={styles.printMetaItem}>
            <strong>Fecha de Generación:</strong> {fechaGeneracion}
          </div>
          {metaItems.map((item) => (
            <div key={item.label} className={styles.printMetaItem}>
              <strong>{item.label}:</strong> {item.value}
            </div>
          ))}
        </div>
      </div>

      {/* Tarjetas Resumen si aplican */}
      {summaryCards.length > 0 && (
        <div className={styles.printSummaryGrid}>
          {summaryCards.map((card) => (
            <div key={card.label} className={styles.printSummaryCard}>
              <span className={styles.printSummaryCardLabel}>{card.label}</span>
              <span className={styles.printSummaryCardValue}>{card.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cuerpos del reporte (Tablas, gráficos, etc.) */}
      <div className={styles.printBodyContent}>{children}</div>

      {/* Pie de Página Fijo con Numeración Automática */}
      <div className={styles.printDocumentFooter}>
        <span>{footerNote}</span>
        <span className={styles.printDocumentPageNumber}></span>
      </div>
    </div>
  );
}
