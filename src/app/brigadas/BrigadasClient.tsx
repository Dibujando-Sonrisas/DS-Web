"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Brigada } from "../../lib/db/brigadas";
import { supabase } from "../../lib/supabase";
import { CalendarDays, Camera, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import styles from "../../styles/pages/brigadas.module.css";

interface LightboxState {
  urls: string[];
  index: number;
}

export default function BrigadasClient({ brigadas }: { brigadas: Brigada[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [photoStatus, setPhotoStatus] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Carrusel refs (legacy replica)
  const carIdxRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const btnPrevRef = useRef<HTMLButtonElement>(null);
  const btnNextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (brigadas.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(brigadas[0].id);
    brigadas.forEach((b: Brigada) => loadPhotos(b));
  }, [brigadas]);

  async function loadPhotos(b: Brigada) {
    setPhotoStatus((prev) => ({ ...prev, [b.id]: "loading" }));

    // Query DB for image records sorted with cover first, then by orden
    const { data: dbImages, error: dbError } = await supabase
      .from("brigada_imagenes")
      .select("*")
      .eq("brigada_id", b.id)
      .order("portada", { ascending: false })
      .order("orden", { ascending: true });

    if (dbError) {
      console.error(`Error loading images for brigade ${b.codigo}:`, dbError.message);
      setPhotoStatus((prev) => ({ ...prev, [b.id]: "error" }));
      return;
    }

    if (!dbImages || dbImages.length === 0) {
      setPhotoStatus((prev) => ({ ...prev, [b.id]: "empty" }));
      return;
    }

    // Resolve public URLs based on CODIGO-BRIGADA/filename structure in storage
    const urls = dbImages.map((img) => {
      const { data } = supabase.storage
        .from("brigadas")
        .getPublicUrl(`${b.codigo}/${img.nombre_archivo}`);
      return data.publicUrl;
    });

    setPhotos((prev) => ({ ...prev, [b.id]: urls }));
    setPhotoStatus((prev) => ({ ...prev, [b.id]: `${urls.length} fotos` }));
  }

  function getVisibleCount() {
    if (typeof window === "undefined") return 4;
    if (window.innerWidth <= 550) return 1;
    if (window.innerWidth <= 900) return 2;
    return 4;
  }

  const applyCarousel = useCallback(
    (nuevoIndex: number) => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      const btnPrev = btnPrevRef.current;
      const btnNext = btnNextRef.current;
      if (!track || !viewport) return;

      const visible = getVisibleCount();
      const GAP_PX = 15;
      const total = brigadas.length;
      const maxIndex = Math.max(0, total - visible);

      carIdxRef.current = Math.min(Math.max(nuevoIndex, 0), maxIndex);

      const viewportW = viewport.offsetWidth - 8;
      const itemWidth = (viewportW - GAP_PX * (visible - 1)) / visible;

      track
        .querySelectorAll<HTMLElement>("[data-carousel-item]")
        .forEach((btn) => {
          btn.style.width = `${itemWidth}px`;
          btn.style.flexShrink = "0";
        });

      const offset = carIdxRef.current * (itemWidth + GAP_PX);
      track.style.transform = `translateX(-${offset}px)`;

      if (btnPrev) btnPrev.disabled = carIdxRef.current === 0;
      if (btnNext) btnNext.disabled = carIdxRef.current >= maxIndex;
    },
    [brigadas.length]
  );

  useEffect(() => {
    if (!brigadas.length) return;
    const timer = setTimeout(() => applyCarousel(0), 0);
    const onResize = () => {
      clearTimeout(timer);
      setTimeout(() => applyCarousel(carIdxRef.current), 100);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [brigadas, applyCarousel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!lightbox) return;
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function navigate(dir: number) {
    setLightbox((prev) => {
      if (!prev) return null;
      const next = prev.index + dir;
      if (next < 0 || next >= prev.urls.length) return prev;
      return { ...prev, index: next };
    });
  }

  function handleBrigadaClick(id: string) {
    setActiveId(id);
    setTimeout(() => {
      const panel = document.getElementById(`panel-${id}`);
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  // Gestos táctiles (Swipe)
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 35;

    if (diffX > minSwipeDistance) {
      applyCarousel(carIdxRef.current + 1);
    } else if (diffX < -minSwipeDistance) {
      applyCarousel(carIdxRef.current - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <>
      {brigadas.length === 0 && (
        <p className={styles.statusMsg}>Aún no hay brigadas registradas.</p>
      )}

      {brigadas.length > 0 && (
        <>
          <div className={styles.carouselWrapper}>
            <button
              ref={btnPrevRef}
              className={`${styles.carouselBtn} ${styles.carouselBtnPrev}`}
              aria-label="Anterior brigada"
              onClick={() => applyCarousel(carIdxRef.current - 1)}
            >
              <ChevronLeft />
            </button>

            <div
              className={styles.carouselViewport}
              ref={viewportRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.carouselTrack} ref={trackRef}>
                {brigadas.map((b) => (
                  <button
                    key={b.id}
                    data-carousel-item="true"
                    className={`${styles.brigadaBtn}${activeId === b.id ? " " + styles.active : ""}`}
                    aria-pressed={activeId === b.id}
                    onClick={() => handleBrigadaClick(b.id)}
                  >
                    <span className={styles.brigadaNum}>{b.codigo}</span>
                    <span className={styles.brigadaName}>{b.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              ref={btnNextRef}
              className={`${styles.carouselBtn} ${styles.carouselBtnNext}`}
              aria-label="Siguiente brigada"
              onClick={() => applyCarousel(carIdxRef.current + 1)}
            >
              <ChevronRight />
            </button>
          </div>

          <div>
            {brigadas.map((b) => {
              const isActive = activeId === b.id;
              const bPhotos = photos[b.id] ?? [];
              const bStatus = photoStatus[b.id];

              return (
                <div
                  key={b.id}
                  className={
                    isActive ? styles.brigadaPanelActive : styles.brigadaPanel
                  }
                  id={`panel-${b.id}`}
                >
                  <div className={styles.brigadaInfo}>
                    <div className={styles.brigadaInfoText}>
                      <h3>
                        {b.codigo} — {b.nombre}
                      </h3>
                      {b.descripcion && <p>{b.descripcion}</p>}
                      <ul className={`${styles.brigadaMeta} tone-rotate`}>
                        {b.fecha_brigada && (
                          <li className="chip">
                            <CalendarDays aria-hidden="true" />
                            {new Date(b.fecha_brigada).toLocaleDateString("es-HN")}
                          </li>
                        )}
                        {b.lugar && (
                          <li className="chip">
                            <MapPin aria-hidden="true" />
                            {b.lugar}
                          </li>
                        )}
                        {bStatus && (
                          <li className="chip">
                            <Camera aria-hidden="true" />
                            {bStatus === "loading"
                              ? "Cargando fotos…"
                              : bStatus === "error"
                                ? "Error cargando fotos"
                                : bStatus === "empty"
                                  ? "Fotos próximamente"
                                  : bStatus}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Gallery */}
                  <div>
                    <h3 className={styles.galleryHeading}>Galería de Fotos</h3>
                    <div className={styles.galleryGrid}>
                      {bPhotos.length === 0 ? (
                        <div className={`${styles.emptyGalleryContainer} card-soft card-drawn tone-secondary`}>
                          <Camera className={styles.emptyGalleryIcon} strokeWidth={1.5} aria-hidden="true" />
                          <h4 className={styles.emptyGalleryTitle}>Galería en Actualización</h4>
                          <p className={styles.emptyGalleryText}>
                            Las fotografías de esta brigada están siendo procesadas y estarán disponibles próximamente en la plataforma.
                          </p>
                        </div>
                      ) : (
                        bPhotos.map((url, i) => (
                          <button
                            type="button"
                            key={url}
                            className={styles.galleryItem}
                            aria-label={`Ampliar foto ${i + 1} de ${b.nombre}`}
                            onClick={() =>
                              setLightbox({ urls: bPhotos, index: i })
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Foto ${i + 1} de ${b.nombre}`}
                              loading="lazy"
                              width={400}
                              height={400}
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(null);
          }}
        >
          <button
            className={styles.btnCerrar}
            aria-label="Cerrar"
            onClick={() => setLightbox(null)}
          >
            <X aria-hidden="true" />
          </button>

          {lightbox.index > 0 && (
            <button
              className={`${styles.modalNav} ${styles.modalNavPrev}`}
              aria-label="Foto anterior"
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}

          <img
            src={lightbox.urls[lightbox.index]}
            alt={`Foto ${lightbox.index + 1}`}
            width={900}
            height={700}
          />

          {lightbox.index < lightbox.urls.length - 1 && (
            <button
              className={`${styles.modalNav} ${styles.modalNavNext}`}
              aria-label="Foto siguiente"
              onClick={(e) => {
                e.stopPropagation();
                navigate(1);
              }}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
