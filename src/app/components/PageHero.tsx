import type { ReactNode } from "react";
import styles from "../../styles/components/page-hero.module.css";

type PageHeroProps = {
  image: string;
  /** Envuelve en <span> la palabra a resaltar en amarillo de marca */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Botones u otras acciones bajo el subtítulo */
  children?: ReactNode;
};

export default function PageHero({ image, title, subtitle, children }: PageHeroProps) {
  return (
    <div className={styles.hero} style={{ backgroundImage: `url(${image})` }}>
      <div className="container">
        <h1 className={styles.title}>{title}</h1>
        <div className="crayons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </div>
  );
}
