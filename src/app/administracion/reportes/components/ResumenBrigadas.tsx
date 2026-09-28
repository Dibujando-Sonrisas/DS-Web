"use client";

import { useState, useEffect } from "react";
import { Activity, ChartColumn, MapPin, Printer, Tent, Users } from "lucide-react";
import EmptyState from "@/app/administracion/components/EmptyState";
import StatCard from "@/app/administracion/components/StatCard";
import admin from "@/styles/pages/admin.module.css";
import styles from "@/styles/pages/reportes.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import PrintReportDocument from "./PrintReportDocument";

export interface BrigadaAnualData {
  anio: number;
  total_brigadas: number;
  comunidades_atendidas: number;
  total_pacientes: number;
  promedio_pacientes_por_brigada: number;
}

export default function ResumenBrigadas() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";
  const [anio, setAnio] = useState<string>("todos");
  const [brigadasAnuales, setBrigadasAnuales] = useState<BrigadaAnualData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchBrigadasSummary() {
      setLoading(true);
      try {
        // 1. Consultar directamente la View optimizada v_resumen_brigadas_anual
        const { data: viewData, error: viewError } = await supabase
          .from("v_resumen_brigadas_anual")
          .select("*")
          .order("anio", { ascending: false });

        if (!viewError && viewData) {
          const formatted: BrigadaAnualData[] = viewData.map((row: any) => ({
            anio: Number(row.anio || 0),
            total_brigadas: Number(row.total_brigadas || 0),
            comunidades_atendidas: Number(row.comunidades_atendidas || 0),
            total_pacientes: Number(row.total_pacientes || 0),
            promedio_pacientes_por_brigada: Number(row.promedio_pacientes_por_brigada || 0),
          }));
          setBrigadasAnuales(formatted);
          return;
        }

        // Fallback optimizado por si la View aún no ha sido aplicada en la base de datos
        console.warn("View v_resumen_brigadas_anual no disponible, ejecutando fallback:", viewError?.message);

        const [
          { data: brigadasData },
          { data: patientsData },
        ] = await Promise.all([
          supabase.from("brigadas").select("id, fecha_brigada, lugar, municipio"),
          supabase.from("pacientes").select("id, brigada_id"),
        ]);

        const map: Record<number, { brigadas: Set<string>; comunidades: Set<string>; pacientesCount: number }> = {};

        (brigadasData || []).forEach((b: any) => {
          if (!b.fecha_brigada) return;
          const yr = new Date(b.fecha_brigada).getFullYear();
          if (!map[yr]) {
            map[yr] = { brigadas: new Set(), comunidades: new Set(), pacientesCount: 0 };
          }
          map[yr].brigadas.add(b.id);
          const com = (b.municipio || b.lugar || "").trim();
          if (com) map[yr].comunidades.add(com);
        });

        const brigadaYearMap: Record<string, number> = {};
        (brigadasData || []).forEach((b: any) => {
          if (b.fecha_brigada) {
            brigadaYearMap[b.id] = new Date(b.fecha_brigada).getFullYear();
          }
        });

        (patientsData || []).forEach((p: any) => {
          const yr = brigadaYearMap[p.brigada_id];
          if (yr && map[yr]) {
            map[yr].pacientesCount += 1;
          }
        });

        const list: BrigadaAnualData[] = Object.keys(map).map((yrStr) => {
          const yr = Number(yrStr);
          const tBrig = map[yr].brigadas.size;
          const tPac = map[yr].pacientesCount;
          return {
            anio: yr,
            total_brigadas: tBrig,
            comunidades_atendidas: map[yr].comunidades.size,
            total_pacientes: tPac,
            promedio_pacientes_por_brigada: tBrig > 0 ? Number((tPac / tBrig).toFixed(1)) : 0,
          };
        }).sort((a, b) => b.anio - a.anio);

        setBrigadasAnuales(list);
      } catch (err) {
        console.error("Error loading brigadas report:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBrigadasSummary();
  }, []);

  // Extraer años dinámicos disponibles
  const aniosDisponibles = Array.from(
    new Set(brigadasAnuales.map((b) => b.anio.toString()).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Filtrar datos según el año seleccionado
  const datosFiltrados = brigadasAnuales.filter((b) => {
    if (anio === "todos") return true;
    return b.anio.toString() === anio;
  });

  // Totales acumulados
  const totalBrigadas = datosFiltrados.reduce((acc, b) => acc + b.total_brigadas, 0);
  const comunidadesAtendidas = datosFiltrados.reduce((acc, b) => acc + b.comunidades_atendidas, 0);
  const totalPacientes = datosFiltrados.reduce((acc, b) => acc + b.total_pacientes, 0);
  const promedioPacientes = totalBrigadas > 0 ? (totalPacientes / totalBrigadas).toFixed(1) : "0";

  const displayPeriodo = anio === "todos" ? "Todos los años" : `Año ${anio}`;

  // Elementos de la gráfica (Brigadas realizadas, Comunidades atendidas, Pacientes registrados)
  const chartItems = [
    {
      id: "brigadas",
      label: "Brigadas Realizadas",
      nombreCorto: "Brigadas",
      valor: totalBrigadas,
      bar: styles.barTeal,
    },
    {
      id: "comunidades",
      label: "Comunidades Atendidas",
      nombreCorto: "Comunidades",
      valor: comunidadesAtendidas,
      bar: styles.barYellow,
    },
    {
      id: "pacientes",
      label: "Pacientes Registrados",
      nombreCorto: "Pacientes",
      valor: totalPacientes,
      bar: styles.barRed,
    },
  ];

  const maxValorChart = Math.max(...chartItems.map((c) => c.valor), 1);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Resumen de Brigadas Realizadas - ${displayPeriodo}`;

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
      {/* ── VISTA WEB (INTERACTIVA) ── */}
      <div className={`${styles.screenView} ${admin.stack}`}>
        {/* Encabezado */}
        <div className={admin.sectionHead}>
          <div>
            <h2 className={admin.sectionTitle}>Resumen de Brigadas Realizadas</h2>
            <p className={admin.sectionLead}>
              Informe sintetizado anual del impacto y cobertura de las brigadas ejecutadas.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
            <Printer aria-hidden="true" />
            Imprimir
          </button>
        </div>

        {/* Filtros */}
        <div className={admin.panel}>
          <div className={admin.toolbar}>
            <div className={admin.filter}>
              <label className={admin.filterLabel} htmlFor="brigadas-anio">
                Periodo Anual
              </label>
              <select
                id="brigadas-anio"
                className="form-input form-input-sm"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
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
              Resumen consolidado anual del impacto de brigadas.
            </p>
          </div>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className={admin.statGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${admin.skeleton} ${admin.skeletonStat}`} />
            ))}
          </div>
        ) : (
          <div className={`${admin.statGrid} tone-rotate`}>
            <StatCard
              label="Brigadas Realizadas"
              value={totalBrigadas.toLocaleString()}
              icon={<Tent />}
              meta="Eventos de atención completados"
            />
            <StatCard
              label="Comunidades Atendidas"
              value={comunidadesAtendidas.toLocaleString()}
              icon={<MapPin />}
              meta="Sectores y municipios cubiertos"
            />
            <StatCard
              label="Total Pacientes Registrados"
              value={totalPacientes.toLocaleString()}
              icon={<Users />}
              meta="Beneficiarios atendidos"
              metaTone="ok"
            />
            <StatCard
              label="Promedio Pacientes / Brigada"
              value={promedioPacientes}
              icon={<Activity />}
              meta="Pacientes promedio por evento"
            />
          </div>
        )}

        {/* Gráfico y Tabla Resumen Ejecutivo */}
        <section className={admin.panel}>
          <div className={admin.panelHeader}>
            <h2 className={admin.panelTitle}>
              Impacto de Brigadas Realizadas ({displayPeriodo})
            </h2>
          </div>

          {/* Gráfico de Barras Interactivo */}
          <div className={admin.panelBody}>
            {loading ? (
              <div className={`${admin.skeleton} ${admin.skeletonBlock}`} />
            ) : totalBrigadas === 0 ? (
              <EmptyState
                icon={<ChartColumn />}
                title="No hay brigadas registradas para este periodo."
              />
            ) : (
              <div className={styles.chart}>
                <div className={styles.barChartGrid}>
                  {chartItems.map((item) => {
                    const alturaPorcentaje = Math.max(
                      (item.valor / maxValorChart) * 80,
                      8
                    );
                    return (
                      <div key={item.id} className={styles.barCol}>
                        <div className={styles.barColTooltip}>
                          {item.label}: {item.valor.toLocaleString()}
                        </div>
                        <div
                          className={`${styles.chartBarElement} ${item.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.barLabel}>{item.nombreCorto}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tabla Resumen Ejecutivo */}
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th>Métrica de Cobertura / Impacto</th>
                  <th className={admin.num}>Valor Consolidado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className={admin.emptyCell}>
                      Cargando resumen de brigadas...
                    </td>
                  </tr>
                ) : totalBrigadas === 0 ? (
                  <tr>
                    <td colSpan={2} className={admin.emptyCell}>
                      No se encontraron brigadas para este periodo.
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barTeal}`} aria-hidden="true" />
                        Cantidad Total de Brigadas Realizadas
                      </td>
                      <td className={`${admin.num} ${admin.cellMain}`}>
                        {totalBrigadas.toLocaleString()} brigadas
                      </td>
                    </tr>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barYellow}`} aria-hidden="true" />
                        Cantidad de Comunidades Atendidas
                      </td>
                      <td className={`${admin.num} ${admin.cellMain}`}>
                        {comunidadesAtendidas.toLocaleString()} comunidades
                      </td>
                    </tr>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barRed}`} aria-hidden="true" />
                        Cantidad Total de Pacientes Registrados
                      </td>
                      <td className={`${admin.num} ${admin.cellMain}`}>
                        {totalPacientes.toLocaleString()} pacientes
                      </td>
                    </tr>
                    <tr>
                      <td className={admin.cellMain}>
                        <span className={`${styles.dot} ${styles.barGray}`} aria-hidden="true" />
                        Promedio de Pacientes por Brigada
                      </td>
                      <td className={`${admin.num} ${admin.cellMain}`}>
                        {promedioPacientes} pacientes/brigada
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── VISTA DE IMPRESIÓN REUTILIZABLE INSTITUCIONAL ── */}
      <div className={styles.printView}>
        <PrintReportDocument
          title="Resumen de Brigadas Realizadas"
          userRole={userRole}
          metaItems={[
            { label: "Periodo Anual", value: displayPeriodo },
            { label: "Frecuencia", value: "Anual / Consolidado" },
          ]}
          summaryCards={[
            { label: "Brigadas Realizadas", value: totalBrigadas.toLocaleString() },
            { label: "Comunidades Atendidas", value: comunidadesAtendidas.toLocaleString() },
            { label: "Pacientes Registrados", value: totalPacientes.toLocaleString() },
            { label: "Promedio Pacientes/Brigada", value: promedioPacientes },
          ]}
          footerNote="Reporte de impacto y cobertura — Fundación Dibujando Sonrisas"
        >
          {/* Gráfico de Barras en Impresión */}
          <div className={styles.printGraph}>
            <h3 className={styles.printGraphTitle}>Impacto de Brigadas Realizadas</h3>

            <div className={styles.printGraphArea}>
              {loading ? (
                <div className={styles.printGraphEmpty}>Cargando gráfico...</div>
              ) : totalBrigadas === 0 ? (
                <div className={styles.printGraphEmpty}>
                  No hay brigadas registradas para este periodo.
                </div>
              ) : (
                <div className={`${styles.barChartGrid} ${styles.printBars}`}>
                  {chartItems.map((item) => {
                    const alturaPorcentaje = Math.max(
                      (item.valor / maxValorChart) * 75,
                      10
                    );
                    return (
                      <div key={item.id} className={styles.barCol}>
                        <span className={styles.printBarValue}>{item.valor.toLocaleString()}</span>
                        <div
                          className={`${styles.printBar} ${item.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.printBarLabel}>{item.nombreCorto}</span>
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
                <th className={styles.w62}>Métrica de Cobertura / Impacto</th>
                <th className={`${styles.w30} ${styles.printRight}`}>Valor Consolidado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className={styles.printCenter}>
                    Cargando resumen de brigadas...
                  </td>
                </tr>
              ) : totalBrigadas === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.printCenter}>
                    No hay brigadas registradas para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className={styles.printCenter}>1</td>
                    <td className={styles.printStrong}>Cantidad Total de Brigadas Realizadas</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {totalBrigadas.toLocaleString()} brigadas
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.printCenter}>2</td>
                    <td className={styles.printStrong}>Cantidad de Comunidades Atendidas</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {comunidadesAtendidas.toLocaleString()} comunidades
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.printCenter}>3</td>
                    <td className={styles.printStrong}>Cantidad Total de Pacientes Registrados</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {totalPacientes.toLocaleString()} pacientes
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.printCenter}>4</td>
                    <td className={styles.printStrong}>Promedio de Pacientes por Brigada</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>
                      {promedioPacientes} pacientes/brigada
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </PrintReportDocument>
      </div>
    </div>
  );
}
