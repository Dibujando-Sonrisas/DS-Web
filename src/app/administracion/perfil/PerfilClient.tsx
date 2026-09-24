"use client";

import React, { useState, useTransition, useRef } from "react";
import { z } from "zod";
import type { Perfil } from "@/lib/auth/session";
import { updateProfileAction, updateAvatarAction } from "../usuarios/actions";
import { supabase } from "@/lib/supabase";
import { Camera, CircleAlert, LoaderCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import AdminToast, { type ToastState } from "../components/AdminToast";
import UserAvatar from "../components/UserAvatar";
import RoleBadge from "../components/RoleBadge";
import StatusBadge from "../components/StatusBadge";
import styles from "@/styles/pages/admin.module.css";
import personas from "@/styles/pages/admin-personas.module.css";

import { phoneHondurasSchema } from "@/lib/validation/validationUtils";

// Zod Validation Schema
const profileSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(3, "Prueba de presencia: El nombre debe tener al menos 3 caracteres.")
    .max(100, "Prueba de longitud: El nombre no puede exceder los 100 caracteres.")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      "Prueba de sintaxis: El nombre solo debe contener letras, acentos y espacios."
    ),
  telefono: phoneHondurasSchema,
  fecha_nacimiento: z.string().or(z.literal("")),
  sexo: z.string().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type PerfilClientProps = {
  profile: Perfil;
  email: string;
  specialtyName: string;
};

export default function PerfilClient({
  profile,
  email,
  specialtyName,
}: PerfilClientProps) {
  const [formData, setFormData] = useState<ProfileFormValues>({
    nombre_completo: profile.nombre_completo || "",
    telefono: profile.telefono || "",
    fecha_nacimiento: profile.fecha_nacimiento || "",
    sexo: profile.sexo || "",
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof ProfileFormValues, string>>
  >({});
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  // Avatar Upload State
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when editing
    if (formErrors[name as keyof ProfileFormValues]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation check
    const validation = profileSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Partial<Record<keyof ProfileFormValues, string>> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof ProfileFormValues] = issue.message;
        }
      });
      setFormErrors(errors);
      showToast("Por favor corrige los errores del formulario.", "error");
      return;
    }

    startTransition(async () => {
      const response = await updateProfileAction(profile.id, formData);
      if (response?.success) {
        showToast(response.message || "Perfil guardado con éxito.", "success");
      } else {
        showToast(response?.error || "Error al actualizar perfil.", "error");
      }
    });
  };

  // Avatar upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 1024 * 1024 * 2) {
      showToast("La imagen no debe pesar más de 2MB.", "error");
      return;
    }

    // Validate format
    if (!file.type.startsWith("image/")) {
      showToast("El archivo seleccionado debe ser una imagen.", "error");
      return;
    }

    // Show local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      // 1. Create directory if not exists: avatars bucket check
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 3. Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 4. Update avatar_url in the perfiles table
      const res = await updateAvatarAction(profile.id, publicUrl);
      if (res?.success) {
        showToast("Fotografía de perfil cargada y guardada.", "success");
      } else {
        throw new Error(res?.error || "Error al actualizar la base de datos.");
      }
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : "Error al subir la fotografía.",
        "error"
      );
      setLocalPreview(null); // revert preview on failure
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mi Perfil"
        description="Configura tus datos personales y fotografía de perfil en la plataforma."
      />

      <div className={styles.layoutAside}>
        {/* Formulario Principal */}
        <section className={styles.panel} aria-labelledby="perfil-informacion">
          <div className={styles.panelHeader}>
            <h2 id="perfil-informacion" className={styles.panelTitle}>
              Información Personal
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={`${styles.panelBody} ${styles.stack}`}>
            <div className="form-grid">
              <label className="form-field form-field-full">
                <span className="form-label">
                  Nombre Completo <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input
                  name="nombre_completo"
                  className="form-input"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  placeholder="Tu nombre completo"
                  required
                  disabled={isPending}
                  aria-invalid={!!formErrors.nombre_completo}
                />
                {formErrors.nombre_completo && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.nombre_completo}
                  </span>
                )}
              </label>

              <label className="form-field">
                <span className="form-label">Número de Teléfono</span>
                <input
                  name="telefono"
                  className="form-input"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="Ej: +504 9999-9999"
                  disabled={isPending}
                  aria-invalid={!!formErrors.telefono}
                />
                {formErrors.telefono && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.telefono}
                  </span>
                )}
              </label>

              <label className="form-field">
                <span className="form-label">Fecha de Nacimiento</span>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  className="form-input"
                  value={formData.fecha_nacimiento}
                  onChange={handleInputChange}
                  disabled={isPending}
                  aria-invalid={!!formErrors.fecha_nacimiento}
                />
                {formErrors.fecha_nacimiento && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.fecha_nacimiento}
                  </span>
                )}
              </label>

              <label className="form-field">
                <span className="form-label">Sexo</span>
                <select
                  name="sexo"
                  className="form-input"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  disabled={isPending}
                  aria-invalid={!!formErrors.sexo}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                {formErrors.sexo && (
                  <span className="form-error">
                    <CircleAlert size={14} aria-hidden="true" />
                    {formErrors.sexo}
                  </span>
                )}
              </label>
            </div>

            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={isPending || uploadingAvatar}
            >
              {isPending && <LoaderCircle className="spin" aria-hidden="true" />}
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </section>

        {/* Tarjeta Lateral de Avatar y Roles */}
        <section
          className={`${styles.panel} ${styles.sticky}`}
          aria-labelledby="perfil-foto-roles"
        >
          <div className={styles.panelHeader}>
            <h2 id="perfil-foto-roles" className={styles.panelTitle}>
              Fotografía y Roles
            </h2>
          </div>

          <div className={`${styles.panelBody} ${styles.stack}`}>
            {/* Foto de Perfil */}
            <div className={personas.avatarRing}>
              <UserAvatar
                avatarUrl={localPreview || profile.avatar_url}
                nombres={formData.nombre_completo || profile.nombre_completo}
                email={email}
                size={120}
              />
              {uploadingAvatar && (
                <span className={personas.avatarBusy}>
                  <LoaderCircle className="spin" aria-hidden="true" />
                </span>
              )}
            </div>

            {/* Dropzone de Carga: el input invisible cubre toda la zona */}
            <label className={styles.dropzone}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.dropzoneInput}
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
              <Camera aria-hidden="true" />
              <span className={styles.dropzoneText}>
                <strong>Sube una foto</strong> o arrástrala aquí.
              </span>
              <span className="form-hint">PNG, JPG o WEBP (máx. 2MB)</span>
            </label>

            {/* Detalles de Cuenta (Read Only) */}
            <dl className={styles.kv}>
              <dt>Correo</dt>
              <dd>{email}</dd>
              <dt>Rol</dt>
              <dd>
                {profile.rol ? (
                  <RoleBadge role={profile.rol} />
                ) : (
                  <span className={`${styles.badge} ${styles.badgeWarning}`}>Pendiente</span>
                )}
              </dd>
              <dt>Especialidad</dt>
              <dd>{specialtyName}</dd>
              <dt>Cargo</dt>
              <dd>{profile.cargo || "Ninguno"}</dd>
              <dt>Estado</dt>
              <dd>
                <StatusBadge activo={profile.activo} />
              </dd>
            </dl>
          </div>
        </section>
      </div>

      {/* Toast de Notificaciones */}
      <AdminToast toast={toast} />
    </div>
  );
}
