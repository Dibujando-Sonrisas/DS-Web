"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import type { Brigada, EstadoBrigada } from "@/lib/db/brigadas";
import { generarCodigoBrigada } from "../actions";
import { CircleAlert, Hash, LoaderCircle } from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

// Lista oficial de Departamentos de Honduras (Prueba 5: Valores válidos)
const DEPARTAMENTOS_HONDURAS = [
  "Atlántida",
  "Choluteca",
  "Colón",
  "Comayagua",
  "Copán",
  "Cortés",
  "El Paraíso",
  "Francisco Morazán",
  "Gracias a Dios",
  "Intibucá",
  "Islas de la Bahía",
  "La Paz",
  "Lempira",
  "Ocotepeque",
  "Olancho",
  "Santa Bárbara",
  "Valle",
  "Yoro",
] as const;

// Esquema Zod de validación estricta (Capítulo 15 - Análisis y Diseño de Datos)
const brigadaSchema = z
  .object({
    id: z.string().optional(),
    codigo: z.string().optional(),
    nombre: z
      .string()
      .trim()
      .min(5, "Prueba de longitud: El nombre de la brigada debe tener al menos 5 caracteres.")
      .max(100, "Prueba de longitud: El nombre no debe exceder 100 caracteres."),
    lugar: z
      .string()
      .trim()
      .min(3, "Prueba de presencia: El lugar o comunidad debe tener al menos 3 caracteres.")
      .max(150, "Prueba de longitud: El lugar no debe exceder 150 caracteres."),
    municipio: z
      .string()
      .trim()
      .min(2, "Prueba de presencia: El municipio es obligatorio.")
      .max(100, "Prueba de longitud: El municipio no debe exceder 100 caracteres."),
    departamento: z
      .string()
      .min(1, "Prueba de valores válidos: Selecciona un departamento oficial de Honduras."),
    fecha_brigada: z
      .string()
      .min(1, "Prueba de presencia: La fecha y hora del evento son obligatorias."),
    fecha_inicio_inscripcion: z
      .string()
      .min(1, "Prueba de presencia: La fecha de inicio de inscripción es obligatoria."),
    fecha_fin_inscripcion: z
      .string()
      .min(1, "Prueba de presencia: La fecha de fin de inscripción es obligatoria."),
    descripcion: z
      .string()
      .max(500, "Prueba de longitud: La descripción no debe exceder 500 caracteres.")
      .optional()
      .or(z.literal("")),
    estado: z.enum(
      ["inscripciones_abiertas", "inscripciones_cerradas", "finalizada", "cancelada"],
      { message: "Prueba de valores válidos: Selecciona un estado válido." }
    ),
    presupuesto_estimado: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
      z
        .number({ message: "Prueba de clase: El presupuesto debe ser numérico." })
        .min(0, "Prueba de sensatez: El presupuesto no puede ser negativo.")
    ),
    capacidad_voluntarios: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number({ message: "Prueba de clase: La capacidad debe ser un número entero." })
        .int("Prueba de composición: La capacidad debe ser un entero.")
        .min(1, "Prueba de sensatez: La capacidad debe ser de al menos 1 voluntario.")
        .nullable()
        .optional()
    ),
    imagen_banner: z
      .string()
      .url("Prueba de composición: Ingresa una URL válida (ej. https://...)")
      .optional()
      .or(z.literal(""))
      .nullable(),
    latitud: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number({ message: "Prueba de clase: La latitud debe ser numérica." })
        .min(-90, "Prueba de sensatez: La latitud mínima es -90°.")
        .max(90, "Prueba de sensatez: La latitud máxima es 90°.")
        .nullable()
        .optional()
    ),
    longitud: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number({ message: "Prueba de clase: La longitud debe ser numérica." })
        .min(-180, "Prueba de sensatez: La longitud mínima es -180°.")
        .max(180, "Prueba de sensatez: La longitud máxima es 180°.")
        .nullable()
        .optional()
    ),
  })
  .refine(
    (data) => {
      if (!data.fecha_inicio_inscripcion || !data.fecha_fin_inscripcion) return true;
      return new Date(data.fecha_inicio_inscripcion) <= new Date(data.fecha_fin_inscripcion);
    },
    {
      message: "Prueba de referencia cruzada: El inicio de inscripción debe ser previo o igual al fin de inscripción.",
      path: ["fecha_inicio_inscripcion"],
    }
  )
  .refine(
    (data) => {
      if (!data.fecha_fin_inscripcion || !data.fecha_brigada) return true;
      return new Date(data.fecha_fin_inscripcion) <= new Date(data.fecha_brigada);
    },
    {
      message: "Prueba de referencia cruzada: El fin de inscripción no puede ser posterior a la fecha del evento.",
      path: ["fecha_fin_inscripcion"],
    }
  );

