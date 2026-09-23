"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "@/styles/components/inscripcion-modal.module.css";
import {
  Calendar,
  Check,
  CircleAlert,
  ClipboardCheck,
  Heart,
  LoaderCircle,
  LogIn,
  MapPin,
  Send,
  UserPlus,
  X,
} from "lucide-react";

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

  // Mensaje de error bajo el campo, enlazado por aria-describedby
  const fieldError = (key: string, id: string) =>
    formErrors[key] && (
      <span id={id} className={`form-error ${styles.fieldError}`}>
        {formErrors[key]}
      </span>
    );

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
      <div className={`${styles.modal} card-soft`}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X aria-hidden="true" />
        </button>

        {!submittedSuccess ? (
          <>
            <header className={styles.header}>
              <span className={styles.badge}>
                <Heart aria-hidden="true" />
                Inscripción a brigada médica
              </span>
              <h2 className={styles.title} id="modal-title">
                {brigada.nombre}
              </h2>
              <div className="crayons" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <ul className={styles.meta}>
                {brigada.lugar && (
                  <li>
                    <MapPin aria-hidden="true" />
                    {brigada.lugar}
                  </li>
                )}
                {brigada.fecha_brigada && (
                  <li>
                    <Calendar aria-hidden="true" />
                    {formatDate(brigada.fecha_brigada)}
                  </li>
                )}
              </ul>
            </header>

            <div className={styles.body}>
              {generalError && (
                <p className={`form-error ${styles.alertError}`} role="alert">
                  <CircleAlert aria-hidden="true" />
                  {generalError}
                </p>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                  <div className="form-field form-field-full">
                    <label htmlFor="modal_nombre">Nombre Completo *</label>
                    <input
                      id="modal_nombre"
                      type="text"
                      className="form-input"
                      placeholder="Ej. María García Rodríguez"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      disabled={loading}
                      required
                      autoFocus
                      aria-invalid={!!formErrors.nombreCompleto}
                      aria-describedby={formErrors.nombreCompleto ? "err_nombre" : undefined}
                    />
                    {fieldError("nombreCompleto", "err_nombre")}
                  </div>

                  <div className="form-field">
                    <label htmlFor="modal_correo">Correo Electrónico *</label>
                    <input
                      id="modal_correo"
                      type="email"
                      className="form-input"
                      placeholder="maria@ejemplo.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      disabled={loading}
                      required
                      aria-invalid={!!formErrors.correo}
                      aria-describedby={formErrors.correo ? "err_correo" : undefined}
                    />
                    {fieldError("correo", "err_correo")}
                  </div>

                  <div className="form-field">
                    <label htmlFor="modal_telefono">Teléfono / WhatsApp *</label>
                    <input
                      id="modal_telefono"
                      type="tel"
                      className="form-input"
                      placeholder="+504 9999-9999"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      disabled={loading}
                      required
                      aria-invalid={!!formErrors.telefono}
                      aria-describedby={formErrors.telefono ? "err_telefono" : undefined}
                    />
                    {fieldError("telefono", "err_telefono")}
                  </div>

                  <div className="form-field">
                    <label htmlFor="modal_area">Área de Interés *</label>
                    <select
                      id="modal_area"
                      className="form-input"
                      value={areaInteres}
                      onChange={(e) => setAreaInteres(e.target.value)}
                      disabled={loading}
                      required
                      aria-invalid={!!formErrors.areaInteres}
                      aria-describedby={formErrors.areaInteres ? "err_area" : undefined}
                    >
                      {AREAS_INTERES_LIST.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    {fieldError("areaInteres", "err_area")}
                  </div>

                  <div className="form-field">
                    <label htmlFor="modal_profesion">Profesión / Oficio (Opcional)</label>
                    <input
                      id="modal_profesion"
                      type="text"
                      className="form-input"
                      placeholder="Ej. Médico, Estudiante, Enfermero..."
                      value={profesion}
                      onChange={(e) => setProfesion(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-field form-field-full">
                    <label htmlFor="modal_comentarios">
                      Comentarios o Disponibilidad (Opcional)
                    </label>
                    <textarea
                      id="modal_comentarios"
                      className={`form-input ${styles.textarea}`}
                      rows={3}
                      placeholder="¿Tienes alguna experiencia previa o disponibilidad especial?"
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={`form-actions ${styles.actions}`}>
                  <button
                    type="button"
                    className="btn-outline-blue"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <LoaderCircle className="spin" aria-hidden="true" />
                        Enviando solicitud...
                      </>
                    ) : (
                      <>
                        Enviar Solicitud
                        <Send aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* ── PANTALLA DE ÉXITO Y REGISTRO / LOGIN ── */
          <div className={styles.success} role="status">
            <div className={`${styles.successIcon} icon-circle tone-primary`} aria-hidden="true">
              <Check strokeWidth={2.5} />
            </div>
            <h2 className={styles.successTitle} id="modal-title">
              ¡Solicitud enviada con éxito!
            </h2>
            <p className={styles.successDesc}>
              Hemos recibido tu postulación para <strong>{brigada.nombre}</strong>.
              El equipo coordinador de Dibujando Sonrisas revisará tus datos y se
              pondrá en contacto contigo vía WhatsApp o correo electrónico.
            </p>

            <div className={`${styles.accountPrompt} card-drawn tone-secondary`}>
              <p className={styles.accountHeading}>
                <ClipboardCheck aria-hidden="true" />
                ¿Deseas dar seguimiento a tus voluntariados?
              </p>
              <p className={styles.accountText}>
                <strong>Inicia sesión</strong> o <strong>crea una cuenta</strong>{" "}
                para gestionar tu perfil de voluntario, consultar tus asignaciones
                y descargar tus constancias de participación.
              </p>
              <div className={styles.accountButtons}>
                <Link href="/auth/registro" className="btn-primary" onClick={onClose}>
                  <UserPlus aria-hidden="true" />
                  Crear mi Cuenta
                </Link>
                <Link href="/auth/login" className="btn-outline-blue" onClick={onClose}>
                  <LogIn aria-hidden="true" />
                  Iniciar Sesión
                </Link>
              </div>
            </div>

            <button type="button" className={styles.btnDismiss} onClick={onClose}>
              Entendido, cerrar esta ventana
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
