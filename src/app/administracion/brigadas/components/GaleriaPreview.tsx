"use client";

import { useTransition, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cambiarPortada, eliminarImagenBrigada, reordenarGaleria } from "../actions";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import EmptyState from "@/app/administracion/components/EmptyState";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

export type BrigadaImagenRow = {
  id: string;
  brigada_id: string;
  nombre_archivo: string;
  portada: boolean;
  orden: number;
  created_at: string;
};

type GaleriaPreviewProps = {
  brigadaId: string;
  brigadaCodigo: string;
  imagenes: BrigadaImagenRow[];
  onReload: () => void;
  isReadOnly?: boolean;
};

export default function GaleriaPreview({
  brigadaId,
  brigadaCodigo,
  imagenes,
  onReload,
  isReadOnly = false,
}: GaleriaPreviewProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<BrigadaImagenRow | null>(null);

  // Obtener URL pública desde el bucket 'brigadas' en Supabase Storage
  const getPublicUrl = (filename: string) => {
    const { data } = supabase.storage
      .from("brigadas")
      .getPublicUrl(`${brigadaCodigo}/${filename}`);
    return data.publicUrl;
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const img = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      try {
        // Invocar Server Action autenticada que borra de Storage y de la BD
        const res = await eliminarImagenBrigada(img.id, brigadaCodigo, img.nombre_archivo);
        if (res.error) throw new Error(res.error);

        onReload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar la imagen.");
      }
    });
  };

  const handleSetCover = (img: BrigadaImagenRow) => {
    startTransition(async () => {
      try {
        const res = await cambiarPortada(brigadaId, img.id);
        if (res.error) throw new Error(res.error);
        onReload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al establecer la portada.");
      }
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= imagenes.length) return;

    startTransition(async () => {
      try {
        const rearranged = [...imagenes];
        const temp = rearranged[index];
        rearranged[index] = rearranged[newIndex];
        rearranged[newIndex] = temp;

        const ids = rearranged.map((img) => img.id);
        const res = await reordenarGaleria(ids);
        if (res.error) throw new Error(res.error);

        onReload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al reordenar.");
      }
    });
  };

  return (
    <>
      <section className={styles.stackSm}>
        <div className={styles.rowBetween}>
          <h3 className={styles.subTitle}>
            Fotografías Guardadas en Galería <span className={styles.count}>{imagenes.length}</span>
          </h3>
          <p className={brig.meta}>
            Carpeta: <code>brigadas/{brigadaCodigo}/</code>
          </p>
        </div>

        {imagenes.length === 0 ? (
          <EmptyState icon={<Camera />} title="Esta brigada aún no cuenta con fotografías subidas.">
            Utiliza el panel superior para cargar imágenes.
          </EmptyState>
        ) : (
          <div className={styles.gridAuto}>
            {imagenes.map((img, i) => {
              const url = getPublicUrl(img.nombre_archivo);

              return (
                <article
                  key={img.id}
                  className={`${brig.photoCard} ${img.portada ? brig.photoCardCover : ""}`}
                >
                  {/* Elemento de Imagen */}
                  <div className={brig.photoMedia}>
                    <img src={url} alt={img.nombre_archivo} loading="lazy" />
                    {img.portada && (
                      <span className={`${styles.badge} ${styles.badgeBrand} ${brig.coverBadge}`}>
                        <Star aria-hidden="true" />
                        Portada Principal
                      </span>
                    )}
                  </div>

                  {/* Panel Inferior de Gestión */}
                  <div className={brig.photoBody}>
                    <span className={brig.fileName}>{img.nombre_archivo}</span>

                    {/* Botones de Reordenamiento */}
                    {!isReadOnly && (
                      <div className={brig.photoOrder}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleMove(i, -1)}
                          disabled={i === 0 || isPending}
                          title="Mover hacia la izquierda"
                          aria-label="Mover izquierda"
                        >
                          <ChevronLeft aria-hidden="true" />
                        </button>
                        <span className={brig.photoOrderNum}>{img.orden}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleMove(i, 1)}
                          disabled={i === imagenes.length - 1 || isPending}
                          title="Mover hacia la derecha"
                          aria-label="Mover derecha"
                        >
                          <ChevronRight aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    {/* Acciones de Portada y Eliminación Individual */}
                    {!isReadOnly && (
                      <div className={brig.photoActions}>
                        <button
                          type="button"
                          className="btn-ghost btn-xs"
                          onClick={() => handleSetCover(img)}
                          disabled={img.portada || isPending}
                        >
                          <Star aria-hidden="true" />
                          {img.portada ? "Es Portada" : "Fijar Portada"}
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setDeleteTarget(img)}
                          disabled={isPending}
                          aria-label={`Eliminar ${img.nombre_archivo}`}
                          title="Eliminar"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal de Advertencia HCI al eliminar foto individual */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar Fotografía?"
          confirmLabel="Sí, Eliminar de Storage"
          busyLabel="Eliminando..."
          busy={isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        >
          Se eliminará permanentemente el archivo <strong>{deleteTarget.nombre_archivo}</strong> de Supabase Storage y de la base de datos de esta brigada.
        </ConfirmDialog>
      )}
    </>
  );
}
