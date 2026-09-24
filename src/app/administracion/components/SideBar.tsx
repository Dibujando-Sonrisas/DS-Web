"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { canAccessRoute } from "@/lib/auth/permissions";
import { adminModules } from "./navModules";
import { usePermissions } from "./PermissionsProvider";
import UserAvatar from "./UserAvatar";
import styles from "@/styles/pages/admin.module.css";

interface SideBarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  displayName?: string;
  roleLabel?: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export default function SideBar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  displayName,
  roleLabel,
  avatarUrl,
  email,
}: SideBarProps) {
  const pathname = usePathname();
  const { role, specialtyName } = usePermissions();

  // en móvil, Escape cierra el menú abierto
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, onCloseMobile]);

  const visibleModules = adminModules.filter((link) =>
    canAccessRoute(role, link.href, specialtyName)
  );

  return (
    <>
      {/* Fondo oscuro detrás del menú en móvil */}
      {isMobileOpen && (
        <div className={styles.mobileOverlay} onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        aria-label="Menú del panel"
        className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""} ${
          isMobileOpen ? styles.sidebarMobileOpen : ""
        }`}
      >
        <Link
          href="/"
          className={styles.brand}
          aria-label="Dibujando Sonrisas: ir al sitio público"
          title="Ir al sitio público"
        >
          <span className={styles.brandLogo}>
            <Image src="/logo-mark.png" alt="" width={44} height={44} priority />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>
              Dibujando <span>Sonrisas</span>
            </span>
            <span className={styles.brandSub}>Sistema de Gestión</span>
          </span>
        </Link>

        <nav className={styles.sidebarNav} aria-label="Módulos">
          {visibleModules.map((link) => {
            const isActive =
              link.href === "/administracion"
                ? pathname === "/administracion"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                title={isCollapsed ? link.name : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              >
                {link.icon}
                <span className={styles.navLabel}>{link.name}</span>
                {!link.available && <span className={styles.navSoon}>Próx.</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {displayName && (
            <Link
              href="/administracion/perfil"
              onClick={onCloseMobile}
              className={styles.sidebarProfile}
              title={isCollapsed ? displayName : undefined}
            >
              <UserAvatar avatarUrl={avatarUrl} nombres={displayName} email={email} size={36} />
              <span className={styles.profileText}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileRole}>{roleLabel || "Personal"}</span>
              </span>
            </Link>
          )}

          <form action={logoutAction}>
            <button
              type="submit"
              className={styles.logoutBtn}
              title={isCollapsed ? "Cerrar Sesión" : undefined}
            >
              <LogOut aria-hidden="true" />
              <span className={styles.logoutLabel}>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
