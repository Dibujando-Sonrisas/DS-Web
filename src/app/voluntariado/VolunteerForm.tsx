"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../../styles/pages/volunteer.module.css";

type VolunteerFormProps = {
  activeBrigadaId: string;
};

const AREAS_INTERES = [
  "Registro",
  "Preclínica",
  "Consulta Médica",
  "Consulta Odontológica",
  "Farmacia",
  "Postclínica",
  "Donaciones / Ropa",
  "Actividades Infantiles",
  "Logística",
  "Coordinación",
];

export default function VolunteerForm({ activeBrigadaId }: VolunteerFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [areaInteres, setAreaInteres] = useState("Registro");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: sbError } = await supabase
        .from("inscripciones_voluntarios")
        .insert({
          brigada_id: activeBrigadaId,
          nombre_completo: nombreCompleto.trim(),
          correo: correo.trim().toLowerCase(),
          telefono: telefono.trim(),
          area_interes: areaInteres,
          estado: "pendiente",
        });

      if (sbError) {
        console.error("Error inserting registration:", sbError);
        throw new Error(sbError.message || "Error al enviar solicitud.");
      }

      setSuccess(true);
      setNombreCompleto("");
      setCorreo("");
      setTelefono("");
      setAreaInteres("Registro");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Hubo un error al enviar tu solicitud. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.form}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.2rem", padding: "2rem 1rem" }}>
          <div
            style={{
              width: "5.6rem",
              height: "5.6rem",
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className={styles.successMsg} style={{ margin: 0, padding: 0 }}>
            ¡Tu solicitud de inscripción ha sido enviada correctamente! Un
            coordinador de Dibujando Sonrisas revisará tus datos y se pondrá en
            contacto contigo pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} id="formulario" onSubmit={handleSubmit}>
      <fieldset style={{ border: "none", padding: 0 }}>
        <div className={styles.formGrid}>
          {/* Nombre Completo */}
          <div className={styles.campo}>
            <label htmlFor="nombre_completo">Nombre Completo *</label>
            <input
              className={styles.input}
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              placeholder="María García Rodríguez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Correo Electrónico */}
          <div className={styles.campo}>
            <label htmlFor="correo">Correo Electrónico *</label>
            <input
              className={styles.input}
              id="correo"
              name="correo"
              type="email"
              placeholder="maria@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Número de Teléfono */}
          <div className={styles.campo}>
            <label htmlFor="telefono">Número de Teléfono *</label>
            <input
              className={styles.input}
              id="telefono"
              name="telefono"
              type="tel"
              placeholder="+504 9999-9999"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Área de Interés */}
          <div className={styles.campo}>
            <label htmlFor="area_interes">Área de Interés *</label>
            <select
              className={styles.input}
              id="area_interes"
              name="area_interes"
              value={areaInteres}
              onChange={(e) => setAreaInteres(e.target.value)}
              required
              disabled={loading}
              style={{ height: "4.8rem", width: "100%", padding: "0 1.2rem" }}
            >
              {AREAS_INTERES.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "#dc2626",
              fontSize: "1.4rem",
              marginTop: "1rem",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}

        <div className={styles.submitRow}>
          <button
            className={styles.submitBtn}
            type="submit"
            id="btnVoluntario"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Inscribirme en esta Brigada"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
