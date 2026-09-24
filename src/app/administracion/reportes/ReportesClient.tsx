"use client";

import { useState, useEffect } from "react";
import {
  Banknote,
  ChartColumn,
  ChartPie,
  ChevronDown,
  Clock,
  FileText,
  HeartPulse,
  Package,
  Star,
  Tent,
  TriangleAlert,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import PageHeader from "@/app/administracion/components/PageHeader";
import StatCard from "@/app/administracion/components/StatCard";
import admin from "@/styles/pages/admin.module.css";
import styles from "@/styles/pages/reportes.module.css";
import { getDashboardStatsAction } from "./actions";

// ── Importar Reportes Individuales ─────────────────────────────────────────
import PacientesBrigada from "./components/PacientesBrigada";
import MedicamentosVencer from "./components/MedicamentosVencer";
import StockMinimo from "./components/StockMinimo";
import AtencionesVoluntario from "./components/AtencionesVoluntario";
import ResumenInsumos from "./components/ResumenInsumos";
import ResumenFinanciero from "./components/ResumenFinanciero";
import ResumenBrigadas from "./components/ResumenBrigadas";
import TopDonantes from "./components/TopDonantes";

// ── Tipos y Definiciones ───────────────────────────────────────────────────

type VistaGlobal = "estadisticas" | "reportes";
type CategoriaId = "detallados" | "sintetizados" | "excepciones";

interface ReporteDef {
  id: string;
  label: string;
  descripcion: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface CategoriaDef {
  id: CategoriaId;
  label: string;
  categoryLabel: string;
  categoryClass: string;
  icon: React.ReactNode;
  reportes: ReporteDef[];
}

// ── Estructura de Reportes ─────────────────────────────────────────────────
const categorias: CategoriaDef[] = [
  {
    id: "detallados",
    label: "Reportes Detallados",
    categoryLabel: "Detallado",
    categoryClass: admin.badgeInfo,
    icon: <FileText aria-hidden="true" />,
    reportes: [
      {
        id: "pacientes-brigada",
        label: " Pacientes por Brigada",
        descripcion:
          "Listado de pacientes atendidos, diagnósticos y medicamentos formulados.",
        icon: <UserRound aria-hidden="true" />,
        component: <PacientesBrigada />,
      },
      {
        id: "medicamentos-vencer",
        label: " Medicamentos a Vencer",
        descripcion:
          "Alertas de caducidad y fechas límites de fármacos en farmacia.",
        icon: <Clock aria-hidden="true" />,
        component: <MedicamentosVencer />,
      },
      {
        id: "stock-minimo",
        label: " Alerta de Stock Mínimo",
        descripcion:
          "Productos e insumos por debajo del umbral de reabastecimiento.",
        icon: <TriangleAlert aria-hidden="true" />,
        component: <StockMinimo />,
      },
      {
        id: "atenciones-voluntario",
        label: " Atenciones por Voluntario",
        descripcion:
          "Horas aportadas y pacientes atendidos por cada especialista.",
        icon: <Users aria-hidden="true" />,
        component: <AtencionesVoluntario />,
      },
    ],
  },
  {
    id: "sintetizados",
    label: "Reportes Sintetizados",
    categoryLabel: "Sintetizado",
    categoryClass: admin.badgeSuccess,
    icon: <ChartColumn aria-hidden="true" />,
    reportes: [
      {
        id: "resumen-insumos",
        label: " Resumen de Entrega de Insumos",
        descripcion:
          "Consolidación de materiales y medicamentos donados por categoría.",
        icon: <Package aria-hidden="true" />,
        component: <ResumenInsumos />,
      },
      {
        id: "resumen-financiero",
        label: " Resumen Financiero por Periodo",
        descripcion:
          "Balance de ingresos, egresos y saldo neto con visualización gráfica.",
        icon: <Banknote aria-hidden="true" />,
        component: <ResumenFinanciero />,
      },
      {
        id: "resumen-brigadas",
        label: " Resumen de Brigadas Realizadas",
        descripcion:
          "Pacientes atendidos, recetas y médicos en las brigadas médicas.",
        icon: <Tent aria-hidden="true" />,
        component: <ResumenBrigadas />,
      },
    ],
  },
  {
    id: "excepciones",
    label: "Reportes de Excepción",
    categoryLabel: "Excepción",
    categoryClass: admin.badgeWarning,
    icon: <Star aria-hidden="true" />,
    reportes: [
      {
        id: "top-donantes",
        label: " Top Donantes por Año",
        descripcion:
          "Insignia y muro de honor a los benefactores de la fundación por periodo anual.",
        icon: <Trophy aria-hidden="true" />,
        component: <TopDonantes />,
      },
    ],
  },
];

// Barras fijas del gráfico de costos (altura en %)
const distribucionCostos = [
  { label: "Médicos", monto: "L. 134,500", altura: 80, bar: styles.barTeal },
  { label: "Dental", monto: "L. 84,000", altura: 50, bar: styles.barYellow },
  { label: "Logística", monto: "L. 58,200", altura: 35, bar: styles.barRed },
  { label: "Ayuda Hum.", monto: "L. 47,890", altura: 28, bar: styles.barGray },
];

export default function ReportesClient() {
  const [vistaGlobal, setVistaGlobal] = useState<VistaGlobal>("reportes");
  const [categoriaActiva, setCategoriaActiva] =
    useState<CategoriaId>("detallados");
  const [reporteSeleccionado, setReporteSeleccionado] = useState<
    Record<CategoriaId, string>
  >({
    detallados: "pacientes-brigada",
    sintetizados: "resumen-insumos",
    excepciones: "top-donantes",
  });
  const [dropdownAbierto, setDropdownAbierto] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getDashboardStatsAction().then(setStats).catch(console.error);
  }, []);

  const categoriaActual = categorias.find((c) => c.id === categoriaActiva)!;
  const reporteActivoId = reporteSeleccionado[categoriaActiva];
  const reporteActual = categoriaActual.reportes.find(
    (r) => r.id === reporteActivoId
  )!;

  const toggleDropdown = () => setDropdownAbierto(!dropdownAbierto);

  const cambiarReporte = (id: string) => {
    setReporteSeleccionado((prev) => ({
      ...prev,
      [categoriaActiva]: id,
    }));
    setDropdownAbierto(false);
  };

  const cambiarCategoria = (catId: CategoriaId) => {
    setCategoriaActiva(catId);
    setDropdownAbierto(false);
  };

  return (
    <div className={admin.page}>
      <PageHeader
        title="Estadísticas y Reportes de la Fundación"
        description={
          vistaGlobal === "estadisticas"
            ? "Resumen visual de impacto, atenciones médicas e información financiera consolidada."
            : "Generador de reportes formales listos para imprimir o exportar."
        }
      />

      {/* Switch Principal */}
      <div className={`${admin.tabs} no-print`} role="tablist" aria-label="Vista de reportes">
        <button
          type="button"
          role="tab"
          aria-selected={vistaGlobal === "estadisticas"}
          className={admin.tab}
          onClick={() => setVistaGlobal("estadisticas")}
        >
          <ChartPie aria-hidden="true" />
          Estadísticas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vistaGlobal === "reportes"}
          className={admin.tab}
          onClick={() => setVistaGlobal("reportes")}
        >
          <FileText aria-hidden="true" />
          Reportes
        </button>
      </div>

      {/* ── VISTA DE ESTADÍSTICAS GLOBAL ── */}
      {vistaGlobal === "estadisticas" && (
        <div className={`${admin.stack} no-print`}>
          {/* Fila de KPIs de Impacto */}
          <div className={`${admin.statGrid} tone-rotate`}>
            <StatCard
              label="Pacientes Atendidos"
              value={stats?.pacientesAtendidos || "0"}
              icon={<HeartPulse />}
              meta="+18% este año"
              metaTone="ok"
            />
            <StatCard
              label="Brigadas Médicas"
              value={stats?.brigadas || "0"}
              icon={<Tent />}
              meta="Comunidades cubiertas"
            />
            <StatCard
              label="Voluntarios Totales"
              value={stats?.voluntarios || "0"}
              icon={<Users />}
              meta="Activos en brigadas"
            />
            <StatCard
              label="Fondos Recaudados"
              value={`L. ${(stats?.fondos || 0).toLocaleString("es-HN")}`}
              icon={<Banknote />}
              meta="Periodo 2025/2026"
              metaTone="ok"
            />
          </div>

          {/* Fila de Gráficos Consolidados */}
          <div className={admin.grid2}>
            {/* Gráfico 1: Atenciones Anuales */}
            <section className={admin.panel}>
              <div className={admin.panelHeader}>
                <div>
                  <h2 className={admin.panelTitle}>Crecimiento de Atenciones (Pacientes)</h2>
                  <p className={admin.panelSub}>Histórico Anual</p>
                </div>
              </div>
              <div className={admin.panelBody}>
                <div className={styles.chart}>
                  <div className={styles.barChartGrid}>
                    {stats?.atencionesAnuales?.map((anioData: any) => {
                      const maxPacientes = Math.max(...(stats?.atencionesAnuales?.map((d: any) => d.total_pacientes) || [1000]));
                      const heightPercent = maxPacientes > 0 ? (anioData.total_pacientes / maxPacientes) * 100 : 0;
                      return (
                        <div className={styles.barCol} key={anioData.anio}>
                          <div className={styles.barColTooltip}>{anioData.total_pacientes} Pacientes</div>
                          <div
                            className={`${styles.chartBarElement} ${styles.barTeal}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className={styles.barLabel}>{anioData.anio}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Gráfico 2: Distribución de Presupuesto */}
            <section className={admin.panel}>
              <div className={admin.panelHeader}>
                <div>
                  <h2 className={admin.panelTitle}>Distribución de Costos</h2>
                  <p className={admin.panelSub}>Presupuesto Invertido (HNL)</p>
                </div>
              </div>
              <div className={admin.panelBody}>
                <div className={styles.chart}>
                  <div className={styles.barChartGrid}>
                    {distribucionCostos.map((item) => (
                      <div className={styles.barCol} key={item.label}>
                        <div className={styles.barColTooltip}>{item.monto}</div>
                        <div
                          className={`${styles.chartBarElement} ${item.bar}`}
                          style={{ height: `${item.altura}%` }}
                        />
                        <span className={styles.barLabel}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ── VISTA DE REPORTES CON DROPDOWN SIN SIDEBAR ── */}
      {vistaGlobal === "reportes" && (
        <div className={admin.stack}>
          {/* Categorías Principales */}
          <div className={`${admin.tabs} no-print`} role="tablist" aria-label="Categorías de reportes">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={categoriaActiva === cat.id}
                className={admin.tab}
                onClick={() => cambiarCategoria(cat.id)}
              >
                {cat.icon}
                {cat.label}
                <span className={`${admin.badge} ${cat.categoryClass}`}>
                  {cat.categoryLabel}
                </span>
              </button>
            ))}
          </div>

          {/* Menú Desplegable (Dropdown) Integrado */}
          <div className={`${styles.picker} no-print`}>
            <button
              type="button"
              className={styles.pickerTrigger}
              onClick={toggleDropdown}
              aria-expanded={dropdownAbierto}
            >
              {reporteActual.icon}
              <span className={styles.pickerValue}>{reporteActual.label}</span>
              <ChevronDown
                aria-hidden="true"
                className={`${styles.pickerChevron} ${
                  dropdownAbierto ? styles.pickerChevronOpen : ""
                }`}
              />
            </button>

            {dropdownAbierto && (
              <div className={styles.pickerMenu}>
                {categoriaActual.reportes.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    className={`${styles.pickerItem} ${
                      reporteActivoId === rep.id ? styles.pickerItemActive : ""
                    }`}
                    aria-current={reporteActivoId === rep.id ? "true" : undefined}
                    onClick={() => cambiarReporte(rep.id)}
                  >
                    {rep.icon}
                    <span className={styles.pickerItemText}>
                      <span className={styles.pickerItemName}>{rep.label}</span>
                      <span className={styles.pickerItemDesc}>{rep.descripcion}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel de Visualización del Reporte Seleccionado */}
          <div>{reporteActual.component}</div>
        </div>
      )}
    </div>
  );
}
