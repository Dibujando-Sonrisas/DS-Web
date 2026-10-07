import type { ReactNode } from "react";
import {
  Boxes,
  ChartColumn,
  CircleUserRound,
  HandHeart,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Pill,
  Settings,
  Shirt,
  ShoppingCart,
  Smile,
  Tent,
  UserCog,
} from "lucide-react";

export type AdminModule = {
  name: string;
  href: string;
  icon: ReactNode;
  available?: boolean;
};

export const adminModules: AdminModule[] = [
  {
    name: "Dashboard General",
    href: "/administracion",
    available: true,
    icon: <LayoutDashboard aria-hidden="true" />,
  },
  {
    name: "Gestión de Brigadas",
    href: "/administracion/brigadas",
    available: true,
    icon: <Tent aria-hidden="true" />,
  },
  {
    name: "Gestión de Voluntarios",
    href: "/administracion/voluntarios",
    available: true,
    icon: <HandHeart aria-hidden="true" />,
  },
  {
    name: "Inventario Médico",
    href: "/administracion/inventario",
    available: true,
    icon: <Boxes aria-hidden="true" />,
  },
  {
    name: "Atención de Pacientes",
    href: "/administracion/pacientes",
    available: true,
    icon: <HeartPulse aria-hidden="true" />,
  },
  {
    name: "Farmacia",
    href: "/administracion/farmacia",
    available: true,
    icon: <Pill aria-hidden="true" />,
  },
  {
    name: "Donaciones y Ropa",
    href: "/administracion/donaciones",
    available: true,
    icon: <Shirt aria-hidden="true" />,
  },
  {
    name: "Actividades Infantiles",
    href: "/administracion/actividades-infantiles",
    available: true,
    icon: <Smile aria-hidden="true" />,
  },
  {
    name: "Ventas de Apoyo",
    href: "/administracion/ventas",
    available: true,
    icon: <ShoppingCart aria-hidden="true" />,
  },
  {
    name: "Mensajes de Contacto",
    href: "/administracion/contacto",
    available: true,
    icon: <Inbox aria-hidden="true" />,
  },
  {
    name: "Reportes y Estadísticas",
    href: "/administracion/reportes",
    available: true,
    icon: <ChartColumn aria-hidden="true" />,
  },
];

export const accountModules: AdminModule[] = [
  {
    name: "Mi Perfil",
    href: "/administracion/perfil",
    icon: <CircleUserRound aria-hidden="true" />,
  },
  {
    name: "Gestión de Usuarios",
    href: "/administracion/usuarios",
    icon: <UserCog aria-hidden="true" />,
  },
  {
    name: "Ajustes",
    href: "/administracion/ajustes",
    icon: <Settings aria-hidden="true" />,
  },
];

/** Módulo al que pertenece una ruta (el dashboard solo coincide exacto). */
export function findModule(pathname: string) {
  return [...adminModules, ...accountModules].find((m) =>
    m.href === "/administracion" ? pathname === m.href : pathname.startsWith(m.href)
  );
}
