import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import {
  BriefcaseMedical,
  Check,
  Globe,
  Handshake,
  Heart,
  Lock,
  Quote,
  Stethoscope,
} from "lucide-react";
import type { Brigada } from "@/lib/db/brigadas";
import VolunteerForm from "./VolunteerForm";
import BrigadaBanner from "../components/BrigadaBanner";
import styles from "../../styles/pages/volunteer.module.css";

export const metadata: Metadata = {
  title: "Voluntariado | Dibujando Sonrisas",
  description:
    "Únete como voluntario a las brigadas médico-odontológicas de Dibujando Sonrisas en Honduras. Aplica en línea y marca una diferencia real.",
};

export const dynamic = "force-dynamic";

export default async function Voluntariado() {
  const supabase = await createSupabaseServerClient();
  
  // Buscar brigada activa con inscripciones abiertas
  const { data: activeBrigada } = await supabase
    .from("brigadas")
    .select("*")
    .eq("estado", "inscripciones_abiertas")
    .order("fecha_brigada", { ascending: true })
    .limit(1)
    .maybeSingle();

  let cuposInfo = {
    total: null as number | null,
    registrados: 0,
    cupoLleno: false,
    disponibles: null as number | null,
  };

  if (activeBrigada) {
    const { count } = await supabase
      .from("inscripciones_voluntarios")
      .select("*", { count: "exact", head: true })
      .eq("brigada_id", activeBrigada.id)
      .neq("estado", "rechazado");

    const totalCupos = activeBrigada.capacidad_voluntarios ?? null;
    const registrados = count || 0;
    const cupoLleno =
      totalCupos !== null && totalCupos > 0 ? registrados >= totalCupos : false;
    const disponibles =
      totalCupos !== null ? Math.max(0, totalCupos - registrados) : null;

    cuposInfo = {
      total: totalCupos,
      registrados,
      cupoLleno,
      disponibles,
    };
  }

  const isClosed = !activeBrigada;
  const isCupoLleno = cuposInfo.cupoLleno;

  return (
    <>
      <Header />

      <PageHero
        image="/new-Voluntariado-hero.png"
        title={
          <>
            Lleva <em>Sonrisas</em> a Quienes Más lo Necesitan
          </>
        }
        subtitle="Tus habilidades pueden cambiar vidas. Únete a nuestras brigadas médicas y marca una diferencia real en Honduras."
      >
        {!isClosed && !isCupoLleno ? (
          <a href="#formulario" className="btn-primary">
            Ser Voluntario
          </a>
        ) : (
          <span className="btn-primary btn-disabled">
            {isCupoLleno && <Lock size={16} aria-hidden="true" />}
            {isCupoLleno ? "Cupo Máximo Alcanzado" : "Inscripciones Cerradas"}
          </span>
        )}
        <Link href="/donar" className="btn-outline">
          Donar Ahora
        </Link>
      </PageHero>

      {/* ── MAIN ── */}
      <main className={styles.volunteerMain}>
        {/* ── BANNER DINÁMICO DE PRÓXIMA BRIGADA ── */}
        {!isClosed && activeBrigada && (
          <BrigadaBanner brigada={activeBrigada as Brigada} cuposInfo={cuposInfo} />
        )}

        <div className="container">
          {/* ── ¿POR QUÉ SER VOLUNTARIO? ── */}
          <section className={styles.whySection} aria-labelledby="why-heading">
            <h2 id="why-heading">¿Por Qué Ser Voluntario con Nosotros?</h2>
            <p className={styles.whySubtitle}>
              Crece como profesional mientras impactas la salud de Honduras de
              forma tangible.
            </p>
            <div className={`${styles.whyCards} tone-rotate`}>
              <article className={`${styles.whyCard} card-drawn lift`}>
                <div className="icon-circle" aria-hidden="true">
                  <BriefcaseMedical />
                </div>
                <h3>Crecimiento Profesional</h3>
                <p>
                  Gana experiencia médica única en entornos diversos y pon a
                  prueba tus habilidades en campo real.
                </p>
              </article>

              <article className={`${styles.whyCard} card-drawn lift`}>
                <div className="icon-circle" aria-hidden="true">
                  <Globe />
                </div>
                <h3>Impacto Inmediato</h3>
                <p>
                  Ve los resultados de tu atención directamente en los pacientes
                  y la comunidad que sirves.
                </p>
              </article>

              <article className={`${styles.whyCard} card-drawn lift`}>
                <div className="icon-circle" aria-hidden="true">
                  <Heart />
                </div>
                <h3>Servicio con Propósito</h3>
                <p>
                  Más que medicina — predicamos el evangelio y llevamos amor a
                  cada lugar donde llegamos.
                </p>
              </article>
            </div>
          </section>

          {/* ── ROLES DISPONIBLES ── */}
          <section
            className={styles.rolesSection}
            aria-labelledby="roles-heading"
          >
            <h2 id="roles-heading">Roles Disponibles</h2>
            <p className={styles.rolesSubtitle}>
              Necesitamos tanto profesionales de la salud como personal de
              apoyo para hacer exitosas nuestras misiones.
            </p>
            <div className={styles.rolesGrid}>
              <article className={`${styles.roleCard} card-soft tone-primary`}>
                <div className={styles.roleImg1} aria-hidden="true" />
                <div className={styles.roleName}>
                  <span className="icon-circle icon-circle-sm" aria-hidden="true">
                    <Stethoscope />
                  </span>
                  <h3>Profesionales de Salud</h3>
                </div>
                <ul>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Médicos Generales y Especialistas
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Odontólogos y Asistentes Dentales
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Enfermeros y Técnicos en Salud
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Estudiantes de Medicina y Odontología
                  </li>
                </ul>
              </article>

              <article className={`${styles.roleCard} card-soft tone-tertiary`}>
                <div className={styles.roleImg2} aria-hidden="true" />
                <div className={styles.roleName}>
                  <span className="icon-circle icon-circle-sm" aria-hidden="true">
                    <Handshake />
                  </span>
                  <h3>Apoyo y Logística</h3>
                </div>
                <ul>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Coordinadores de Logística
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Personal de Apoyo General
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Evangelistas y Oración
                  </li>
                  <li className={styles.roleItem}>
                    <Check aria-hidden="true" />
                    Documentación y Fotografía
                  </li>
                </ul>
              </article>
            </div>
          </section>

          {/* ── CÓMO UNIRTE ── */}
          <section
            className={styles.stepsSection}
            aria-labelledby="steps-heading"
          >
            <h2 id="steps-heading">¿Cómo Unirte?</h2>
            <ol className={`${styles.stepsGrid} tone-rotate`}>
              <li className={`${styles.step} card-soft`}>
                <div className={`${styles.stepNumber} icon-circle`} aria-hidden="true">
                  1
                </div>
                <h3>Aplica en Línea</h3>
                <p>
                  Llena el formulario de abajo con tus datos y área de interés.
                </p>
              </li>
              <li className={`${styles.step} card-soft`}>
                <div className={`${styles.stepNumber} icon-circle`} aria-hidden="true">
                  2
                </div>
                <h3>Entrevista</h3>
                <p>Una breve llamada para conocerte y alinear expectativas.</p>
              </li>
              <li className={`${styles.step} card-soft`}>
                <div className={`${styles.stepNumber} icon-circle`} aria-hidden="true">
                  3
                </div>
                <h3>Preparación</h3>
                <p>Te informamos sobre la próxima brigada y qué llevar.</p>
              </li>
              <li className={`${styles.step} card-soft`}>
                <div className={`${styles.stepNumber} icon-circle`} aria-hidden="true">
                  4
                </div>
                <h3>¡A Servir!</h3>
                <p>
                  Viaja con el equipo y comienza tu experiencia de voluntariado.
                </p>
              </li>
            </ol>
          </section>

          {/* ── CITA VOLUNTARIO ── */}
          <section
            className={styles.quoteSection}
            aria-label="Testimonio de voluntario"
          >
            <div
              className={styles.quoteImage}
              role="img"
              aria-label="Foto del Dr. Eugenio Rodriguez en una brigada"
            />
            <figure className={styles.quoteWords}>
              <Quote className={styles.quoteIcon} aria-hidden="true" />
              <blockquote>
                &#34;Ser voluntario con Dibujando Sonrisas me recordó por qué
                elegí ser médico: para servir a quienes más lo necesitan, con
                amor y fe.&#34;
              </blockquote>
              <figcaption>
                <strong>Dr. Eugenio Rodriguez</strong>
                <span>Médico General, 10 brigadas</span>
              </figcaption>
            </figure>
          </section>

          {/* ── FORMULARIO O MENSAJE DE CIERRE ── */}
          <section
            className={styles.formSection}
            aria-labelledby="form-heading"
            id="formulario"
          >
            <h2 id="form-heading">
              {!isClosed && !isCupoLleno
                ? "¿Listo para Unirte?"
                : isCupoLleno
                ? "Capacidad Máxima Alcanzada"
                : "Inscripciones Cerradas"}
            </h2>
            <p className={styles.formIntro}>
              {!isClosed && !isCupoLleno
                ? `Llena el formulario para postularte a la brigada ${activeBrigada?.nombre ?? ""}${
                    cuposInfo.disponibles !== null
                      ? ` (${cuposInfo.disponibles} cupos disponibles)`
                      : ""
                  }. Nos pondremos en contacto contigo pronto.`
                : isCupoLleno
                ? `Hemos completado la capacidad máxima de voluntarios (${cuposInfo.registrados} de ${cuposInfo.total} cupos ocupados) para la brigada ${activeBrigada?.nombre ?? ""}. Agradecemos tu vocación de servicio; mantente al tanto para futuras convocatorias.`
                : "Actualmente no contamos con brigadas activas para inscripciones abiertas de voluntarios. Por favor mantente al tanto de nuestros canales oficiales para futuras convocatorias."}
            </p>
            {!isClosed && !isCupoLleno && activeBrigada && (
              <VolunteerForm activeBrigadaId={activeBrigada.id} />
            )}
            {isCupoLleno && (
              <div className={`${styles.fullCard} card-drawn tone-tertiary`}>
                <div className={`${styles.fullIcon} icon-circle`} aria-hidden="true">
                  <Lock />
                </div>
                <h3 className="tone-text">Cupo de Voluntarios Completo</h3>
                <p>
                  Esta brigada médica ha alcanzado el número máximo de
                  participantes. Puedes seguir apoyando nuestra labor donando
                  insumos o conociendo nuestras brigadas anteriores.
                </p>
                <div className={styles.fullActions}>
                  <Link href="/brigadas" className="btn-primary">
                    Ver Brigadas Realizadas
                  </Link>
                  <Link href="/donar" className="btn-outline-blue">
                    Apoyar con Donación
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
