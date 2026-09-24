"use client";

import { useState, useEffect } from "react";
import { Boxes, ChartColumn, Gift, Pill, Printer, Shirt } from "lucide-react";
import EmptyState from "@/app/administracion/components/EmptyState";
import StatCard from "@/app/administracion/components/StatCard";
import admin from "@/styles/pages/admin.module.css";
import styles from "@/styles/pages/reportes.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import PrintReportDocument from "./PrintReportDocument";

export interface BrigadeReportData {
  brigada_id: string;
  brigada_nombre: string;
  fecha: string;
  comunidad: string;
  total_medicamentos: number;
  total_ropa: number;
  total_juguetes: number;
  total_general: number;
}

export default function ResumenInsumos() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";

  const [brigadasData, setBrigadasData] = useState<BrigadeReportData[]>([]);
  const [selectedBrigadaId, setSelectedBrigadaId] = useState<string>("todas");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchReporteData() {
      setLoading(true);
      try {
        // 1. Consultar la View optimizada v_reporte_insumos_brigada
        const { data: viewData, error: viewError } = await supabase
          .from("v_reporte_insumos_brigada")
          .select("*")
          .order("fecha", { ascending: false });

        if (!viewError && viewData) {
          const formatted: BrigadeReportData[] = viewData.map((row: any) => ({
            brigada_id: row.brigada_id || "",
            brigada_nombre: row.brigada_nombre || "Sin Nombre",
            fecha: row.fecha || "",
            comunidad: row.comunidad || "N/A",
            total_medicamentos: Number(row.total_medicamentos || 0),
            total_ropa: Number(row.total_ropa || 0),
            total_juguetes: Number(row.total_juguetes || 0),
            total_general: Number(row.total_general || 0),
          }));
          setBrigadasData(formatted);
          if (formatted.length > 0) {
            setSelectedBrigadaId(formatted[0].brigada_id);
          }
          return;
        }

        // Fallback optimizado por si la View aún no ha sido aplicada en la base de datos
        console.warn("View v_reporte_insumos_brigada no disponible, ejecutando fallback:", viewError?.message);

        const [
          { data: brigadas },
          { data: farmaciaData },
          { data: ropaData },
          { data: juguetesData },
        ] = await Promise.all([
          supabase.from("brigadas").select("id, nombre, fecha_brigada, lugar").order("fecha_brigada", { ascending: false }),
          supabase.from("entregas_farmacia").select("cantidad, consultas!inner(brigada_id)"),
          supabase.from("entregas_ropa").select("cantidad_prendas, brigada_id"),
          supabase.from("actividades_infantiles").select("cantidad_regalos, brigada_id"),
        ]);

        const medMap: Record<string, number> = {};
        (farmaciaData || []).forEach((f: any) => {
          const bId = f.consultas?.brigada_id;
          if (bId) {
            medMap[bId] = (medMap[bId] || 0) + Number(f.cantidad || 0);
          }
        });

        const ropaMap: Record<string, number> = {};
        (ropaData || []).forEach((r: any) => {
          if (r.brigada_id) {
            ropaMap[r.brigada_id] = (ropaMap[r.brigada_id] || 0) + Number(r.cantidad_prendas || 0);
          }
        });

        const jugMap: Record<string, number> = {};
        (juguetesData || []).forEach((j: any) => {
          if (j.brigada_id) {
            jugMap[j.brigada_id] = (jugMap[j.brigada_id] || 0) + Number(j.cantidad_regalos || 0);
          }
        });

        const list: BrigadeReportData[] = (brigadas || []).map((b: any) => {
          const tMed = medMap[b.id] || 0;
          const tRopa = ropaMap[b.id] || 0;
          const tJug = jugMap[b.id] || 0;
          return {
            brigada_id: b.id,
            brigada_nombre: b.nombre,
            fecha: b.fecha_brigada,
            comunidad: b.lugar || "N/A",
            total_medicamentos: tMed,
            total_ropa: tRopa,
            total_juguetes: tJug,
            total_general: tMed + tRopa + tJug,
          };
        });

        setBrigadasData(list);
        if (list.length > 0) {
          setSelectedBrigadaId(list[0].brigada_id);
        }
      } catch (err) {
        console.error("Error al cargar datos del reporte de insumos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReporteData();
  }, []);

  // Determinar los datos a mostrar según el filtro de brigada
  const selectedBrigada = brigadasData.find((b) => b.brigada_id === selectedBrigadaId);

  const displayNombre = selectedBrigadaId === "todas"
    ? "Todas las Brigadas"
    : selectedBrigada?.brigada_nombre || "Seleccionar Brigada";

  const displayFecha = selectedBrigadaId === "todas"
    ? "Consolidado General"
    : selectedBrigada?.fecha
      ? new Date(selectedBrigada.fecha).toLocaleDateString("es-HN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "Fecha no registrada";

  const displayComunidad = selectedBrigadaId === "todas"
    ? "Varias Comunidades"
    : selectedBrigada?.comunidad || "No especificada";

  let totalMedicamentos = 0;
  let totalRopa = 0;
  let totalJuguetes = 0;

  if (selectedBrigadaId === "todas") {
    totalMedicamentos = brigadasData.reduce((acc, b) => acc + b.total_medicamentos, 0);
    totalRopa = brigadasData.reduce((acc, b) => acc + b.total_ropa, 0);
    totalJuguetes = brigadasData.reduce((acc, b) => acc + b.total_juguetes, 0);
  } else if (selectedBrigada) {
    totalMedicamentos = selectedBrigada.total_medicamentos;
    totalRopa = selectedBrigada.total_ropa;
    totalJuguetes = selectedBrigada.total_juguetes;
  }

  const totalGeneral = totalMedicamentos + totalRopa + totalJuguetes;

  // Categorías sintetizadas para la tabla y gráfico
  const categorias = [
    {
      id: "med",
      nombre: "Medicamentos Entregados",
      nombreCorto: "Medicamentos",
      cantidad: totalMedicamentos,
      bar: styles.barTeal,
    },
    {
      id: "ropa",
      nombre: "Prendas de Ropa Entregadas",
      nombreCorto: "Ropa",
      cantidad: totalRopa,
      bar: styles.barYellow,
    },
    {
      id: "jug",
      nombre: "Juguetes Entregados",
      nombreCorto: "Juguetes",
      cantidad: totalJuguetes,
      bar: styles.barRed,
    },
  ];

  const maxCantidad = Math.max(...categorias.map((c) => c.cantidad), 1);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Reporte de Entrega de Insumos - ${displayNombre}`;

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
            <h2 className={admin.sectionTitle}>Resumen de Entrega de Insumos</h2>
            <p className={admin.sectionLead}>
              Consolidado sintetizado de insumos entregados durante la brigada seleccionada.
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
            <div className={`${admin.filter} ${admin.filterWide}`}>
              <label className={admin.filterLabel} htmlFor="insumos-brigada">
                Filtrar por Brigada
              </label>
              <select
                id="insumos-brigada"
                className="form-input form-input-sm"
                value={selectedBrigadaId}
                onChange={(e) => setSelectedBrigadaId(e.target.value)}
                disabled={loading}
              >
                <option value="todas">Todas las brigadas</option>
                {brigadasData.map((b) => (
                  <option key={b.brigada_id} value={b.brigada_id}>
                    {b.brigada_nombre} {b.fecha ? `(${new Date(b.fecha).toLocaleDateString("es-HN")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${admin.toolbarNote} ${styles.toolbarMeta}`}>
              <span><strong>Brigada:</strong> {displayNombre}</span>
              <span><strong>Fecha:</strong> {displayFecha}</span>
              <span><strong>Comunidad:</strong> {displayComunidad}</span>
            </div>
          </div>
        </div>

        {/* KPIs de Insumos por Brigada */}
        {loading ? (
          <div className={admin.statGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${admin.skeleton} ${admin.skeletonStat}`} />
            ))}
          </div>
        ) : (
          <div className={`${admin.statGrid} tone-rotate`}>
            <StatCard
              label="Total Insumos Entregados"
              value={totalGeneral.toLocaleString()}
              icon={<Boxes />}
              meta="Total general en la brigada"
            />
            <StatCard
              label="Medicamentos Entregados"
              value={totalMedicamentos.toLocaleString()}
              icon={<Pill />}
              meta="Dosis y recetas de farmacia"
            />
            <StatCard
              label="Prendas de Ropa Entregadas"
              value={totalRopa.toLocaleString()}
              icon={<Shirt />}
              meta="Piezas de vestir distribuidas"
            />
            <StatCard
              label="Juguetes Entregados"
              value={totalJuguetes.toLocaleString()}
              icon={<Gift />}
              meta="Regalos en actividades infantiles"
            />
          </div>
        )}

        {/* Gráfico y Tabla */}
        <section className={admin.panel}>
          <div className={admin.panelHeader}>
            <h2 className={admin.panelTitle}>
              Distribución de Insumos Entregados ({displayNombre})
            </h2>
          </div>

          {/* Gráfico de Barras Interactivo */}
          <div className={admin.panelBody}>
            {loading ? (
              <div className={`${admin.skeleton} ${admin.skeletonBlock}`} />
            ) : totalGeneral === 0 ? (
              <EmptyState
                icon={<ChartColumn />}
                title="No hay entregas registradas para esta brigada."
              />
            ) : (
              <div className={styles.chart}>
                <div className={styles.barChartGrid}>
                  {categorias.map((cat) => {
                    const alturaPorcentaje = Math.max(
                      (cat.cantidad / maxCantidad) * 80,
                      8
                    );
                    return (
                      <div key={cat.id} className={styles.barCol}>
                        <div className={styles.barColTooltip}>
                          {cat.cantidad.toLocaleString()} {cat.nombreCorto.toLowerCase()} entregados
                        </div>
                        <div
                          className={`${styles.chartBarElement} ${cat.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.barLabel}>{cat.nombreCorto}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tabla sintetizada por categoría */}
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th>Categoría de Insumo</th>
                  <th className={admin.num}>Total Entregado</th>
                  <th className={admin.num}>Porcentaje del Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className={admin.emptyCell}>
                      Cargando resumen de insumos...
                    </td>
                  </tr>
                ) : totalGeneral === 0 ? (
                  <tr>
                    <td colSpan={3} className={admin.emptyCell}>
                      No se encontraron entregas para esta brigada.
                    </td>
                  </tr>
                ) : (
                  categorias.map((cat) => {
                    const porcentaje = totalGeneral > 0
                      ? ((cat.cantidad / totalGeneral) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={cat.id}>
                        <td className={admin.cellMain}>
                          <span className={`${styles.dot} ${cat.bar}`} aria-hidden="true" />
                          {cat.nombre}
                        </td>
                        <td className={admin.num}>{cat.cantidad.toLocaleString()}</td>
                        <td className={admin.num}>{porcentaje}%</td>
                      </tr>
                    );
                  })
                )}
                {!loading && totalGeneral > 0 && (
                  <tr className={styles.totalRow}>
                    <td>TOTAL GENERAL DE INSUMOS ENTREGADOS</td>
                    <td className={admin.num}>{totalGeneral.toLocaleString()}</td>
                    <td className={admin.num}>100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {/* ── FIN VISTA WEB ── */}

      {/* ── VISTA DE IMPRESIÓN REUTILIZABLE INSTITUCIONAL ── */}
      <div className={styles.printView}>
        <PrintReportDocument
          title="Resumen de Entrega de Insumos por Brigada"
          userRole={userRole}
          metaItems={[
            { label: "Brigada", value: displayNombre },
            { label: "Fecha", value: displayFecha },
            { label: "Comunidad", value: displayComunidad },
          ]}
          summaryCards={[
            { label: "Total General Insumos", value: totalGeneral.toLocaleString() },
            { label: "Medicamentos Entregados", value: totalMedicamentos.toLocaleString() },
            { label: "Prendas de Ropa Entregadas", value: totalRopa.toLocaleString() },
            { label: "Juguetes Entregados", value: totalJuguetes.toLocaleString() },
          ]}
          footerNote="Consolidado de ayuda humanitaria e insumos — Fundación Dibujando Sonrisas"
        >
          {/* Gráfico de Barras en Impresión */}
          <div className={styles.printGraph}>
            <h3 className={styles.printGraphTitle}>Distribución de Insumos Entregados</h3>

            <div className={styles.printGraphArea}>
              {loading ? (
                <div className={styles.printGraphEmpty}>Cargando gráfico...</div>
              ) : totalGeneral === 0 ? (
                <div className={styles.printGraphEmpty}>
                  No hay entregas registradas para esta brigada.
                </div>
              ) : (
                <div className={`${styles.barChartGrid} ${styles.printBars}`}>
                  {categorias.map((cat) => {
                    const alturaPorcentaje = Math.max(
                      (cat.cantidad / maxCantidad) * 75,
                      10
                    );
                    return (
                      <div key={cat.id} className={styles.barCol}>
                        <span className={styles.printBarValue}>{cat.cantidad.toLocaleString()}</span>
                        <div
                          className={`${styles.printBar} ${cat.bar}`}
                          style={{ height: `${alturaPorcentaje}%` }}
                        />
                        <span className={styles.printBarLabel}>{cat.nombreCorto}</span>
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
                <th className={styles.w48}>Categoría de Insumo</th>
                <th className={`${styles.w24} ${styles.printRight}`}>Total Entregado</th>
                <th className={`${styles.w20} ${styles.printRight}`}>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.printCenter}>
                    Cargando insumos...
                  </td>
                </tr>
              ) : totalGeneral === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.printCenter}>
                    No hay entregas registradas para esta brigada.
                  </td>
                </tr>
              ) : (
                categorias.map((cat, idx) => {
                  const porcentaje = totalGeneral > 0
                    ? ((cat.cantidad / totalGeneral) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={cat.id}>
                      <td className={styles.printCenter}>{idx + 1}</td>
                      <td className={styles.printStrong}>{cat.nombre}</td>
                      <td className={`${styles.printRight} ${styles.printStrong}`}>
                        {cat.cantidad.toLocaleString()}
                      </td>
                      <td className={`${styles.printRight} ${styles.printStrong}`}>
                        {porcentaje}%
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && totalGeneral > 0 && (
                <tr className={styles.printTotalRow}>
                  <td colSpan={2}>TOTAL GENERAL DE INSUMOS ENTREGADOS</td>
                  <td className={styles.printRight}>{totalGeneral.toLocaleString()}</td>
                  <td className={styles.printRight}>100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </PrintReportDocument>
      </div>
    </div>
  );
}
