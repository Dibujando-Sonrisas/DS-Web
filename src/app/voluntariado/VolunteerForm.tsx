"use client";

import React, { useState } from "react";
import { inscribirVoluntarioAction } from "./actions";
import styles from "../../styles/pages/volunteer.module.css";
import { Check, CircleAlert } from "lucide-react";

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

/** Solicitud general de voluntariado: sin brigada; a una brigada se inscribe desde su anuncio. */
export default function VolunteerForm() {
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

    const { error: actionError } = await inscribirVoluntarioAction({
      brigada_id: null,
      nombre_completo: nombreCompleto,
      correo,
      telefono,
      area_interes: areaInteres,
    }).catch(() => ({
      error: "Hubo un error al enviar tu solicitud. Intenta de nuevo.",
    }));

    if (actionError) {
      setError(actionError);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className={`${styles.form} form-success`} role="status">
        <Check size={24} strokeWidth={2.5} aria-hidden="true" />
        ¡Tu solicitud de voluntariado ha sido enviada! Te enviamos un correo
        de confirmación. Un coordinador la revisará pronto y, cuando sea
        aprobada, recibirás otro correo con las instrucciones para entrar a tu
        cuenta de voluntario.
      </div>
    );
  }

  return (
    <form className={`${styles.form} card-soft card-drawn`} onSubmit={handleSubmit}>
      <fieldset className={styles.fieldset}>
        <div className="form-grid">
          {/* Nombre Completo */}
          <div className="form-field">
            <label htmlFor="nombre_completo">Nombre Completo *</label>
            <input
              className="form-input"
              id="nombre_completo"
              name="nombre_completo"
              maxLength={150}
              type="text"
              placeholder="María García Rodríguez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Correo Electrónico */}
          <div className="form-field">
            <label htmlFor="correo">Correo Electrónico *</label>
            <input
              className="form-input"
              id="correo"
              name="correo"
              maxLength={150}
              type="email"
              placeholder="maria@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Número de Teléfono */}
          <div className="form-field">
            <label htmlFor="telefono">Número de Teléfono *</label>
            <input
              className="form-input"
              id="telefono"
              name="telefono"
              maxLength={20}
              type="tel"
              placeholder="+504 9999-9999"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Área de Interés */}
          <div className="form-field">
            <label htmlFor="area_interes">Área de Interés *</label>
            <select
              className="form-input"
              id="area_interes"
              name="area_interes"
              value={areaInteres}
              onChange={(e) => setAreaInteres(e.target.value)}
              required
              disabled={loading}
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
          <p className="form-error" role="alert">
            <CircleAlert size={16} strokeWidth={2.5} aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="form-actions">
          <button
            className="btn-primary"
            type="submit"
            id="btnVoluntario"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Quiero ser voluntario"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
