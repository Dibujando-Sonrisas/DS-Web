import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { Heart, Mail, MapPin, Share2 } from "lucide-react";
import { SOCIAL_LINKS, WhatsappIcon } from "../components/SocialIcons";
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
        className="section-y container"
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

            <div className={`${styles.infoList} tone-rotate`}>
              {/* Ubicación */}
              <div className={`${styles.infoItem} card-soft`}>
                <div className="icon-circle icon-circle-sm" aria-hidden="true">
                  <MapPin />
                </div>
                <div className={styles.infoText}>
                  <h3>Ubicación</h3>
                  <p>Tela, Atlántida – Honduras</p>
                </div>
              </div>

              {/* Correo */}
              <div className={`${styles.infoItem} card-soft`}>
                <div className="icon-circle icon-circle-sm" aria-hidden="true">
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
              <div className={`${styles.infoItem} card-soft`}>
                <div className="icon-circle icon-circle-sm" aria-hidden="true">
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
              <div className={`${styles.infoItem} card-soft`}>
                <div className="icon-circle icon-circle-sm" aria-hidden="true">
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
            </div>

            {/* Social icon buttons */}
            <div className={styles.contactSocial}>
              <h3>Síguenos en Redes</h3>
              <div className={`${styles.socialLinks} tone-rotate`}>
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={22} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── FORM COLUMN ── */}
          <div className={`${styles.formWrapper} card-soft card-drawn`}>
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
          <WhatsappIcon className={styles.whatsappIcon} />
          Unirse a la Comunidad
        </a>
      </section>

      <Footer />
    </>
  );
}
