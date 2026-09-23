import type { Metadata } from "next";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import {
  ArrowRight,
  BookOpenText,
  HandHeart,
  MessageCircle,
  Package,
  PillBottle,
  Stethoscope,
  Users,
} from "lucide-react";
import styles from "../../styles/pages/donate.module.css";

export const metadata: Metadata = {
  title: "Donar | Dibujando Sonrisas",
  description:
    "Apoya a Dibujando Sonrisas — dona a través de GoFundMe, contacta para donaciones en especie, o únete como voluntario. Tu apoyo hace la diferencia.",
};

const alternatives = [
  {
    id: "gofundme",
    icon: <HandHeart />,
    title: "GoFundMe",
    desc: "Dona de forma segura desde cualquier parte del mundo a través de nuestra campaña en GoFundMe.",
    cta: (
      <a
        href="https://gofund.me/97bce5025"
        className="btn-primary"
        target="_blank"
        rel="noopener noreferrer"
      >
        Donar en GoFundMe
      </a>
    ),
  },
  {
    id: "contacto",
    icon: <MessageCircle />,
    title: "Contacto Directo",
    desc: "¿Estás en Honduras? Contáctanos directamente para coordinar una donación en insumos médicos o medicamentos.",
    cta: (
      <Link href="/contacto" className="btn-outline-blue">
        Contáctanos
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
  },
  {
    id: "insumos",
    icon: <Package />,
    title: "Dona Insumos",
    desc: "Medicamentos, equipos médicos, material odontológico o cualquier insumo que pueda servir en nuestras brigadas.",
    cta: (
      <Link href="/contacto" className="btn-outline-blue">
        Saber más
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
  },
  {
    id: "voluntario",
    icon: <Users />,
    title: "Sé Voluntario",
    desc: "Tu tiempo y habilidades también son una forma poderosa de apoyar. ¡Únete a nuestro equipo de voluntarios!",
    cta: (
      <Link href="/voluntariado" className="btn-outline-blue">
        Ser Voluntario
        <ArrowRight aria-hidden="true" />
      </Link>
    ),
  },
];

export default function Donar() {
  return (
    <>
      <Header />

      <PageHero
        image="/new-Donar-hero.png"
        title={
          <>
            ¡Tu apoyo hace la <em>diferencia</em>!
          </>
        }
        subtitle="Cada aporte se convierte en consultas, medicamentos y sonrisas para familias de Honduras."
      />

      <main className="section-y container">
        <section className={styles.intro} aria-labelledby="donate-heading">
          <h2 id="donate-heading">Formas de ayudar a dibujar una sonrisa</h2>
          <p>
            Estamos trabajando para implementar un sistema de donaciones en
            línea seguro y conveniente. Mientras tanto, puedes apoyarnos a
            través de las siguientes opciones:
          </p>
        </section>

        <div className={`${styles.altGrid} tone-rotate`}>
          {alternatives.map((alt) => (
            <article key={alt.id} className={`${styles.altCard} card-drawn lift`}>
              <div className="icon-circle" aria-hidden="true">
                {alt.icon}
              </div>
              <h3>{alt.title}</h3>
              <p>{alt.desc}</p>
              {alt.cta}
            </article>
          ))}
        </div>

        <section className={styles.impact} aria-labelledby="impact-heading">
          <h2 id="impact-heading">Tu donación hace posible</h2>
          <ul className={`${styles.impactList} tone-rotate`}>
            <li className="chip">
              <Stethoscope aria-hidden="true" />
              Atención médica y odontológica
            </li>
            <li className="chip">
              <PillBottle aria-hidden="true" />
              Provisión de medicamentos
            </li>
            <li className="chip">
              <BookOpenText aria-hidden="true" />
              Predicación del evangelio
            </li>
          </ul>
        </section>

        <p className={styles.note}>
          <span className={styles.noteBadge}>Próximamente</span>
          Sistema de pagos en línea: estamos configurando plataformas para
          hacer las donaciones más sencillas.
        </p>
      </main>

      <Footer />
    </>
  );
}
