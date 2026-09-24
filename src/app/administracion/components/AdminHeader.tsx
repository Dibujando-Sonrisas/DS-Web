"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { findModule } from "./navModules";
import UserAvatar from "./UserAvatar";
import NotificacionesStockBtn from "./NotificacionesStockBtn";
import styles from "@/styles/pages/admin.module.css";

interface AdminHeaderProps {
  displayName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  email?: string | null;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobile: () => void;
}

const MODULE_TITLES: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: "/administracion/pacientes", title: "Atención de Pacientes", subtitle: "Expedientes clínicos y consultas" },
  { prefix: "/administracion/brigadas", title: "Gestión de Brigadas", subtitle: "Planificación, estado y asignaciones" },
  { prefix: "/administracion/voluntarios", title: "Gestión de Voluntarios", subtitle: "Registro, perfiles y especialidades" },
  { prefix: "/administracion/inventario", title: "Inventario Médico", subtitle: "Medicamentos, insumos y movimientos" },
  { prefix: "/administracion/farmacia", title: "Farmacia", subtitle: "Despacho de recetas y control de stock" },
  { prefix: "/administracion/donaciones", title: "Donaciones y Ropa", subtitle: "Recepción, inventario y entregas" },
  { prefix: "/administracion/actividades-infantiles", title: "Actividades Infantiles", subtitle: "Recreación, apoyo y dinámicas comunitarias" },
  { prefix: "/administracion/ventas", title: "Ventas de Apoyo", subtitle: "Kits, artículos institucionales y recaudación" },
  { prefix: "/administracion/reportes", title: "Reportes y Estadísticas", subtitle: "Análisis de datos, atenciones y brigadas" },
  { prefix: "/administracion/usuarios", title: "Login y Usuarios", subtitle: "Administración de accesos y credenciales" },
  { prefix: "/administracion/perfil", title: "Mi Perfil", subtitle: "Información personal y cuenta" },
  { prefix: "/administracion/contacto", title: "Mensajes de Contacto", subtitle: "Bandeja de mensajes del sitio web" },
  { prefix: "/administracion", title: "Dashboard General", subtitle: "Resumen ejecutivo y métricas globales" },
];

export default function AdminHeader({
  displayName,
  roleLabel,
  avatarUrl,
  email,
  isCollapsed,
  onToggleSidebar,
  onToggleMobile,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Título del módulo según la ruta
  const activeModule = MODULE_TITLES.find((m) =>
    m.prefix === "/administracion" ? pathname === "/administracion" : pathname.startsWith(m.prefix)
  ) || { title: "Sistema Integral", subtitle: "Fundación Dibujando Sonrisas" };
  const moduleIcon = findModule(pathname)?.icon;

  // Cerrar el menú al hacer clic fuera o con Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const todayFormatted = new Intl.DateTimeFormat("es-HN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <header className={styles.adminHeader}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={`btn-icon ${styles.collapseBtn}`}
          onClick={onToggleSidebar}
          title={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          aria-label={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
        >
          {isCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>

        <button
          type="button"
          className={`btn-icon ${styles.mobileMenuBtn}`}
          onClick={onToggleMobile}
          aria-label="Abrir menú"
          aria-controls="admin-sidebar"
        >
          <Menu aria-hidden="true" />
        </button>

        <div className={styles.crumb}>
          {moduleIcon && (
            <span className={styles.crumbIcon} aria-hidden="true">
              {moduleIcon}
            </span>
          )}
          <div className={styles.crumbText}>
            <span className={styles.crumbTitle}>{activeModule.title}</span>
            <span className={styles.crumbSub}>{activeModule.subtitle}</span>
          </div>
        </div>
      </div>

      <div className={styles.headerSearch} role="search">
        <Search aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar paciente, brigada o medicina..."
          className={styles.headerSearchInput}
          aria-label="Buscar en el sistema"
        />
      </div>

      <div className={styles.headerRight}>
        {/* la fecha del servidor puede diferir de la del navegador */}
        <span className={styles.headerDate} title="Fecha del sistema" suppressHydrationWarning>
          <CalendarDays aria-hidden="true" />
          {todayFormatted}
        </span>

        {/* Alertas de stock mínimo */}
        <NotificacionesStockBtn />

        <div className={styles.headerDivider} />

        <div ref={dropdownRef} className={styles.menuWrap}>
          <button
            type="button"
            className={styles.userTrigger}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
          >
            <UserAvatar avatarUrl={avatarUrl} nombres={displayName} email={email} size={36} />
            <span className={styles.userText}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{roleLabel}</span>
            </span>
            <ChevronDown
              className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ""}`}
              aria-hidden="true"
            />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownHead}>
                <span className={styles.dropdownName}>{displayName}</span>
                <span className={styles.dropdownEmail}>{email}</span>
              </div>
              <Link
                href="/administracion/perfil"
                role="menuitem"
                className={styles.dropdownItem}
                onClick={() => setDropdownOpen(false)}
              >
                <CircleUserRound aria-hidden="true" />
                Mi Perfil
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                >
                  <LogOut aria-hidden="true" />
                  Cerrar Sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