type BrigadaFormData = z.infer<typeof brigadaSchema>;

type BrigadaFormProps = {
  mode: "create" | "edit";
  brigada?: Brigada;
  initialBudget?: number;
  onClose: () => void;
  onSubmit: (data: BrigadaFormData) => Promise<void>;
  isSubmitting?: boolean;
};

const ESTADO_LABELS: Record<EstadoBrigada, string> = {
  inscripciones_abiertas: "Inscripciones Abiertas",
  inscripciones_cerradas: "Inscripciones Cerradas",
  finalizada: "Finalizada (Solo Lectura)",
  cancelada: "Cancelada",
};

export default function BrigadaForm({
  mode,
  brigada,
  initialBudget = 0,
  onClose,
  onSubmit,
  isSubmitting = false,
}: BrigadaFormProps) {
  // Conversión de formato ISO a datetime-local (YYYY-MM-DDThh:mm)
  const formatDatetimeLocal = (isoString?: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [codePreview, setCodePreview] = useState<string>(brigada?.codigo || "");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);



  const [formData, setFormData] = useState<Partial<BrigadaFormData>>({
    codigo: brigada?.codigo ?? "",
    nombre: brigada?.nombre ?? "",
    lugar: brigada?.lugar ?? "",
    municipio: brigada?.municipio ?? "",
    departamento: brigada?.departamento ?? "Francisco Morazán",
    fecha_brigada: formatDatetimeLocal(brigada?.fecha_brigada),
    fecha_inicio_inscripcion: formatDatetimeLocal(brigada?.fecha_inicio_inscripcion),
    fecha_fin_inscripcion: formatDatetimeLocal(brigada?.fecha_fin_inscripcion),
    descripcion: brigada?.descripcion ?? "",
    estado: brigada?.estado ?? "inscripciones_cerradas",
    presupuesto_estimado: initialBudget,
    capacidad_voluntarios: brigada?.capacidad_voluntarios ?? null,
    imagen_banner: brigada?.imagen_banner ?? "",
    latitud: brigada?.latitud ?? null,
    longitud: brigada?.longitud ?? null,
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BrigadaFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Carga previa del código autogenerado en modo creación y re-calculo dinámico si cambia la fecha
  useEffect(() => {
    if (mode === "create") {
      generarCodigoBrigada(formData.fecha_brigada).then((res) => {
        if (res.codigo) setCodePreview(res.codigo);
      });
    } else if (brigada?.codigo) {
      setCodePreview(brigada.codigo);
    }
  }, [mode, formData.fecha_brigada, brigada?.codigo]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar mensaje de error específico al escribir
    if (formErrors[name as keyof BrigadaFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) setGeneralError(null);
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validación estricta con Zod
    const result = brigadaSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof BrigadaFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof BrigadaFormData] = issue.message;
        }
      });
      setFormErrors(errors);
      setGeneralError("Existen campos incompletos o con datos inválidos. Revisa el formulario a continuación.");
      return;
    }

    const data = result.data;
    const formattedData = {
      ...data,
      id: mode === "edit" ? brigada?.id : undefined,
      codigo: mode === "edit" ? brigada?.codigo : codePreview,
      fecha_brigada: new Date(data.fecha_brigada).toISOString(),
      fecha_inicio_inscripcion: new Date(data.fecha_inicio_inscripcion).toISOString(),
      fecha_fin_inscripcion: new Date(data.fecha_fin_inscripcion).toISOString(),
    };
    onSubmit(formattedData);
  };

  // mensaje de error bajo cada campo
  const fieldError = (field: keyof BrigadaFormData) =>
    formErrors[field] && (
      <span className="form-error">
        <CircleAlert size={14} aria-hidden="true" />
        {formErrors[field]}
      </span>
    );

  return (
    <>
      <AdminModal
        title={mode === "create" ? "Registrar Nueva Brigada Médica" : "Editar Brigada Médica"}
        size="lg"
        onClose={handleRequestClose}
        busy={isSubmitting}
      >
        <form onSubmit={handleFormSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {/* Banner de errores de validación (HCI: Error Visible) */}
            {generalError && (
              <p className="form-error form-alert" role="alert">
                <CircleAlert aria-hidden="true" />
                <span>{generalError}</span>
              </p>
            )}

            {/* SECCIÓN 1: Autogeneración de Código (Sección 1) */}
            <p className="notice">
              <Hash aria-hidden="true" />
              <span>
                {mode === "create" ? "Código Asignado Automáticamente" : "Código Identificador de Brigada"}
                <strong className={brig.codeValue}>
                  {mode === "create" ? codePreview || "Generando..." : brigada?.codigo}
                </strong>
              </span>
            </p>

            {/* SECCIÓN 2: Información General */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>1. Información General del Evento</h3>
              <div className="form-grid">
                {/* Nombre de Brigada */}
                <label className="form-field form-field-full">
                  <span className="form-label">
                    Nombre de la Brigada <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="nombre"
                    className="form-input"
                    value={formData.nombre || ""}
                    onChange={handleInputChange}
                    placeholder="Ej. Brigada Médica Comunitaria El Hatillo"
                    maxLength={100}
                    required
                  />
                  {fieldError("nombre")}
                </label>

                {/* Fecha y Hora del Evento */}
                <label className="form-field">
                  <span className="form-label">
                    Fecha y Hora de la Brigada <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="fecha_brigada"
                    className="form-input"
                    value={formData.fecha_brigada || ""}
                    onChange={handleInputChange}
                    type="datetime-local"
                    required
                  />
                  {fieldError("fecha_brigada")}
                </label>

                {/* Estado de la Brigada */}
                <label className="form-field">
                  <span className="form-label">
                    Estado de la Brigada <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    name="estado"
                    className="form-input"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="inscripciones_cerradas">
                      {ESTADO_LABELS.inscripciones_cerradas}
                    </option>
                    <option value="inscripciones_abiertas">
                      {ESTADO_LABELS.inscripciones_abiertas}
                    </option>
                    <option value="finalizada">{ESTADO_LABELS.finalizada}</option>
                    <option value="cancelada">{ESTADO_LABELS.cancelada}</option>
                  </select>
                  {fieldError("estado")}
                </label>
              </div>
            </div>

            {/* SECCIÓN 3: Ubicación Geográfica */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>2. Ubicación Geográfica en Honduras</h3>
              <div className="form-grid">
                {/* Departamento */}
                <label className="form-field">
                  <span className="form-label">
                    Departamento <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    name="departamento"
                    className="form-input"
                    value={formData.departamento || ""}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecciona un departamento...</option>
                    {DEPARTAMENTOS_HONDURAS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {fieldError("departamento")}
                </label>

                {/* Municipio */}
                <label className="form-field">
                  <span className="form-label">
                    Municipio <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="municipio"
                    className="form-input"
                    value={formData.municipio || ""}
                    onChange={handleInputChange}
                    placeholder="Ej. Distrito Central / Tegucigalpa"
                    maxLength={100}
                    required
                  />
                  {fieldError("municipio")}
                </label>

                {/* Lugar / Comunidad */}
                <label className="form-field form-field-full">
                  <span className="form-label">
                    Comunidad o Centro de Atención <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="lugar"
                    className="form-input"
                    value={formData.lugar || ""}
                    onChange={handleInputChange}
                    placeholder="Ej. Escuela Primaria Lempira, Aldea El Hatillo"
                    maxLength={150}
                    required
                  />
                  {fieldError("lugar")}
                </label>
              </div>
            </div>

            {/* SECCIÓN 4: Programación de Fechas */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>3. Programación de Fechas</h3>
              <div className="form-grid">
                {/* Fecha Inicio Inscripción */}
                <label className="form-field">
                  <span className="form-label">
                    Apertura de Inscripciones de Voluntarios <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="fecha_inicio_inscripcion"
                    className="form-input"
                    value={formData.fecha_inicio_inscripcion || ""}
                    onChange={handleInputChange}
                    type="datetime-local"
                    required
                  />
                  {fieldError("fecha_inicio_inscripcion")}
                </label>

                {/* Fecha Fin Inscripción */}
                <label className="form-field">
                  <span className="form-label">
                    Cierre de Inscripciones de Voluntarios <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="fecha_fin_inscripcion"
                    className="form-input"
                    value={formData.fecha_fin_inscripcion || ""}
                    onChange={handleInputChange}
                    type="datetime-local"
                    required
                  />
                  {fieldError("fecha_fin_inscripcion")}
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: Presupuesto y Capacidad */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>4. Presupuesto y Logística</h3>
              <div className="form-grid">
                {/* Presupuesto Estimado */}
                <label className="form-field">
                  <span className="form-label">
                    Presupuesto Estimado (HNL) <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    name="presupuesto_estimado"
                    className="form-input"
                    value={formData.presupuesto_estimado ?? ""}
                    onChange={handleInputChange}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 25000.00"
                    required
                  />
                  {fieldError("presupuesto_estimado")}
                </label>

                {/* Capacidad de Voluntarios */}
                <label className="form-field">
                  <span className="form-label">
                    Cupo Máximo de Voluntarios <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    name="capacidad_voluntarios"
                    className="form-input"
                    value={formData.capacidad_voluntarios ?? ""}
                    onChange={handleInputChange}
                    type="number"
                    min="1"
                    placeholder="Ej. 50"
                  />
                  {fieldError("capacidad_voluntarios")}
                </label>
              </div>
            </div>

            {/* SECCIÓN 6: Opciones Adicionales */}
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>5. Multimedia y Geolocalización GPS</h3>
              <div className="form-grid">
                {/* Imagen Banner */}
                <label className="form-field form-field-full">
                  <span className="form-label">
                    Enlace de Imagen Banner <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    name="imagen_banner"
                    className="form-input"
                    value={formData.imagen_banner ?? ""}
                    onChange={handleInputChange}
                    placeholder="https://ejemplo.org/fotos/banner-brigada.jpg"
                  />
                  {fieldError("imagen_banner")}
                </label>

                {/* Latitud */}
                <label className="form-field">
                  <span className="form-label">
                    Latitud GPS <span className="form-optional">(Opcional, rango -90 a 90)</span>
                  </span>
                  <input
                    name="latitud"
                    className="form-input"
                    value={formData.latitud ?? ""}
                    onChange={handleInputChange}
                    type="number"
                    step="any"
                    placeholder="Ej. 14.0818"
                  />
                  {fieldError("latitud")}
                </label>

                {/* Longitud */}
                <label className="form-field">
                  <span className="form-label">
                    Longitud GPS <span className="form-optional">(Opcional, rango -180 a 180)</span>
                  </span>
                  <input
                    name="longitud"
                    className="form-input"
                    value={formData.longitud ?? ""}
                    onChange={handleInputChange}
                    type="number"
                    step="any"
                    placeholder="Ej. -87.2068"
                  />
                  {fieldError("longitud")}
                </label>

                {/* Descripción */}
                <label className="form-field form-field-full">
                  <span className="form-label">
                    Descripción de la Brigada y Servicios <span className="form-optional">(Opcional, máx. 500 caracteres)</span>
                  </span>
                  <textarea
                    name="descripcion"
                    className="form-input"
                    value={formData.descripcion || ""}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={500}
                    placeholder="Describe la logística de atención médica, medicamentos y actividades preparadas..."
                  />
                  {fieldError("descripcion")}
                </label>
              </div>
            </div>
          </div>

          {/* Acciones de formulario (Regla 9: Sin botón reset) */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={handleRequestClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="spin" aria-hidden="true" />}
              {isSubmitting
                ? "Guardando Registros..."
                : mode === "create"
                  ? "Crear Brigada Médica"
                  : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Modal de Advertencia HCI (Prevención de pérdida de cambios no guardados) */}
      {showDiscardModal && (
        <ConfirmDialog
          title="¿Descartar Cambios no Guardados?"
          confirmLabel="Sí, Descartar"
          cancelLabel="Continuar Editando"
          onCancel={() => setShowDiscardModal(false)}
          onConfirm={() => {
            setShowDiscardModal(false);
            onClose();
          }}
        >
          Has introducido modificaciones en el formulario. Si cierras ahora, todos los cambios no guardados se perderán permanentemente.
        </ConfirmDialog>
      )}
    </>
  );
}
