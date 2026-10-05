"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CircleCheck, TriangleAlert } from "lucide-react";
import { usePermissions } from "./PermissionsProvider";
import { createBrowserClient } from "@supabase/ssr";
import styles from "@/styles/pages/admin.module.css";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface AlertaStockItem {
  id: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  categoria: string;
}

export default function NotificacionesStockBtn() {
  const { canAny, canRoute } = usePermissions();
  const [open, setOpen] = useState(false);
  const [alertas, setAlertas] = useState<AlertaStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Solo quien gestiona stock ve las alertas
  const tieneAcceso = canAny([PERMISSIONS.INVENTARIO_UPDATE, PERMISSIONS.FARMACIA_UPDATE]);
  // el pie lleva a reportes si puede abrirlo; si no, al inventario
  const enlacePie = canRoute("/administracion/reportes")
    ? { href: "/administracion/reportes", label: "Ver reporte completo de stock" }
    : canRoute("/administracion/inventario")
    ? { href: "/administracion/inventario", label: "Ver inventario" }
    : null;

  useEffect(() => {
    if (!tieneAcceso) return;

    async function fetchAlertas() {
      setLoading(true);
      try {
        // Crear el cliente del navegador localmente para evitar que el
        // singleton de supabase.ts se evalúe en el contexto SSR del layout.
        const client = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await client
          .from("stock_actual")
          .select("medicamento_id, nombre, stock_total, stock_minimo, unidad_medida, tipo_recurso")
          .order("nombre", { ascending: true });

        if (error) throw error;

        const criticos: AlertaStockItem[] = (data || [])
          .filter((m: any) => (m.stock_total ?? 0) < (m.stock_minimo ?? 0))
          .map((m: any) => ({
            id: m.medicamento_id,
            nombre: m.nombre,
            stockActual: m.stock_total ?? 0,
            stockMinimo: m.stock_minimo ?? 0,
            unidad: m.unidad_medida || "uds",
            categoria:
              m.tipo_recurso === "insumo_medico"
                ? "Insumo Médico"
                : m.tipo_recurso === "material_brigada"
                ? "Material Brigada"
                : "Medicamento",
          }));
        setAlertas(criticos);
      } catch (err) {
        console.error("Error al cargar alertas de stock:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlertas();
  }, [tieneAcceso]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!tieneAcceso) return null;

  const count = alertas.length;

  return (
    <div className={styles.menuWrap} ref={ref}>
      <button
        id="btn-notificaciones-stock"
        type="button"
        className={`btn-icon ${styles.notifBtn}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Alertas de stock mínimo${count > 0 ? ` — ${count} críticos` : ""}`}
        aria-expanded={open}
        title="Alertas de stock mínimo"
      >
        <Bell aria-hidden="true" />
        {count > 0 && (
          <span className={styles.notifBadge} aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${styles.dropdown} ${styles.notifPanel}`}
          role="dialog"
          aria-label="Alertas de stock mínimo"
        >
          <div className={styles.notifHead}>
            <span className={styles.notifTitle}>
              <TriangleAlert aria-hidden="true" />
              Alertas de Stock Mínimo
            </span>
            {count > 0 && (
              <span className={`${styles.badge} ${styles.badgeDanger}`}>
                {count} {count === 1 ? "producto crítico" : "productos críticos"}
              </span>
            )}
          </div>

          <div className={styles.notifList}>
            {loading ? (
              <p className={styles.notifEmpty}>Cargando alertas...</p>
            ) : count === 0 ? (
              <div className={styles.notifEmpty}>
                <CircleCheck aria-hidden="true" />
                Sin alertas críticas de stock
              </div>
            ) : (
              alertas.slice(0, 8).map((item) => (
                <div key={item.id} className={styles.notifItem}>
                  <div className={styles.notifInfo}>
                    <span className={styles.notifName}>{item.nombre}</span>
                    <span className={styles.notifMeta}>{item.categoria}</span>
                  </div>
                  <span className={styles.notifStock}>
                    {item.stockActual} / {item.stockMinimo} {item.unidad}
                  </span>
                </div>
              ))
            )}

            {count > 8 && (
              <p className={styles.notifMore}>
                +{count - 8} {count - 8 === 1 ? "producto más" : "productos más"} con stock crítico
              </p>
            )}
          </div>

          {enlacePie && (
            <Link
              href={enlacePie.href}
              className={styles.notifFooter}
              onClick={() => setOpen(false)}
            >
              {enlacePie.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
