import Link from "next/link";
import { SOCIAL_LINKS } from "./SocialIcons";
import styles from "../../styles/components/footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.footerTop} container`}>
        <div className={styles.brand}>
          <Link href="/">
            <p className={styles.logo}>
              Dibujando<span className={styles.logoSpan}> Sonrisas</span>
            </p>
          </Link>
          <p className={styles.tagline}>
            Fundación cristiana que lleva salud, amor y esperanza a las
            comunidades más vulnerables de Honduras.
          </p>

          <div className={styles.social}>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className={styles.socialLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon size={18} />
              </a>
            ))}
            <a
              href="https://gofund.me/97bce5025"
              aria-label="GoFundMe"
              className={`${styles.socialLink} ${styles.gfmLink}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>GFM</span>
            </a>
          </div>
        </div>

        <nav>
          <h4 className={styles.navTitle}>Navegación</h4>
          <ul className={styles.navList}>
            <li>
              <Link href="/sobre-nosotros">Sobre Nosotros</Link>
            </li>
            <li>
              <Link href="/nuestro-trabajo">Nuestro Trabajo</Link>
            </li>
            <li>
              <Link href="/brigadas">Brigadas</Link>
            </li>
            <li>
              <Link href="/voluntariado">Voluntariado</Link>
            </li>
            <li>
              <Link href="/donar">Donar</Link>
            </li>
            <li>
              <Link href="/contacto">Contacto</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.infoCol}>
          <h4 className={styles.navTitle}>Contacto</h4>
          <p>Honduras</p>
          <p>fundacion.ds2021@gmail.com</p>
          <p>WhatsApp disponible próximamente</p>
          <p>Fundación Cristiana</p>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={`${styles.footerBottomInner} container`}>
          <p>© 2025 Dibujando Sonrisas. Todos los derechos reservados.</p>
          <p>Hecho con amor para Honduras</p>
        </div>
      </div>
    </footer>
  );
}
