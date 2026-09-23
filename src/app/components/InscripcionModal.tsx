"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "@/styles/components/inscripcion-modal.module.css";
import { Calendar, Check, CircleAlert, Heart, Loader, LoaderCircle, LogIn, MapPin, UserPlus, X } from "lucide-react";

export const AREAS_INTERES_LIST = [
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

export interface BrigadaModalInfo {
  id: string;
  nombre: string;
  lugar?: string | null;
  fecha_brigada?: string | null;
  codigo?: string | null;
}

type InscripcionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  brigada: BrigadaModalInfo | null;
  onSuccess?: () => void;
};

export default function InscripcionModal({
  isOpen,
  onClose,
  brigada,
  onSuccess,
}: InscripcionModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [areaInteres, setAreaInteres] = useState("Registro");
  const [profesion, setProfesion] = useState("");
  const [comentarios, setComentarios] = useState("");

  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset form when modal opens with new brigade
  useEffect(() => {
    if (isOpen) {
      setSubmittedSuccess(false);
      setGeneralError("");
      setFormErrors({});
    }
  }, [isOpen, brigada?.id]);

  if (!isOpen || !brigada) return null;

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!nombreCompleto.trim() || nombreCompleto.trim().length < 3) {
      errors.nombreCompleto = "Ingresa tu nombre completo (mínimo 3 caracteres).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correo.trim()) {
      errors.correo = "El correo electrónico es requerido.";
    } else if (!emailRegex.test(correo.trim())) {
      errors.correo = "Ingresa un formato de correo válido (ej. nombre@correo.com).";
    }

    const cleanPhone = telefono.replace(/\D/g, "");
    if (!telefono.trim()) {
      errors.telefono = "El número de teléfono es requerido.";
    } else if (cleanPhone.length < 7) {
      errors.telefono = "Ingresa un número telefónico válido (mínimo 7 dígitos).";
    }

    if (!areaInteres) {
      errors.areaInteres = "Selecciona un área de interés.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("inscripciones_voluntarios")
        .insert({
          brigada_id: brigada.id,
          nombre_completo: nombreCompleto.trim(),
          correo: correo.trim().toLowerCase(),
          telefono: telefono.trim(),
          area_interes: areaInteres,
          profesion: profesion.trim() || null,
          comentarios: comentarios.trim() || null,
          estado: "pendiente",
        });

      if (insertError) {
        throw new Error(insertError.message || "Error al registrar la solicitud.");
      }

      setSubmittedSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar tu solicitud. Intenta de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-HN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>

        {!submittedSuccess ? (
          <>
            <div className={styles.header}>
              <span className={styles.badge}>
                <Heart size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} aria-hidden="true" />
                Inscripción a Brigada Médica
              </span>
              <h2 className={styles.title} id="modal-title">
                {brigada.nombre}
              </h2>
              <p className={styles.subtitle} style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
                {brigada.lugar && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <MapPin size={15} aria-hidden="true" />
                    {brigada.lugar}
                  </span>
                )}
                {brigada.fecha_brigada && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <Calendar size={15} aria-hidden="true" />
                    {formatDate(brigada.fecha_brigada)}
                  </span>
                )}
              </p>
            </div>

            <div className={styles.body}>
              {generalError && (
                <div className={styles.alertError} role="alert">
                  <CircleAlert size={20} />
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.formGrid}>
                  {/* Nombre Completo */}
                  <div className={styles.fieldFull}>
                    <label className={styles.label} htmlFor="modal_nombre">
                      Nombre Completo *
                    </label>
                    <input
                      id="modal_nombre"
                      type="text"
                      className={styles.input}
                      placeholder="Ej. María García Rodríguez"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      disabled={loading}
                      required
                    />
                    {formErrors.nombreCompleto && (
                      <span className={styles.errorText}>
                        {formErrors.nombreCompleto}
                      </span>
                    )}
                  </div>

                  {/* Correo Electrónico */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="modal_correo">
                      Correo Electrónico *
                    </label>
                    <input
                      id="modal_correo"
                      type="email"
                      className={styles.input}
                      placeholder="maria@ejemplo.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      disabled={loading}
                      required
                    />
                    {formErrors.correo && (
                      <span className={styles.errorText}>
                        {formErrors.correo}
                      </span>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="modal_telefono">
                      Número de Teléfono / WhatsApp *
                    </label>
                    <input
                      id="modal_telefono"
                      type="tel"
                      className={styles.input}
                      placeholder="+504 9999-9999"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      disabled={loading}
                      required
                    />
                    {formErrors.telefono && (
                      <span className={styles.errorText}>
                        {formErrors.telefono}
                      </span>
                    )}
                  </div>

                  {/* Área de Interés */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="modal_area">
                      Área de Interés *
                    </label>
                    <select
                      id="modal_area"
                      className={styles.select}
                      value={areaInteres}
                      onChange={(e) => setAreaInteres(e.target.value)}
                      disabled={loading}
                      required
                    >
                      {AREAS_INTERES_LIST.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    {formErrors.areaInteres && (
                      <span className={styles.errorText}>
                        {formErrors.areaInteres}
                      </span>
                    )}
                  </div>

                  {/* Profesión / Oficio */}
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="modal_profesion">
                      Profesión / Oficio (Opcional)
                    </label>
                    <input
                      id="modal_profesion"
                      type="text"
                      className={styles.input}
                      placeholder="Ej. Médico General, Estudiante, Enfermero..."
                      value={profesion}
                      onChange={(e) => setProfesion(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Comentarios o Disponibilidad */}
                  <div className={styles.fieldFull}>
                    <label className={styles.label} htmlFor="modal_comentarios">
                      Comentarios o Disponibilidad (Opcional)
                    </label>
                    <textarea
                      id="modal_comentarios"
                      className={styles.textarea}
                      rows={3}
                      placeholder="¿Tienes alguna experiencia previa o disponibilidad especial?"
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.btnSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} />
                        Enviando solicitud...
                      </>
                    ) : (
                      "Enviar Solicitud de Inscripción"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* ── PANTALLA DE ÉXITO Y REGISTRO / LOGIN ── */
          <div className={styles.successContainer}>
            <div className={styles.successIconCircle}>
              <Check size={36} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h2 className={styles.successTitle}>¡Solicitud Enviada con Éxito!</h2>
            <p className={styles.successDesc}>
              Hemos recibido tu postulación para <strong>{brigada.nombre}</strong>.
              El equipo coordinador de Dibujando Sonrisas revisará tus datos y se
              pondrá en contacto contigo vía WhatsApp o correo electrónico.
            </p>

            <div className={styles.accountPromptBox}>
              <div className={styles.accountPromptHeading}>
                <Loader size={18} aria-hidden="true" />
                <span>¿Deseas dar seguimiento a tus voluntariados?</span>
              </div>
              <p className={styles.accountPromptText}>
                Te invitamos a <strong>iniciar sesión</strong> o <strong>crear una cuenta</strong> en nuestra plataforma para gestionar tu perfil de voluntario, consultar tus asignaciones en brigadas y descargar tus constancias de participación.
              </p>
              <div className={styles.accountButtons}>
                <Link
                  href="/auth/registro"
                  className={styles.btnPromptPrimary}
                  onClick={onClose}
                >
                  <UserPlus size={16} />
                  Crear mi Cuenta
                </Link>
                <Link
                  href="/auth/login"
                  className={styles.btnPromptSecondary}
                  onClick={onClose}
                >
                  <LogIn size={16} />
                  Iniciar Sesión
                </Link>
              </div>
            </div>

            <button className={styles.btnCloseModal} onClick={onClose}>
              Entendido, cerrar esta ventana
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
