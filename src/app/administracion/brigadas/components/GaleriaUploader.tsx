"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, ImagePlus, LoaderCircle, X } from "lucide-react";
import { subirImagenBrigadaStorageAction } from "../actions";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

type GaleriaUploaderProps = {
  brigadaId: string;
  brigadaCodigo: string;
  existingImages: { id: string; nombre_archivo: string; orden: number }[];
  onUploadSuccess: () => void;
  isReadOnly?: boolean;
};

type FilePreview = {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  );
};

export default function GaleriaUploader({
  brigadaId,
  brigadaCodigo,
  existingImages,
  onUploadSuccess,
  isReadOnly = false,
}: GaleriaUploaderProps) {
  const [selectedImages, setSelectedImages] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Convierte cualquier formato de imagen (incluyendo HEIC / HEIF de iPhone, PNG, WEBP, etc.)
   * al formato estándar único JPEG (.jpg) optimizado para web mediante heic2any y Canvas.
   */
  const convertImageToJpg = async (file: File): Promise<Blob> => {
    let sourceBlob: Blob = file;

    // 1. Decodificación cliente para archivos HEIC/HEIF
    if (isHeicFile(file)) {
      try {
        // @ts-ignore
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.85,
        });
        sourceBlob = Array.isArray(converted) ? converted[0] : converted;
      } catch (heicErr) {
        throw new Error(`No se pudo decodificar la foto HEIC ${file.name}.`);
      }
    }

    // 2. Renderizado en Canvas para aplanado y compresión JPG (máximo 1600px)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(sourceBlob);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 1600;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del lienzo canvas."));
          return;
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Falló la conversión al formato único JPG."));
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        reject(new Error(`Error al decodificar la imagen ${file.name}.`));
      };
    });
  };

  const handleFiles = async (files: FileList) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const selectedList = Array.from(files);

    const imageFiles = selectedList.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        file.type.startsWith("image/") ||
        name.endsWith(".heic") ||
        name.endsWith(".heif")
      );
    });

    if (imageFiles.length === 0) {
      setErrorMsg("Selecciona únicamente archivos de imagen válidos (.jpg, .png, .webp, .heic, .heif).");
      return;
    }

    // 2. Validación de Tamaño en Cliente (< 15 MB)
    const validFiles: File[] = [];
    const overweightFiles: string[] = [];

    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        overweightFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (overweightFiles.length > 0) {
      if (overweightFiles.length === 1) {
        setErrorMsg(`El archivo ${overweightFiles[0]} supera el límite de 15 MB. Por favor, selecciona imágenes más ligeras.`);
      } else {
        setErrorMsg(`Los siguientes archivos superan el límite de 15 MB: ${overweightFiles.join(", ")}. Por favor, selecciona imágenes más ligeras.`);
      }
    }

    if (validFiles.length === 0) return;

    setUploadStatusMsg("Generando vistas previas...");

    try {
      const newPreviews: FilePreview[] = [];

      // Procesamiento secuencial con bucle for...of para evitar saturación de memoria
      for (const file of validFiles) {
        let previewUrl = "";
        if (isHeicFile(file)) {
          try {
            // @ts-ignore
            const heic2any = (await import("heic2any")).default;
            const converted = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.7,
            });
            const jpgBlob = Array.isArray(converted) ? converted[0] : converted;
            previewUrl = URL.createObjectURL(jpgBlob);
          } catch {
            previewUrl = URL.createObjectURL(file);
          }
        } else {
          previewUrl = URL.createObjectURL(file);
        }

        newPreviews.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl,
          isCover: false,
        });
      }

      setSelectedImages((prev) => [...prev, ...newPreviews]);
    } catch {
      setErrorMsg("Error al generar vista previa de algunas imágenes.");
    } finally {
      setUploadStatusMsg("");
    }
  };

  const removeSelectedImage = (id: string) => {
    setSelectedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const toggleCover = (id: string) => {
    setSelectedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isCover: img.id === id ? !img.isCover : false,
      }))
    );
  };

  /**
   * Subida Secuencial con Bucle For (Secuencial 1 a 1)
   * Manejo de Reintentos y Excepciones individuales por archivo para evitar saturación de red ('fetch failed').
   */
  const handleUpload = async () => {
    if (selectedImages.length === 0) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let successCount = 0;
    const failedFiles: string[] = [];

    // Bucle secuencial 1 por 1
    for (let i = 0; i < selectedImages.length; i++) {
      const item = selectedImages[i];
      const isHeic = isHeicFile(item.file);

      setUploadStatusMsg(
        isHeic
          ? `Decodificando HEIC y subiendo foto ${i + 1} de ${selectedImages.length}: ${item.file.name}...`
          : `Procesando y subiendo foto ${i + 1} de ${selectedImages.length}: ${item.file.name}...`
      );

      try {
        // 1. Convertir imagen a Blob JPG comprimido
        const jpgBlob = await convertImageToJpg(item.file);

        // 2. Crear FormData individual por archivo
        const formData = new FormData();
        formData.append("brigadaId", brigadaId);
        formData.append("brigadaCodigo", brigadaCodigo);
        formData.append("portada", item.isCover ? "true" : "false");
        formData.append("file", new File([jpgBlob], item.file.name, { type: "image/jpeg" }));

        // 3. Ejecutar subida mediante Server Action autenticada
        const res = await subirImagenBrigadaStorageAction(formData);

        if (res.error) {
          failedFiles.push(`${item.file.name} (${res.error})`);
        } else {
          successCount++;
        }
      } catch (err) {
        // Captura de excepción individual sin detener el bucle
        const errorMsgDetail = err instanceof Error ? err.message : "Error de conexión o red";
        failedFiles.push(`${item.file.name} (${errorMsgDetail})`);
      }
    }

    // Informe detallado de resultados
    if (failedFiles.length > 0) {
      setErrorMsg(
        `No se pudieron subir ${failedFiles.length} foto(s): ${failedFiles.join("; ")}.`
      );
    }

    if (successCount > 0) {
      setSuccessMsg(
        `Se subieron con éxito ${successCount} de ${selectedImages.length} fotografías a la galería.`
      );
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setSelectedImages([]);
      onUploadSuccess();
    }

    setUploading(false);
    setUploadStatusMsg("");
  };

  return (
    <section className={styles.stackSm}>
      <div className={styles.rowBetween}>
        <h3 className={styles.subTitle}>Cargar Fotografías a la Galería</h3>
        <p className={brig.meta}>
          Bucket: <strong>brigadas</strong> | Máx: <strong>15 MB por foto</strong>
        </p>
      </div>

      {/* Mensajes de retroalimentación HCI */}
      {successMsg && (
        <p className="notice notice-ok" role="status">
          <CircleCheck aria-hidden="true" />
          <span>{successMsg}</span>
        </p>
      )}

      {errorMsg && (
        <p className="notice notice-bad" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{errorMsg}</span>
        </p>
      )}

      {!isReadOnly && (
        <div
          className={`${styles.dropzone} ${brig.dropzoneFocus} ${dragOver ? styles.dropzoneActive : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
          }}
        >
          <ImagePlus aria-hidden="true" />
          <p className={styles.dropzoneText}>
            <strong>Haz clic aquí o arrastra imágenes (JPG, PNG, HEIC de iPhone)</strong>
            <br />
            <span className={brig.dropzoneHint}>
              Procesamiento secuencial seguro para <strong>HEIC / HEIF de iPhone</strong>, PNG y JPG (máx. 15 MB por imagen). Se guardarán en <strong>formato JPG (.jpg)</strong>.
            </span>
          </p>
          {/* el input invisible cubre toda la zona: clic y teclado abren el selector */}
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif,.HEIC,.HEIF"
            className={styles.dropzoneInput}
            aria-label="Seleccionar fotografías para la galería"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className={styles.stackSm}>
          <h4 className={brig.subTitleSm}>
            Previsualización de Selección{" "}
            <span className={styles.count}>{selectedImages.length} fotos listas</span>
          </h4>

          {/* Cuadrícula de miniaturas previsualizadas */}
          <div className={styles.photoGrid}>
            {selectedImages.map((img) => (
              <div key={img.id} className={`${styles.photoItem} ${img.isCover ? brig.photoCover : ""}`}>
                <img src={img.previewUrl} alt="Vista previa" />

                {/* Botón de quitar selección individual */}
                <button
                  type="button"
                  className={styles.photoRemove}
                  onClick={() => removeSelectedImage(img.id)}
                  disabled={uploading}
                  title="Remover de la selección"
                  aria-label="Remover"
                >
                  <X aria-hidden="true" />
                </button>

                {/* Botón Fijar Portada */}
                <button
                  type="button"
                  className={`${brig.coverToggle} ${img.isCover ? brig.coverToggleOn : ""}`}
                  onClick={() => toggleCover(img.id)}
                  disabled={uploading}
                  aria-pressed={img.isCover}
                >
                  {img.isCover ? "Portada Principal" : "Marcar Portada"}
                </button>
              </div>
            ))}
          </div>

          {/* Fila de acciones y estado del sistema (HCI) */}
          <div className={styles.rowBetween}>
            {uploading || uploadStatusMsg ? (
              <p className={brig.uploadStatus} role="status">
                <LoaderCircle className="spin" aria-hidden="true" />
                <span>{uploadStatusMsg || "Subiendo imágenes secuencialmente..."}</span>
              </p>
            ) : (
              <p className={brig.meta}>
                Los archivos se guardarán uno a uno en <code>brigadas/{brigadaCodigo}/</code>
              </p>
            )}

            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleUpload}
              disabled={uploading || selectedImages.length === 0}
            >
              {uploading && <LoaderCircle className="spin" aria-hidden="true" />}
              {uploading ? "Subiendo 1 a 1..." : "Guardar en Galería"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
