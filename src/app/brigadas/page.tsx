import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import BrigadasClient from "./BrigadasClient";
import { getBrigadas } from "../../lib/db/brigadas";
import styles from "../../styles/pages/brigadas.module.css";

export const metadata: Metadata = {
  title: "Brigadas | Dibujando Sonrisas",
  description:
    "Conoce las más de 15 brigadas médico-odontológicas de Dibujando Sonrisas en Honduras — selecciona una brigada para ver sus fotos y su historia.",
};

export const dynamic = "force-dynamic";

export default async function Brigadas() {
  const { data: brigadas, error } = await getBrigadas();

  return (
    <>
      <Header />

      <PageHero
        image="/new-Brigadas-hero.png"
        title={
          <>
            Nuestras <em>Brigadas</em>
          </>
        }
        subtitle="Selecciona una brigada para ver las fotos y conocer la historia de cada comunidad que hemos visitado."
      />

      <section
        className={`${styles.section} section-y container`}
        aria-labelledby="brigadas-heading"
      >
        <h2 id="brigadas-heading">Elige una Brigada</h2>
        <p className={styles.subtitle}>
          Hemos realizado <strong>{brigadas?.length ?? 0}+ brigadas</strong> en
          distintas comunidades de Honduras. Cada una tiene su historia.
        </p>

        {error ? (
          <p className={styles.errorMsg}>
            No se pudieron cargar las brigadas. Intenta de nuevo más tarde.
          </p>
        ) : (
          <BrigadasClient brigadas={brigadas ?? []} />
        )}
      </section>

      <Footer />
    </>
  );
}
