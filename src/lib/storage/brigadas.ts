import type { SupabaseClient } from "@supabase/supabase-js";
import { errorInfo, getLogger } from "../logger";
import { supabase } from "../supabase";

const logger = getLogger("storage");

export const BRIGADAS_STORAGE_BUCKET = "brigadas";

export interface UploadedPhotoResult {
  fileName: string;
  storagePath: string;
  publicUrl: string;
}

export async function uploadBrigadaPhotos(
  client: SupabaseClient = supabase,
  brigadaCodigo: string,
  files: File[]
): Promise<{ uploaded: UploadedPhotoResult[]; errors: string[] }> {
  const errors: string[] = [];
  const uploaded: UploadedPhotoResult[] = [];

  for (const file of files) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${Date.now()}-${sanitizedName}`;
      const storagePath = `${brigadaCodigo}/${fileName}`;

      const { error: uploadError } = await client.storage
        .from(BRIGADAS_STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        logger.error("Photo upload failed", {
          ...errorInfo(uploadError),
          brigadaCodigo,
        });
        errors.push(`No se pudo subir ${file.name}.`);
        continue;
      }

      const { data } = client.storage
        .from(BRIGADAS_STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      uploaded.push({
        fileName,
        storagePath,
        publicUrl: data.publicUrl,
      });
    } catch (err) {
      logger.error("Photo processing failed", {
        ...errorInfo(err),
        brigadaCodigo,
      });
      errors.push(`No se pudo procesar ${file.name}.`);
    }
  }

  logger.info("Brigade photos uploaded", {
    brigadaCodigo,
    uploaded: uploaded.length,
    failed: errors.length,
  });
  return { uploaded, errors };
}

export async function deleteBrigadaPhotoFromStorage(
  client: SupabaseClient = supabase,
  brigadaCodigo: string,
  fileName: string
): Promise<{ error: string | null }> {
  const path = `${brigadaCodigo}/${fileName}`;
  const { error } = await client.storage
    .from(BRIGADAS_STORAGE_BUCKET)
    .remove([path]);
  if (error) {
    logger.error("Photo deletion failed", {
      ...errorInfo(error),
      brigadaCodigo,
    });
    return { error: "No se pudo eliminar la foto." };
  }
  logger.info("Brigade photo deleted", { brigadaCodigo });
  return { error: null };
}

export function getBrigadaPhotoPublicUrl(
  client: SupabaseClient = supabase,
  brigadaCodigo: string,
  fileName: string
): string {
  const path = `${brigadaCodigo}/${fileName}`;
  const { data } = client.storage
    .from(BRIGADAS_STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
