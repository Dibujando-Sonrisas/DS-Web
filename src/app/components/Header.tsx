"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "../../styles/components/header.module.css";
import { Headset, HeartHandshake, Menu, UserRoundArrowLeft, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/nuestro-trabajo", label: "Nuestro Trabajo" },
  { href: "/brigadas", label: "Brigadas" },
  { href: "/voluntariado", label: "Voluntariado" },
];

export default function Header() {
  const pathname = usePathname();
  // El menú guarda la ruta donde se abrió: al navegar deja de coincidir y se cierra solo
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = menuPath === pathname;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.navigation}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <Link href={"/"} className={styles.logoLink}>
                <Image src={"/logo.png"} width={100} height={100} alt="Logo" />
              </Link>
            </div>
          </div>

          <nav className={styles.navbar} aria-label="Navegación principal">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <div key={link.href}>
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.navRef} ${
                      isActive ? styles.navRefActive : ""
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/auth/login"
            className="btn-outline-blue btn-sm"
            aria-label="Iniciar sesión"
            title="Iniciar sesión"
          >
            <UserRoundArrowLeft aria-hidden="true" />
          </Link>
          <Link
            href="/contacto"
            className="btn-primary btn-sm"
            aria-label="Contacto"
            title="Contacto"
          >
            <Headset aria-hidden="true" />
          </Link>
          <Link href="/donar" className="btn-primary btn-sm">
            <HeartHandshake aria-hidden="true" />
            Donar
          </Link>

          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMenuPath(mobileMenuOpen ? null : pathname)}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={styles.mobileNavContainer}>
          <nav className={styles.mobileNavbar} aria-label="Navegación móvil">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navRef} ${styles.mobileNavRef} ${
                    isActive ? styles.navRefActive : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className={styles.mobileNavButtons}>
              <Link
                href="/auth/login"
                className="btn-outline-blue btn-sm"
                aria-label="Iniciar sesión"
              >
                <UserRoundArrowLeft aria-hidden="true" />
              </Link>
              <Link
                href="/contacto"
                className="btn-primary btn-sm"
                aria-label="Contacto"
              >
                <Headset aria-hidden="true" />
              </Link>
              <Link
                href="/donar"
                className="btn-primary btn-sm"
                aria-label="Donar"
              >
                <HeartHandshake aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
