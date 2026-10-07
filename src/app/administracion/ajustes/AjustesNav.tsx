"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import aj from "@/styles/pages/admin-ajustes.module.css";

/** Secciones de Ajustes: cada una es una carpeta con su page.tsx. */
const SECCIONES_AJUSTES = [
  {
    href: "/administracion/ajustes/correos",
    label: "Correos",
    icon: <Mail aria-hidden="true" />,
  },
];

export default function AjustesNav() {
  const pathname = usePathname();

  return (
    <nav className={aj.nav} aria-label="Secciones de ajustes">
      {SECCIONES_AJUSTES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={aj.navItem}
          aria-current={pathname.startsWith(s.href) ? "page" : undefined}
        >
          {s.icon}
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
