import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import styles from "@/styles/pages/auth.module.css";

/**
 * Tarjeta de las páginas de acceso: panel de marca (el mismo verde del panel
 * administrativo) a la izquierda y el formulario a la derecha. Estas páginas
 * no llevan el menú ni el pie del sitio: el enlace "Volver al sitio web" es la salida.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.authPage}>
      <div className={`${styles.authShell} card-soft`}>
        <div className={styles.authAside}>
          <div className={styles.asideBrand}>
            <span className={styles.asideLogo}>
              <Image src="/logo-mark.png" alt="" width={56} height={56} />
            </span>
            <span>
              <span className={styles.asideName}>
                Dibujando <span>Sonrisas</span>
              </span>
              <span className={styles.asideSub}>
                Sistema Web de Gestión Integral
              </span>
            </span>
          </div>

          <figure className={styles.asidePhoto}>
            <Image
              src="/new-Donar-hero.png"
              alt=""
              width={384}
              height={512}
              sizes="26rem"
            />
          </figure>

          <div className={styles.asideFoot}>
            <p className={styles.asideTagline}>
              Llevando salud, amor y esperanza a las comunidades de Honduras.
            </p>
            <div className="crayons" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className={styles.authBody}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            Volver al sitio web
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
