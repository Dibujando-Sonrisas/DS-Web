import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { Heart, Mail, MapPin, Share2 } from "lucide-react";
import ContactForm from "./ContactForm";
import styles from "../../styles/pages/contact.module.css";

export const metadata: Metadata = {
  title: "Contacto | Dibujando Sonrisas",
  description:
    "Contáctanos — ¿Quieres apoyar, ser voluntario o saber más de Dibujando Sonrisas? Escríbenos y nos comunicaremos contigo pronto.",
};

export default function Contacto() {
  return (
    <>
      <Header />

      <PageHero
        image="/new-Contacto-hero.png"
        title={<em>Contáctanos</em>}
        subtitle="¿Quieres apoyar, ser voluntario o simplemente saber más de nosotros? ¡Escríbenos!"
      />

      {/* ── MAIN GRID: Info + Form ── */}
      <section
        className={`${styles.contactSection} container`}
        aria-labelledby="contact-heading"
      >
        <div className={styles.contactGrid}>
          {/* ── INFO COLUMN ── */}
          <div className={styles.contactInfo}>
            <h2 id="contact-heading">¿Cómo Llegar a Nosotros?</h2>
            <p>
              Somos una fundación hondureña con el corazón abierto. No dudes en
              escribirnos.
            </p>

            {/* Ubicación */}
            <div className={styles.infoItem}>
              <div className={styles.infoIcon} aria-hidden="true">
                <MapPin />
              </div>
              <div className={styles.infoText}>
                <h3>Ubicación</h3>
                <p>Tela, Atlántida – Honduras</p>
              </div>
            </div>

            {/* Correo */}
            <div className={styles.infoItem}>
              <div className={styles.infoIcon} aria-hidden="true">
                <Mail />
              </div>
              <div className={styles.infoText}>
                <h3>Correo Electrónico</h3>
                <p>
                  <a
                    href="mailto:fundacion.ds2021@gmail.com"
                    className={styles.emailLink}
                  >
                    fundacion.ds2021@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Redes sociales */}
            <div className={styles.infoItem}>
              <div className={styles.infoIcon} aria-hidden="true">
                <Share2 />
              </div>
              <div className={styles.infoText}>
                <h3>Redes Sociales</h3>
                <p>
                  Encuéntranos como <strong>@dibujando.sonrisas21</strong> en
                  Instagram y Facebook.
                </p>
              </div>
            </div>

            {/* Fe */}
            <div className={styles.infoItem}>
              <div className={styles.infoIcon} aria-hidden="true">
                <Heart />
              </div>
              <div className={styles.infoText}>
                <h3>Nuestra Fe</h3>
                <p>
                  Somos una fundación cristiana. Creemos que servir al prójimo
                  es servir a Dios.
                </p>
              </div>
            </div>

            {/* Social icon buttons */}
            <div className={styles.contactSocial}>
              <h3>Síguenos en Redes</h3>
              <div className={styles.socialLinks}>
                <a
                  href="https://www.facebook.com/share/18fJDbV3QB/?mibextid=wwXIfr"
                  aria-label="Facebook"
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                  >
                    <path
                      clipRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      fillRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/dibujando.sonrisas21?igsh=MXJlazZ0bHRmeWg1bA=="
                  aria-label="Instagram"
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@dibujando.sonrisas.hn"
                  aria-label="TikTok"
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@dibujandosonrisas.honduras?si=mW60M5L9hQyNGlNs"
                  aria-label="YouTube"
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                  >
                    <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* ── FORM COLUMN ── */}
          <div className={styles.formWrapper}>
            <h3>Envíanos un Mensaje</h3>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── WHATSAPP CTA ── */}
      <section
        className={styles.whatsappSection}
        aria-labelledby="whatsapp-heading"
      >
        <h2 id="whatsapp-heading">¡Únete a Nuestra Comunidad de WhatsApp!</h2>
        <p>
          Mantente al día con nuestras próximas brigadas, proyectos y formas de
          apoyar.
        </p>
        <a
          href="https://chat.whatsapp.com/DKeiRi1iRXS7koprGs7ZDm"
          className={styles.btnWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            className={styles.whatsappIcon}
            fill="currentColor"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Unirse a la Comunidad
        </a>
      </section>

      <Footer />
    </>
  );
}
