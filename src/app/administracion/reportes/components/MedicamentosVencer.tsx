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

export interface MedicamentoVenceData {
  id: string;
  nombre: string;
  lote: string;
  fechaVencimiento: string;
  stock: number;
  ubicacion: string;
  categoria: string;
}

export default function MedicamentosVencer() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";
  const [diasFiltro, setDiasFiltro] = useState<number>(90); // 30, 60, 90, 180
  const [filtroAlerta, setFiltroAlerta] = useState<string>("todos"); // todos, critico, advertencia, seguro
  const [rawMedicamentos, setRawMedicamentos] = useState<MedicamentoVenceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [diasFiltro, filtroAlerta]);

  useEffect(() => {
    async function fetchMedicamentosVencer() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("lotes_medicamentos")
          .select(`
            id,
            numero_lote,
            fecha_vencimiento,
            cantidad_actual,
            medicamentos (
              nombre,
              categorias_inventario (
                nombre
              )
            )
          `);
        if (error) throw error;

        let formatted: MedicamentoVenceData[] = (data || []).map((l: {
          id: string;
          numero_lote: string | null;
          fecha_vencimiento: string;
          cantidad_actual: number | null;
          medicamentos: {
            nombre: string;
            categorias_inventario: { nombre: string } | null;
          } | null;
        }) => {
          const med = l.medicamentos;
          const cat = med?.categorias_inventario?.nombre || "Sin Categoría";
          return {
            id: l.id.slice(0, 8).toUpperCase(),
            nombre: med?.nombre || "Medicamento Desconocido",
            lote: l.numero_lote || "N/A",
            fechaVencimiento: l.fecha_vencimiento,
            stock: l.cantidad_actual || 0,
            ubicacion: "Farmacia Central",
            categoria: cat,
          };
        });
        setRawMedicamentos(formatted);
      } catch (err) {
        console.error("Error fetching lotes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMedicamentosVencer();
  }, []);

  const hoy = new Date();

  const procesarDatos = () => {
    return rawMedicamentos
      .map((item) => {
        const fechaVence = new Date(item.fechaVencimiento);
        const diffTime = fechaVence.getTime() - hoy.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let estado: "critico" | "advertencia" | "seguro" = "seguro";
        let estadoLabel = "Seguro";
        let statusClass = styles.badgeSuccess;

        if (diasRestantes <= 30) {
          estado = "critico";
          estadoLabel = diasRestantes <= 0 ? "Vencido" : `Crítico (<30d)`;
          statusClass = styles.badgeDanger;
        } else if (diasRestantes <= 90) {
          estado = "advertencia";
          estadoLabel = "Advertencia (30-90d)";
          statusClass = styles.badgeWarning;
        } else {
          estadoLabel = "Seguro (>90d)";
        }

        return {
          ...item,
          diasRestantes,
          estado,
          estadoLabel,
          statusClass,
        };
      })
      .filter((item) => {
        // Filtrar por días de vencimiento
        if (item.diasRestantes > diasFiltro) return false;

        // Filtrar por nivel de alerta
        if (filtroAlerta !== "todos" && item.estado !== filtroAlerta)
          return false;

        return true;
      })
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  };

  const medicamentosFiltrados = procesarDatos();
  const totalPages = Math.ceil(medicamentosFiltrados.length / itemsPerPage);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Reporte de Vencimiento de Medicamentos";

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();
    setTimeout(restoreTitle, 1000);
  };

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

  // Prepare sorted data for print view (chronologically by expiration date ascending)
  const printData = [...medicamentosFiltrados].sort((a, b) => 
    a.fechaVencimiento.localeCompare(b.fechaVencimiento)
  );

  return (
    <div>
      {/* ── VISTA WEB (PAGINADA) ── */}
      <div className={`${rep.screenView} ${styles.stack} no-print`}>
        {/* Encabezado */}
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Reporte de Medicamentos Próximos a Vencer</h2>
            <p className={styles.sectionLead}>
              Supervisa las fechas de caducidad del inventario para su
              distribución prioritaria o descarte seguro.
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
              <label className={styles.filterLabel} htmlFor="dias-vence">Vence en menos de</label>
              <select
                id="dias-vence"
                className="form-input form-input-sm"
                value={diasFiltro}
                onChange={(e) => setDiasFiltro(Number(e.target.value))}
              >
                <option value={30}>30 días (Crítico)</option>
                <option value={60}>60 días</option>
                <option value={90}>90 días</option>
                <option value={180}>180 días (Semestre)</option>
              </select>
            </div>

            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="alerta-filtro">Alerta/Estado</label>
              <select
                id="alerta-filtro"
                className="form-input form-input-sm"
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="critico"> Crítico / Vencido</option>
                <option value="advertencia"> Advertencia</option>
                <option value="seguro"> Seguro</option>
              </select>
            </div>

            <p className={styles.toolbarNote}>
              Fecha de Control: <strong>{hoy.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
            </p>
          </div>

          {/* Tabla Web */}
          {loading ? (
            <div className={styles.panelBody}>
              <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
                <span className="sr-only">Cargando información de lotes...</span>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicamento / Suministro</th>
                    <th>Categoría</th>
                    <th>Lote</th>
                    <th>Fecha Vencimiento</th>
                    <th className={styles.num}>Días Restantes</th>
                    <th className={styles.num}>Stock Disponible</th>
                    <th>Estado de Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {medicamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyCell}>
                        No hay medicamentos que venzan en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    medicamentosFiltrados
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((m, relativeIdx) => {
                        const absoluteIdx = (currentPage - 1) * itemsPerPage + relativeIdx;
                        return (
                          <tr key={m.id}>
                            <td className={styles.muted}>{absoluteIdx + 1}</td>
                            <td className={styles.cellMain}>{m.nombre}</td>
                            <td>{m.categoria}</td>
                            <td className={styles.cellCode}>{m.lote}</td>
                            <td className={styles.nowrap}>
                              {new Date(m.fechaVencimiento).toLocaleDateString("es-HN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </td>
                            <td
                              className={`${styles.num} ${
                                m.diasRestantes <= 30 ? listas.cellBad : styles.cellMain
                              }`}
                            >
                              {m.diasRestantes <= 0
                                ? "Vencido"
                                : `${m.diasRestantes} días`}
                            </td>
                            <td className={`${styles.num} ${styles.cellMain}`}>{m.stock}</td>
                            <td>
                              <span className={`${styles.badge} ${m.statusClass}`}>
                                {m.estadoLabel}
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

          {medicamentosFiltrados.length > 0 && (
            <div className={styles.panelFooter}>
              <span className={styles.pagerInfo}>Página {currentPage} de {totalPages}</span>
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
          title="Reporte de Vencimiento de Medicamentos"
          userRole={userRole}
          metaItems={[
            { label: "Filtro Días", value: `Menos de ${diasFiltro} días` },
            { label: "Nivel Alerta", value: filtroAlerta === "todos" ? "Todos" : filtroAlerta.toUpperCase() },
            { label: "Total Registros", value: printData.length },
          ]}
          footerNote="Reporte de control interno — Fundación Dibujando Sonrisas"
        >
          <table className={rep.printTable}>
            <thead>
              <tr>
                <th className={rep.w4}>#</th>
                <th className={rep.w28}>Medicamento / Suministro</th>
                <th className={rep.w18}>Categoría</th>
                <th className={rep.w12}>Lote</th>
                <th className={rep.w14}>Fecha Vencimiento</th>
                <th className={rep.w12}>Días Restantes</th>
                <th className={rep.w12}>Stock Disponible</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={rep.printCenter}>
                    Cargando información de lotes...
                  </td>
                </tr>
              ) : printData.length === 0 ? (
                <tr>
                  <td colSpan={7} className={rep.printCenter}>
                    No hay medicamentos que venzan en el rango seleccionado.
                  </td>
                </tr>
              ) : (
                printData.map((m, idx) => (
                  <tr key={m.id}>
                    <td className={rep.printCenter}>{idx + 1}</td>
                    <td className={rep.printStrong}>{m.nombre}</td>
                    <td>{m.categoria}</td>
                    <td className={rep.printMono}>{m.lote}</td>
                    <td>
                      {new Date(m.fechaVencimiento).toLocaleDateString("es-HN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className={rep.printStrong}>
                      {m.diasRestantes <= 0 ? "Vencido" : `${m.diasRestantes} días`}
                    </td>
                    <td className={`${rep.printRight} ${rep.printStrong}`}>{m.stock}</td>
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
