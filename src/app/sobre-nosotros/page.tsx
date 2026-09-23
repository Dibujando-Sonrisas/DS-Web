import type { Metadata } from "next";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { getBrigadas } from "../../lib/db/brigadas";
import styles from "../../styles/pages/about.module.css";
import { BookOpenText, Check, PillBottle, Stethoscope } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre Nosotros | Dibujando Sonrisas",
  description:
    "Conoce la historia, misión, visión y valores de Dibujando Sonrisas — fundación cristiana de brigadas médico-odontológicas en Honduras.",
};

export const dynamic = "force-dynamic";

export default async function SobreNosotros() {
  const { data: brigadas } = await getBrigadas();

  return (
    <>
      <Header />

      <PageHero
        image="/new-AboutUs-hero.png"
        title={
          <span className="wordmark">
            Dibujando
            <span> Son</span>
            <span>ri</span>
            <span>sas</span>
          </span>
        }
        subtitle="¿Quiénes somos? Una fundación cristiana que lleva salud, amor y esperanza a las comunidades de Honduras."
      />

      <section className={`${styles.history} container`}>
        <h2 className={styles.historyHeader}>Nuestra Historia</h2>
        <Image
          className={styles.historyImage}
          src="/new-AboutUs-hero.png"
          alt="Equipo de Dibujando Sonrisas durante una brigada"
          width={1280}
          height={720}
          sizes="(min-width: 768px) 50vw, 90vw"
        />
        <div>
          <p>
            Dibujando Sonrisas nació de una idea simple pero poderosa: que cada
            persona merece acceso a atención médica de calidad. Fundada por dos
            jóvenes con un corazón de servicio, nuestra fundación surgió de la
            necesidad que veían en comunidades hondureñas alejadas de centros de
            salud. Desde nuestra primera brigada hasta hoy, hemos llevado
            atención médica y odontológica a más de {brigadas?.length ?? 0}{" "}
            comunidades, siempre acompañando el servicio con la proclamación del
            evangelio.
          </p>

          <div className={styles.historyIcons}>
            <p className={styles.historyIcon}>
              <Stethoscope />
              Atención médica
            </p>

            <p className={styles.historyIcon}>
              <PillBottle />
              Provisión de medicamentos
            </p>

            <p className={styles.historyIcon}>
              <BookOpenText />
              Predicación del evangelio
            </p>
          </div>
        </div>
      </section>

      <section className={`${styles.missionAndVisionContainer} container`}>
        <div className={styles.missionAndVision}>
          <div className={styles.missionAndVisionText}>
            <h3>Nuestra Misión</h3>
            <p>
              Brindar servicios médico-odontológicos esenciales, educación en
              salud y apoyo comunitario a poblaciones vulnerables de Honduras,
              siempre guiados por la fe cristiana.
            </p>
          </div>

          <Image
            className={styles.missionAndVisionImage}
            src="/new-OurWork-hero.png"
            alt="Dos niños sonriendo durante una brigada de Dibujando Sonrisas"
            width={480}
            height={640}
            sizes="180px"
          />
        </div>

        <div className={styles.missionAndVision}>
          <div className={styles.missionAndVisionText}>
            <h3>Nuestra Visión</h3>
            <p>
              Ser una fundación reconocida a nivel nacional que logre
              transformar la salud de las comunidades más necesitadas, creando
              un impacto sostenible que se extienda por generaciones.
            </p>
          </div>

          <Image
            className={styles.missionAndVisionImage}
            src="/new-Donar-hero.png"
            alt="Niña abrazando un peluche recibido en una brigada"
            width={480}
            height={640}
            sizes="180px"
          />
        </div>
      </section>


      <section className={styles.ourValues}>
        <h2 className={styles.ourValuesTitle}>Nuestros Valores</h2>
        <ul className={styles.valuesList}>
          <li className={styles.valuesItem}>
            <span className={styles.checkmark}>
              <Check />
            </span>
            <span><strong>Fe:</strong> Todo lo que hacemos es inspirado por nuestra fe en Cristo.</span>
          </li>
          <li className={styles.valuesItem}>
            <span className={styles.checkmark}>
              <Check />
            </span>
            <span><strong>Compasión:</strong> Tratamos a cada persona con amor, dignidad y respeto.</span>
          </li>
          <li className={styles.valuesItem}>
            <span className={styles.checkmark}>
              <Check />
            </span>
            <span><strong>Integridad:</strong> Actuamos con transparencia y ética en todo momento.</span>
          </li>
          <li className={styles.valuesItem}>
            <span className={styles.checkmark}>
              <Check />
            </span>
            <span><strong>Trabajo en equipo:</strong> Creemos en la fuerza de la unión para lograr
            más.</span>
          </li>
          <li className={styles.valuesItem}>
            <span className={styles.checkmark}>
              <Check />
            </span>
            <span><strong>Excelencia:</strong> Nos comprometemos con la calidad en cada brigada.</span>
          </li>
        </ul>
      </section>

      {/* ── LOGROS ── */}
      <section className={styles.achievements} aria-labelledby="logros-heading">
        <div className={`${styles.achievementsInner} container`}>
          <h2 id="logros-heading">Nuestros Logros</h2>
          <div className={styles.achievementsRow}>
            {/* Pacientes */}
            <div className={styles.achievementCard}>
              <div className={styles.iconWrap} aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                  <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
                </svg>
              </div>
              <div className={styles.achievementText}>
                <h3>+2,000 Pacientes Atendidos</h3>
                <p>
                  Hemos brindado atención médica y odontológica a más de 2,000
                  personas en zonas sin acceso a salud.
                </p>
              </div>
            </div>

            {/* Brigadas */}
            <div className={styles.achievementCard}>
              <div className={styles.iconWrap} aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                  <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
                  <path d="M12 12l0 .01" />
                  <path d="M3 13a20 20 0 0 0 18 0" />
                </svg>
              </div>
              <div className={styles.achievementText}>
                <h3>{brigadas?.length ?? 0}+ Brigadas Realizadas</h3>
                <p>
                  Hemos llevado a cabo más de {brigadas?.length ?? 0} brigadas
                  médico-odontológicas en comunidades de Honduras.
                </p>
              </div>
            </div>

            {/* Donaciones */}
            <div className={styles.achievementCard}>
              <div className={styles.iconWrap} aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M3 12h1M12 3v1M20 12h1M5.6 5.6l.7.7M18.4 5.6l-.7.7" />
                  <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
                  <path d="M9.7 17h4.6" />
                </svg>
              </div>
              <div className={styles.achievementText}>
                <h3>Donaciones a Hospitales y Asilos</h3>
                <p>
                  Hemos entregado insumos médicos a hospitales públicos y
                  regalado amor a adultos mayores en asilos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EQUIPO ── */}
      <section className={styles.team} aria-labelledby="equipo-heading">
        <h2 id="equipo-heading">Conoce Nuestro Equipo</h2>
        <div className={styles.teamGrid}>
          <div className={styles.teamPerson}>
            <div
              className={`${styles.teamImage} ${styles.teamImage1}`}
              role="img"
              aria-label="Foto de la Fundadora"
            />
            <h4>Fundadora</h4>
            <p>Directora de Brigadas</p>
          </div>

          <div className={styles.teamPerson}>
            <div
              className={`${styles.teamImage} ${styles.teamImage2}`}
              role="img"
              aria-label="Foto de la Cofundadora"
            />
            <h4>Fundadora</h4>
            <p>Coordinadora de Brigadas</p>
          </div>

          <div className={styles.teamPerson}>
            <div
              className={`${styles.teamImage} ${styles.teamImage3}`}
              role="img"
              aria-label="Foto del Coordinador"
            />
            <h4>Coordinador</h4>
            <p>Coordinador General en Brigada</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
