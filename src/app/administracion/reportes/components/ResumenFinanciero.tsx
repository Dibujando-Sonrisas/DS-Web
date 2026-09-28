"use client";

import { useState, useEffect } from "react";
import { Banknote, ChartColumn, Gift, Printer, Receipt, ShoppingCart } from "lucide-react";
import EmptyState from "@/app/administracion/components/EmptyState";
import StatCard from "@/app/administracion/components/StatCard";
import admin from "@/styles/pages/admin.module.css";
import styles from "@/styles/pages/reportes.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import PrintReportDocument from "./PrintReportDocument";

function formatHNL(value: number) {
  return `L. ${value.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface FinancialPeriodData {
  anio: number;
  mes: number;
  total_ventas: number;
  total_donaciones: number;
  cantidad_ventas: number;
  cantidad_donaciones: number;
  total_general: number;
}

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function ResumenFinanciero() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";

  const [periodosData, setPeriodosData] = useState<FinancialPeriodData[]>([]);
  const [anioFiltro, setAnioFiltro] = useState<string>("todos");
  const [mesFiltro, setMesFiltro] = useState<string>("todos");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchFinancialData() {
      setLoading(true);
      try {
        // 1. Consultar la View optimizada v_resumen_financiero_mensual
        const { data: viewData, error: viewError } = await supabase
          .from("v_resumen_financiero_mensual")
          .select("*")
          .order("anio", { ascending: false })
          .order("mes", { ascending: false });

        if (!viewError && viewData) {
          const formatted: FinancialPeriodData[] = viewData.map((row: any) => ({
            anio: Number(row.anio || 0),
            mes: Number(row.mes || 0),
            total_ventas: Number(row.total_ventas || 0),
            total_donaciones: Number(row.total_donaciones || 0),
            cantidad_ventas: Number(row.cantidad_ventas || 0),
            cantidad_donaciones: Number(row.cantidad_donaciones || 0),
            total_general: Number(row.total_general || 0),
          }));
          setPeriodosData(formatted);
          return;
        }

        // Fallback optimizado por si la View aún no está creada en la base de datos
        console.warn("View v_resumen_financiero_mensual no disponible, ejecutando fallback:", viewError?.message);

        const [{ data: salesData }, { data: donationsData }] = await Promise.all([
          supabase.from("ventas").select("id, total, fecha"),
          supabase.from("donaciones_ropa").select("id, cantidad_prendas, fecha_donacion"),
        ]);

        const map: Record<string, FinancialPeriodData> = {};

        (salesData || []).forEach((s: any) => {
          if (!s.fecha) return;
          const d = new Date(s.fecha);
          const a = d.getFullYear();
          const m = d.getMonth() + 1;
          const key = `${a}-${m}`;
          if (!map[key]) {
            map[key] = {
              anio: a,
              mes: m,
              total_ventas: 0,
              total_donaciones: 0,
              cantidad_ventas: 0,
              cantidad_donaciones: 0,
              total_general: 0,
            };
          }
          map[key].total_ventas += Number(s.total || 0);
          map[key].cantidad_ventas += 1;
        });

        (donationsData || []).forEach((d: any) => {
          if (!d.fecha_donacion) return;
          const dt = new Date(d.fecha_donacion);
          const a = dt.getFullYear();
          const m = dt.getMonth() + 1;
          const key = `${a}-${m}`;
          if (!map[key]) {
            map[key] = {
              anio: a,
              mes: m,
              total_ventas: 0,
              total_donaciones: 0,
              cantidad_ventas: 0,
              cantidad_donaciones: 0,
              total_general: 0,
            };
          }
          const val = Number(d.cantidad_prendas || 0) * 100;
          map[key].total_donaciones += val;
          map[key].cantidad_donaciones += 1;
        });

        const list = Object.values(map).map((item) => ({
          ...item,
          total_general: item.total_ventas + item.total_donaciones,
        }));

        setPeriodosData(list);
      } catch (err) {
        console.error("Error al cargar datos financieros sintetizados:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFinancialData();
  }, []);

  // Extraer años dinámicos disponibles
  const aniosDisponibles = Array.from(
    new Set(periodosData.map((p) => p.anio.toString()).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Filtrado por Año y Mes
  const periodosFiltrados = periodosData.filter((p) => {
    if (anioFiltro !== "todos" && p.anio.toString() !== anioFiltro) return false;
    if (mesFiltro !== "todos" && p.mes.toString() !== mesFiltro) return false;
    return true;
  });

  // Totales acumulados según el filtro aplicado
  const totalVentas = periodosFiltrados.reduce((acc, p) => acc + p.total_ventas, 0);
  const totalDonaciones = periodosFiltrados.reduce((acc, p) => acc + p.total_donaciones, 0);
  const cantidadVentas = periodosFiltrados.reduce((acc, p) => acc + p.cantidad_ventas, 0);
  const cantidadDonaciones = periodosFiltrados.reduce((acc, p) => acc + p.cantidad_donaciones, 0);
  const totalGeneral = totalVentas + totalDonaciones;

  // Etiqueta del período seleccionado
  const displayPeriodo =
    anioFiltro === "todos" && mesFiltro === "todos"
      ? "Consolidado Histórico Total"
      : `${mesFiltro !== "todos" ? MESES_NOMBRES[Number(mesFiltro)] || "" : "Todos los meses"} ${anioFiltro !== "todos" ? anioFiltro : "(Todos los años)"}`.trim();

  // Datos para la gráfica sintetizada (Ventas, Donaciones, Total General)
  const chartItems = [
    {
      id: "ventas",
      label: "Ventas",
      fullLabel: "Ventas de Apoyo",
      monto: totalVentas,
      bar: styles.barTeal,
    },
    {
      id: "donaciones",
      label: "Donaciones",
      fullLabel: "Donaciones Recibidas",
      monto: totalDonaciones,
      bar: styles.barYellow,
    },
    {
      id: "total",
      label: "Total General",
      fullLabel: "Total General de Ingresos",
      monto: totalGeneral,
      bar: styles.barDark,
    },
  ];

  const maxMontoChart = Math.max(...chartItems.map((c) => c.monto), 1);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Resumen Financiero - ${displayPeriodo}`;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();
    setTimeout(restoreTitle, 1000);
  };

  return (
    <div>
      {/* ── VISTA WEB (PAGINADA) ── */}
      <div className={`${styles.screenView} ${admin.stack}`}>
        {/* Encabezado */}
        <div className={admin.sectionHead}>
          <div>
            <h2 className={admin.sectionTitle}>Resumen Financiero por Período</h2>
            <p className={admin.sectionLead}>
              Consolidado ejecutivo mensual de ingresos por ventas de apoyo y donaciones recibidas.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
            <Printer aria-hidden="true" />
            Imprimir
          </button>
        </div>

        {/* Filtros por Mes y Año */}
        <div className={admin.panel}>
          <div className={admin.toolbar}>
            <div className={admin.filter}>
              <label className={admin.filterLabel} htmlFor="filtro-mes">
                Mes
              </label>
              <select
                id="filtro-mes"
                className="form-input form-input-sm"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                disabled={loading}
              >
                <option value="todos">Todos los meses</option>
                {Object.entries(MESES_NOMBRES).map(([num, name]) => (
                  <option key={num} value={num}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className={admin.filter}>
              <label className={admin.filterLabel} htmlFor="filtro-anio">
                Año
              </label>
              <select
                id="filtro-anio"
                className="form-input form-input-sm"
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
                disabled={loading}
              >
                <option value="todos">Todos los años</option>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a}>
                    Año {a}
                  </option>
                ))}
              </select>
            </div>

            <p className={admin.toolbarNote}>
              Moneda: <strong>Lempira Hondureño (HNL)</strong>
            </p>
          </div>
        </div>

        {/* KPIs Financieros */}
        {loading ? (
          <div className={admin.statGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${admin.skeleton} ${admin.skeletonStat}`} />
            ))}
          </div>
        ) : (
          <div className={`${admin.statGrid} tone-rotate`}>
            <StatCard
              label="Total Recaudado por Ventas"
              value={formatHNL(totalVentas)}
              icon={<ShoppingCart />}
              meta={`${cantidadVentas.toLocaleString()} ventas realizadas`}
              metaTone="ok"
            />
            <StatCard
              label="Total Recibido por Donaciones"
              value={formatHNL(totalDonaciones)}
              icon={<Gift />}
              meta={`${cantidadDonaciones.toLocaleString()} donaciones registradas`}
              metaTone="ok"
            />
            <StatCard
              label="Total General de Ingresos"
              value={formatHNL(totalGeneral)}
              icon={<Banknote />}
              meta={`Período: ${displayPeriodo}`}
              metaTone="ok"
              valueTone="ok"
            />
            <StatCard
              label="Registros Financieros"
              value={(cantidadVentas + cantidadDonaciones).toLocaleString()}
              icon={<Receipt />}
              meta="Transacciones en el período"
            />
          </div>
        )}

        {/* Sección de Gráfico (Ventas, Donaciones, Total General) */}
        <section className={admin.panel}>
          <div className={admin.panelHeader}>
            <h2 className={admin.panelTitle}>
              Comparativo de Ingresos Financieros ({displayPeriodo})
            </h2>
          </div>
          <div className={admin.panelBody}>
            {loading ? (
              <div className={`${admin.skeleton} ${admin.skeletonBlock}`} />
            ) : totalGeneral === 0 ? (
              <EmptyState
                icon={<ChartColumn />}
                title="No hay ingresos registrados en el período seleccionado."
              />
            ) : (
              <div className={styles.chart}>
                <div className={styles.barChartGrid}>
                  {chartItems.map((item) => {
                    const alturaPorcentaje = Math.max(
                      (item.monto / maxMontoChart) * 80,
                      8
                    );
                    return (
                      <div key={item.id} className={styles.barCol}>
                        <div className={styles.barColTooltip}>
                          {item.fullLabel}: {formatHNL(item.monto)}
                        </div>
                        <div
                          className={`${styles.chartBarElement} ${item.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.barLabel}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tabla Resumen Ejecutivo */}
        <section className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h2 className={admin.panelTitle}>Resumen Ejecutivo Financiero</h2>
              <p className={admin.panelSub}>{displayPeriodo}</p>
            </div>
          </div>
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th>Concepto / Fuente de Ingreso</th>
                  <th className={admin.num}>Cantidad de Registros</th>
                  <th className={admin.num}>Total Recaudado (HNL)</th>
                  <th className={admin.num}>Porcentaje del Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={admin.emptyCell}>
                      Cargando resumen ejecutivo...
                    </td>
                  </tr>
                ) : totalGeneral === 0 ? (
                  <tr>
                    <td colSpan={4} className={admin.emptyCell}>
                      No se encontraron registros de ingresos para este período.
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barTeal}`} aria-hidden="true" />
                        Ventas de Apoyo
                      </td>
                      <td className={admin.num}>{cantidadVentas.toLocaleString()} ventas</td>
                      <td className={`${admin.num} ${styles.cellOk}`}>{formatHNL(totalVentas)}</td>
                      <td className={admin.num}>
                        {totalGeneral > 0 ? ((totalVentas / totalGeneral) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barYellow}`} aria-hidden="true" />
                        Donaciones Recibidas
                      </td>
                      <td className={admin.num}>{cantidadDonaciones.toLocaleString()} donaciones</td>
                      <td className={`${admin.num} ${styles.cellOk}`}>{formatHNL(totalDonaciones)}</td>
                      <td className={admin.num}>
                        {totalGeneral > 0 ? ((totalDonaciones / totalGeneral) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  </>
                )}
                {!loading && totalGeneral > 0 && (
                  <tr className={styles.totalRow}>
                    <td>TOTAL GENERAL DE INGRESOS</td>
                    <td className={admin.num}>
                      {(cantidadVentas + cantidadDonaciones).toLocaleString()} registros
                    </td>
                    <td className={`${admin.num} ${styles.cellOk}`}>{formatHNL(totalGeneral)}</td>
                    <td className={admin.num}>100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── VISTA DE IMPRESIÓN REUTILIZABLE INSTITUCIONAL ── */}
      <div className={styles.printView}>
        <PrintReportDocument
          title="Resumen Financiero por Período"
          userRole={userRole}
          metaItems={[
            { label: "Período", value: displayPeriodo },
            { label: "Frecuencia", value: "Mensual / Consolidado" },
          ]}
          summaryCards={[
            { label: "Total General de Ingresos", value: formatHNL(totalGeneral) },
            { label: "Total Recaudado por Ventas", value: formatHNL(totalVentas) },
            { label: "Total Recibido por Donaciones", value: formatHNL(totalDonaciones) },
            { label: "Total Transacciones", value: (cantidadVentas + cantidadDonaciones).toString() },
          ]}
          footerNote="Consolidado de ingresos financieros — Fundación Dibujando Sonrisas"
        >
          {/* Gráfico en Impresión */}
          <div className={styles.printGraph}>
            <h3 className={styles.printGraphTitle}>Comparativo de Ingresos Financieros</h3>
            <div className={styles.printGraphArea}>
              {loading ? (
                <div className={styles.printGraphEmpty}>Cargando gráfico...</div>
              ) : totalGeneral === 0 ? (
                <div className={styles.printGraphEmpty}>
                  No hay ingresos registrados en el período.
                </div>
              ) : (
                <div className={`${styles.barChartGrid} ${styles.printBars}`}>
                  {chartItems.map((item) => {
                    const alturaPorcentaje = Math.max(
                      (item.monto / maxMontoChart) * 75,
                      10
                    );
                    return (
                      <div key={item.id} className={styles.barCol}>
                        <span className={styles.printBarValue}>{formatHNL(item.monto)}</span>
                        <div
                          className={`${styles.printBar} ${item.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.printBarLabel}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <table className={styles.printTable}>
            <thead>
              <tr>
                <th className={`${styles.w8} ${styles.printCenter}`}>#</th>
                <th className={styles.w42}>Fuente de Ingreso</th>
                <th className={`${styles.w22} ${styles.printRight}`}>Cantidad de Registros</th>
                <th className={`${styles.w28} ${styles.printRight}`}>Monto Recaudado (HNL)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.printCenter}>
                    Cargando resumen...
                  </td>
                </tr>
              ) : totalGeneral === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.printCenter}>
                    No hay ingresos registrados en este período.
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className={styles.printCenter}>1</td>
                    <td className={styles.printStrong}>Ventas de Apoyo</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {cantidadVentas.toLocaleString()} ventas
                    </td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {formatHNL(totalVentas)}
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.printCenter}>2</td>
                    <td className={styles.printStrong}>Donaciones Recibidas</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {cantidadDonaciones.toLocaleString()} donaciones
                    </td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {formatHNL(totalDonaciones)}
                    </td>
                  </tr>
                </>
              )}
              {!loading && totalGeneral > 0 && (
                <tr className={styles.printTotalRow}>
                  <td colSpan={2}>TOTAL GENERAL DE INGRESOS DEL PERÍODO</td>
                  <td className={styles.printRight}>
                    {(cantidadVentas + cantidadDonaciones).toLocaleString()} registros
                  </td>
                  <td className={styles.printRight}>{formatHNL(totalGeneral)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </PrintReportDocument>
      </div>
    </div>
  );
}
