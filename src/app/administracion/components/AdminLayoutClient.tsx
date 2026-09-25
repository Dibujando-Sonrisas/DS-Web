"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "./AdminHeader";
import SideBar from "./SideBar";
import { ToastProvider } from "./AdminToast";
import styles from "@/styles/pages/admin.module.css";

interface AdminLayoutClientProps {
  displayName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  email?: string | null;
  children: React.ReactNode;
}

export default function AdminLayoutClient({
  displayName,
  roleLabel,
  avatarUrl,
  email,
  children,
}: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Restore sidebar collapsed preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ds_sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ds_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <ToastProvider>
      <div className={styles.adminLayoutWrapper}>
        {/* Barra lateral a todo lo alto; en móvil es un cajón */}
        <SideBar
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          displayName={displayName}
          roleLabel={roleLabel}
          avatarUrl={avatarUrl}
          email={email}
        />

        {/* Encabezado + contenido de cada módulo */}
        <div className={styles.mainContent}>
          <AdminHeader
            displayName={displayName}
            roleLabel={roleLabel}
            avatarUrl={avatarUrl}
            email={email}
            isCollapsed={isCollapsed}
            onToggleSidebar={handleToggleSidebar}
            onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
          />

          <main className={styles.contentArea}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
