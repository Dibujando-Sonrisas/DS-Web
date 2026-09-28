"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import rep from "@/styles/pages/reportes.module.css";
import listas from "@/styles/pages/admin-reportes-listas.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import PrintReportDocument from "./PrintReportDocument";

export interface StockMinimoData {
  id: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  ubicacion: string;
}

export default function StockMinimo() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [rawStock, setRawStock] = useState<StockMinimoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [categoriaFiltro, estadoFiltro]);

  useEffect(() => {
    async function fetchStockMinimo() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("stock_actual")
          .select(`
            medicamento_id,
            nombre,
            descripcion,
            unidad_medida,
            stock_minimo,
            stock_total,
            estado_stock,
            tipo_recurso
          `);
        if (error) throw error;

        let formatted: StockMinimoData[] = (data || []).map((m: any) => {
          return {
            id: m.medicamento_id?.slice(0, 8).toUpperCase(),
            nombre: m.nombre,
            categoria: m.tipo_recurso === "insumo_medico" ? "Insumos Médicos" : (m.tipo_recurso === "material_brigada" ? "Material Brigada" : "Medicamentos"),
            stockActual: m.stock_total || 0,
            stockMinimo: m.stock_minimo || 0,
            unidad: m.unidad_medida || "uds",
            ubicacion: "Farmacia Central",
          };
        });
        setRawStock(formatted);
      } catch (err) {
        console.error("Error fetching stock data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStockMinimo();
  }, []);

  const categoriasDisponibles = Array.from(
    new Set(rawStock.map((item) => item.categoria))
  ).filter(Boolean);

  const procesarDatos = () => {
    return rawStock
      .map((item) => {
        const porcentaje = item.stockMinimo > 0
          ? Math.round((item.stockActual / item.stockMinimo) * 100)
          : 100;
        let estado: "critico" | "advertencia" | "optimo" = "optimo";
        let estadoLabel = "Óptimo";
        let statusClass = styles.badgeSuccess;

        if (item.stockActual < item.stockMinimo) {
          estado = "critico";
          estadoLabel = "Crítico (Bajo Mínimo)";
          statusClass = styles.badgeDanger;
        } else if (item.stockActual <= item.stockMinimo * 1.3) {
          estado = "advertencia";
          estadoLabel = "Advertencia (Stock Límite)";
          statusClass = styles.badgeWarning;
        }

        return {
          ...item,
          porcentaje,
          estado,
          estadoLabel,
          statusClass,
        };
      })
      .filter((item) => {
        if (categoriaFiltro !== "todas" && item.categoria !== categoriaFiltro)
          return false;
        if (estadoFiltro !== "todos" && item.estado !== estadoFiltro)
          return false;
        return true;
      })
      .sort((a, b) => a.stockActual - b.stockActual);
  };

  const inventarioFiltrado = procesarDatos();
  const totalPages = Math.ceil(inventarioFiltrado.length / itemsPerPage);

  const [fechaActualCompleta, setFechaActualCompleta] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFechaActualCompleta(
      new Date().toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Reporte de Stock Mínimo";

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
      <div className={`${rep.screenView} ${styles.stack} no-print`}>
        {/* Encabezado */}
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Alerta de Stock Mínimo de Insumos</h2>
            <p className={styles.sectionLead}>
              Muestra los materiales e insumos odontológicos, de farmacia e
              higiene que requieren reabastecimiento urgente.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
            <Printer aria-hidden="true" />
            Imprimir
          </button>
        </div>

        <section className={styles.panel}>
          {/* Filtros */}
          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="cat-filtro">Categoría</label>
              <select
                id="cat-filtro"
                className="form-input form-input-sm"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="todas">Todas las categorías</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="estado-filtro">Estado del Stock</label>
              <select
                id="estado-filtro"
                className="form-input form-input-sm"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                <option value="todos">Todos los niveles</option>
                <option value="critico"> Crítico (Bajo Mínimo)</option>
                <option value="advertencia">
                   Advertencia (Cerca del Límite)
                </option>
                <option value="optimo"> Óptimo (Correcto)</option>
              </select>
            </div>

            <p className={styles.toolbarNote}>
              Umbral de alerta: <strong>&lt; 100% de Stock Mínimo</strong>
            </p>
          </div>

          {/* Tabla Web */}
          {loading ? (
            <div className={styles.panelBody}>
              <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
                <span className="sr-only">Cargando información del inventario...</span>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código / SKU</th>
                    <th>Nombre del Insumo</th>
                    <th>Categoría</th>
                    <th className={styles.num}>Stock Mínimo</th>
                    <th className={styles.num}>Stock Actual</th>
                    <th>Unidad</th>
                    <th>Ubicación</th>
                    <th>Nivel de Cobertura</th>
                    <th>Estado de Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={styles.emptyCell}>
                        No hay insumos que requieran reabastecimiento con los
                        filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    inventarioFiltrado
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((item, index) => {
                        const nivelAncho = Math.min(item.porcentaje, 100);
                        const barraClass =
                          item.estado === "critico"
                            ? styles.progressBad
                            : item.estado === "advertencia"
                              ? styles.progressWarn
                              : "";

                        return (
                          <tr key={`${item.id}-${index}`}>
                            <td className={styles.cellCode}>{item.id}</td>
                            <td className={styles.cellMain}>{item.nombre}</td>
                            <td>{item.categoria}</td>
                            <td className={styles.num}>{item.stockMinimo}</td>
                            <td
                              className={`${styles.num} ${
                                item.stockActual < item.stockMinimo ? listas.cellBad : styles.cellMain
                              }`}
                            >
                              {item.stockActual}
                            </td>
                            <td>{item.unidad}</td>
                            <td>{item.ubicacion}</td>
                            {/* Barra de progreso visual */}
                            <td>
                              <div className={styles.meter}>
                                <div className={styles.progress}>
                                  <div
                                    className={`${styles.progressFill} ${barraClass}`}
                                    style={{ width: `${nivelAncho}%` }}
                                  />
                                </div>
                                <span className={styles.meterPct}>{item.porcentaje}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${item.statusClass}`}>
                                {item.estadoLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {inventarioFiltrado.length > 0 && (
            <div className={styles.panelFooter}>
              <span className={styles.pagerInfo}>
                Página {currentPage} de {totalPages}
              </span>
              <div className={styles.row}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Siguiente
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── VISTA DE IMPRESIÓN REUTILIZABLE INSTITUCIONAL ── */}
      <div className={rep.printView}>
        <PrintReportDocument
          title="Reporte de Alerta de Stock Mínimo"
          userRole={userRole}
          metaItems={[
            { label: "Categoría", value: categoriaFiltro === "todas" ? "Todas" : categoriaFiltro },
            { label: "Estado Alerta", value: estadoFiltro === "todos" ? "Todos los Estados" : estadoFiltro.toUpperCase() },
            { label: "Total Insumos", value: inventarioFiltrado.length },
          ]}
          footerNote="Gestión de Inventario e Insumos — Fundación Dibujando Sonrisas"
        >
          <table className={rep.printTable}>
            <thead>
              <tr>
                <th className={rep.w4}>#</th>
                <th className={rep.w28}>Nombre del Insumo / Material</th>
                <th className={rep.w18}>Categoría</th>
                <th className={`${rep.w14} ${rep.printRight}`}>Stock Actual</th>
                <th className={`${rep.w14} ${rep.printRight}`}>Stock Mínimo</th>
                <th className={rep.w12}>Estado Alerta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={rep.printCenter}>Cargando datos de inventario...</td>
                </tr>
              ) : inventarioFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={6} className={rep.printCenter}>No se encontraron insumos por debajo del umbral mínimo.</td>
                </tr>
              ) : (
                inventarioFiltrado.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`}>
                    <td className={rep.printCenter}>{idx + 1}</td>
                    <td className={rep.printStrong}>{item.nombre}</td>
                    <td>{item.categoria}</td>
                    <td className={`${rep.printRight} ${rep.printStrong}`}>
                      {item.stockActual} {item.unidad}
                    </td>
                    <td className={rep.printRight}>{item.stockMinimo} {item.unidad}</td>
                    <td>{item.estadoLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </PrintReportDocument>
      </div>
    </div>
  );
}
