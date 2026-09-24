import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { getBrigadas } from "../../lib/db/brigadas";
import styles from "../../styles/pages/our-work.module.css";
import {
  BriefcaseMedical,
  HeartPulse,
  MapPin,
  Package,
  Quote,
  ShieldPlus,
  Smile,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Nuestro Trabajo | Dibujando Sonrisas",
  description:
    "Descubre el impacto de las brigadas médico-odontológicas de Dibujando Sonrisas — más de 2,000 pacientes atendidos, 15 comunidades servidas y cientos de voluntarios.",
};

export const dynamic = "force-dynamic";

/* ── Servicios data ── */
const services = [
  {
    id: "odontologia",
    title: "Atención Odontológica",
    desc: "Extracciones, limpiezas dentales y tratamientos para restaurar la salud bucal de nuestros pacientes.",
    icon: <Smile />,
  },
  {
    id: "medicina",
    title: "Medicina General",
    desc: "Consultas generales, chequeos y tratamientos para enfermedades comunes en todas las edades.",
    icon: <BriefcaseMedical />,
  },
  {
    id: "prevencion",
    title: "Prevención y Educación",
    desc: "Educamos a las comunidades en higiene, nutrición y prevención de enfermedades para una salud duradera.",
    icon: <ShieldPlus />,
  },
  {
    id: "donaciones",
    title: "Donación de Insumos",
    desc: "Entregamos medicamentos e insumos médicos a hospitales públicos y asilos de ancianos.",
    icon: <Package />,
  },
];

/* ── Gallery photos ── */
const actionPhotos = [
  { src: "/accion1.jpg", alt: "Brigada médica en acción" },
  { src: "/accion2.jpg", alt: "Atención odontológica" },
  { src: "/accion3.jpg", alt: "Atención comunitaria" },
  { src: "/accion4.jpg", alt: "Consulta médica" },
  { src: "/accion5.jpg", alt: "Voluntarios" },
  { src: "/accion6.jpg", alt: "Comunidad" },
];

/* ── Stories ── */
const stories = [
  {
    id: "roberto",
    quote:
      '"Por años no podía ver bien para leerle a mis nietos. Los anteojos que recibí en la brigada cambiaron todo. Es algo pequeño que hizo una diferencia enorme en mi vida."',
    name: "Roberto S.",
    location: "Beneficiario, Palma Real, Omoa",
    img: "/stories1.jpeg",
  },
  {
    id: "rosa",
    quote:
      '"Mi hijo llevaba semanas con dolor de muelas y no teníamos cómo pagar un dentista. Gracias a Dibujando Sonrisas, pudo ser atendido con mucho amor y cariño."',
    name: "Rosa M.",
    location: "Beneficiaria, Agua Zarca, Santa Bárbara",
    img: "/stories2.jpeg",
  },
];

export default async function NuestroTrabajo() {
  const { data: brigadas } = await getBrigadas();

  const stats = [
    { label: "Pacientes Atendidos", value: "2,000+", icon: <HeartPulse /> },
    { label: "Voluntarios Participantes", value: "200+", icon: <Users /> },
    {
      label: "Comunidades Servidas",
      value: `${brigadas?.length ?? 0}+`,
      icon: <MapPin />,
    },
  ];

  return (
    <>
      <Header />

      <PageHero
        image="/new-OurWork-hero.png"
        title={
          <>
            Transformando Vidas, <em>Una Sonrisa</em> a la Vez
          </>
        }
        subtitle="Descubre el impacto que nuestras brigadas médico-odontológicas tienen en las comunidades que más lo necesitan."
      >
        <Link href="/voluntariado" className="btn-primary">
          Ser Voluntario
        </Link>
        <Link href="/donar" className="btn-outline">
          Donar Ahora
        </Link>
      </PageHero>

      <main>
        {/* ── NÚMEROS ── */}
        <section
          className={`${styles.numbersSection} section-y`}
          aria-labelledby="numeros-heading"
        >
          <div className="container">
            <h2 id="numeros-heading">Nuestro Impacto en Números</h2>
            <ul className={`${styles.numbersGrid} tone-rotate`}>
              {stats.map((stat) => (
                <li
                  key={stat.label}
                  className={`${styles.statCard} card-drawn lift`}
                >
                  <div className="icon-circle" aria-hidden="true">
                    {stat.icon}
                  </div>
                  <p className={styles.statValue}>{stat.value}</p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── SERVICIOS ── */}
        <section
          className={`${styles.servicesSection} section-y`}
          aria-labelledby="servicios-heading"
        >
          <div className="container">
            <h2 id="servicios-heading">Servicios Médicos que Brindamos</h2>
            <div className={`${styles.servicesGrid} tone-rotate`}>
              {services.map((s) => (
                <article
                  key={s.id}
                  className={`${styles.serviceCard} card-soft lift`}
                >
                  <div className="icon-circle icon-circle-sm" aria-hidden="true">
                    {s.icon}
                  </div>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── GALERÍA ── */}
        <section
          className={`${styles.actionSection} section-y`}
          aria-labelledby="galeria-heading"
        >
          <div className="container">
            <h2 id="galeria-heading">Nuestras Brigadas en Acción</h2>
            <div className={styles.actionGrid}>
              {actionPhotos.map((photo) => (
                <figure key={photo.src} className={`${styles.actionCard} card-soft`}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={600}
                    height={450}
                    sizes="(min-width: 768px) 33vw, 50vw"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── HISTORIAS ── */}
        <section
          className={`${styles.storiesSection} section-y`}
          aria-labelledby="historias-heading"
        >
          <div className="container">
            <h2 id="historias-heading">Historias de Esperanza</h2>
            <div className={`${styles.storiesGrid} tone-rotate`}>
              {stories.map((s) => (
                <figure key={s.id} className={`${styles.storyCard} card-drawn`}>
                  <Quote className={styles.quoteIcon} aria-hidden="true" />
                  <blockquote>{s.quote}</blockquote>
                  <figcaption className={styles.storyRow}>
                    <Image
                      className={styles.storyImg}
                      src={s.img}
                      alt={s.name}
                      width={112}
                      height={112}
                    />
                    <span>
                      <strong>{s.name}</strong>
                      <span>{s.location}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
