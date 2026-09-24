"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Medal,
  Printer,
  RefreshCw,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import StatCard from "@/app/administracion/components/StatCard";
import UserAvatar from "@/app/administracion/components/UserAvatar";
import admin from "@/styles/pages/admin.module.css";
import styles from "@/styles/pages/reportes.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import PrintReportDocument from "./PrintReportDocument";

type Donante = {
  id: string;
  nombre: string;
  tipo: "Empresa" | "Persona Natural" | "ONG" | "Institución";
  ciudad: string;
  donaciones: number;
  total: number; // Valued in HNL (Garments count * 100 HNL)
  ultimaDonacion: string;
  esRecurrente: boolean;
  fechaObj: Date;
};

const tipoLabel: Record<string, string> = {
  Empresa: " Empresa",
  "Persona Natural": " Persona Natural",
  ONG: " ONG",
  Institución: " Institución",
};

// medalla de los tres primeros: trofeo para el primero, medalla para los otros dos
const rankIcons = [
  <Trophy key="1" aria-hidden="true" />,
  <Medal key="2" aria-hidden="true" />,
  <Medal key="3" aria-hidden="true" />,
];
const rankClasses = [styles.rankGold, styles.rankSilver, styles.rankBronze];

function formatHNL(value: number) {
  return `L. ${value.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`;
}

function getHeuristicTipo(name: string): "Empresa" | "Persona Natural" | "ONG" | "Institución" {
  const lowercase = name.toLowerCase();
  if (
    lowercase.includes("banco") ||
    lowercase.includes("fundacion") ||
    lowercase.includes("fundación") ||
    lowercase.includes("ong") ||
    lowercase.includes("cruz roja") ||
    lowercase.includes("asociación")
  ) {
    return "ONG";
  }
  if (
    lowercase.includes("grupo") ||
    lowercase.includes("empresa") ||
    lowercase.includes("corporación") ||
    lowercase.includes("s.a.") ||
    lowercase.includes("la colonia") ||
    lowercase.includes("ficohsa") ||
    lowercase.includes("atlántida")
  ) {
    return "Empresa";
  }
  if (
    lowercase.includes("iglesia") ||
    lowercase.includes("municipalidad") ||
    lowercase.includes("cámara") ||
    lowercase.includes("colegio")
  ) {
    return "Institución";
  }
  return "Persona Natural";
}

export default function TopDonantes() {
  const { role } = usePermissions();
  const userRole = role ? ROLE_LABELS[role] : "ADMINISTRADOR";
  const [anioFiltro, setAnioFiltro] = useState<string>("todos");
  const [rawDonaciones, setRawDonaciones] = useState<Array<{
    id: string;
    fecha_donacion: string | null;
    nombre_donante: string | null;
    cantidad_prendas: number | null;
    observaciones: string | null;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [anioFiltro]);

  useEffect(() => {
    async function fetchDonantes() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("donaciones_ropa")
          .select("id, fecha_donacion, nombre_donante, cantidad_prendas, observaciones");
        if (error) throw error;
        setRawDonaciones(data || []);
      } catch (err) {
        console.error("Error loading donantes report:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDonantes();
  }, []);

  // Extract years dynamically from raw donations
  const aniosDisponibles = Array.from(
    new Set(
      rawDonaciones
        .map((row) => {
          try {
            if (!row.fecha_donacion) return null;
            return new Date(row.fecha_donacion).getFullYear().toString();
          } catch {
            return null;
          }
        })
        .filter((y): y is string => Boolean(y) && y !== "NaN")
    )
  ).sort((a, b) => b.localeCompare(a));

  // Dynamic donor grouping & ranking based on selected year filter
  const donantes: Donante[] = rawDonaciones.length === 0 ? [] : (() => {
    const filteredRows = rawDonaciones.filter((row) => {
      if (anioFiltro === "todos") return true;
      try {
        if (!row.fecha_donacion) return false;
        return new Date(row.fecha_donacion).getFullYear().toString() === anioFiltro;
      } catch {
        return false;
      }
    });

    const donorGroups: Record<string, {
      nombre: string;
      dates: Date[];
      prendas: number;
      recordsCount: number;
    }> = {};

    filteredRows.forEach((row) => {
      const donorName = (row.nombre_donante || "Donante Anónimo").trim();
      const date = new Date(row.fecha_donacion || new Date());
      const qty = row.cantidad_prendas || 0;

      if (!donorGroups[donorName]) {
        donorGroups[donorName] = {
          nombre: donorName,
          dates: [],
          prendas: 0,
          recordsCount: 0,
        };
      }
      donorGroups[donorName].dates.push(date);
      donorGroups[donorName].prendas += qty;
      donorGroups[donorName].recordsCount += 1;
    });

    return Object.keys(donorGroups)
      .map((name) => {
        const group = donorGroups[name];
        const sortedDates = [...group.dates].sort((a, b) => b.getTime() - a.getTime());
        const latestDate = sortedDates[0] || new Date();
        const formattedLatestDate = latestDate.toLocaleDateString("es-HN", {
          month: "short",
          year: "numeric",
        });

        return {
          id: name,
          nombre: name,
          tipo: getHeuristicTipo(name),
          ciudad: "Tegucigalpa, Honduras",
          donaciones: group.recordsCount,
          total: group.prendas * 100,
          ultimaDonacion: formattedLatestDate,
          esRecurrente: group.recordsCount > 1,
          fechaObj: latestDate,
        };
      })
      .sort((a, b) => b.total - a.total);
  })();

  const donantesOrdenados = [...donantes];
  const topTres = donantesOrdenados.slice(0, 3);
  const totalAcumulado = donantes.reduce((sum, d) => sum + d.total, 0);
  const maxMonto = donantes[0]?.total || 1;

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
    document.title = "Reporte - Top Donantes por Año";

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();
    setTimeout(restoreTitle, 1000);
  };

  const totalPages = Math.ceil(donantesOrdenados.length / itemsPerPage);

  return (
    <div>
      {/* ── VISTA WEB (INTERACTIVA) ── */}
      <div className={`${styles.screenView} ${admin.stack}`}>
        {/* Encabezado */}
        <div className={admin.sectionHead}>
          <div>
            <h2 className={admin.sectionTitle}>Top Donantes por Año</h2>
            <p className={admin.sectionLead}>
              Muro de Honor — Benefactores que hacen posible nuestra misión de ayuda por periodo anual.
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
            <Printer aria-hidden="true" />
            Imprimir
          </button>
        </div>

        {/* Filtros por Año */}
        <div className={admin.panel}>
          <div className={admin.toolbar}>
            <div className={admin.filter}>
              <label className={admin.filterLabel} htmlFor="donantes-anio">
                Periodo Anual
              </label>
              <select
                id="donantes-anio"
                className="form-input form-input-sm"
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
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
              Muro de Honor y ranking acumulado de donantes por aportación en el periodo seleccionado.
            </p>
          </div>
        </div>

        {/* Estadísticas resumen */}
        {loading ? (
          <div className={admin.statGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${admin.skeleton} ${admin.skeletonStat}`} />
            ))}
          </div>
        ) : (
          <div className={`${admin.statGrid} tone-rotate`}>
            <StatCard label="Total donantes" value={donantes.length} icon={<Users />} />
            <StatCard
              label="Valor Recaudado (Est.)"
              value={formatHNL(totalAcumulado)}
              icon={<HandCoins />}
              valueTone="ok"
            />
            <StatCard
              label="Mayor donante"
              value={donantes[0]?.nombre.split(" ")[0] ?? "—"}
              icon={<Trophy />}
            />
            <StatCard
              label="Recurrentes"
              value={donantes.filter((d) => d.esRecurrente).length}
              icon={<RefreshCw />}
            />
          </div>
        )}

        {/* ── Podio ── */}
        {!loading && donantes.length > 0 && (
          <div className={styles.donantesPodio}>
            {/* Posición 2 — Izquierda */}
            {topTres[1] && (
              <div className={styles.podioItem}>
                <div className={`${styles.podioMedal} ${styles.medal2}`}>
                  <Medal aria-hidden="true" />
                  <span className={styles.podioRank}>2</span>
                </div>
                <p className={styles.podioName}>{topTres[1].nombre}</p>
                <p className={styles.podioAmount}>{formatHNL(topTres[1].total)}</p>
                <p className={styles.podioPlataforma}>{tipoLabel[topTres[1].tipo]}</p>
              </div>
            )}

            {/* Posición 1 — Centro (más alto) */}
            {topTres[0] && (
              <div className={`${styles.podioItem} ${styles.podioFirst}`}>
                <div className={`${styles.podioMedal} ${styles.medal1}`}>
                  <Trophy aria-hidden="true" />
                  <span className={styles.podioRank}>1</span>
                </div>
                <p className={styles.podioName}>{topTres[0].nombre}</p>
                <p className={styles.podioAmount}>{formatHNL(topTres[0].total)}</p>
                <p className={styles.podioPlataforma}>{tipoLabel[topTres[0].tipo]}</p>
                <span className={styles.podioBadge}>
                  <Star aria-hidden="true" />
                  Mayor Donante
                </span>
              </div>
            )}

            {/* Posición 3 — Derecha */}
            {topTres[2] && (
              <div className={styles.podioItem}>
                <div className={`${styles.podioMedal} ${styles.medal3}`}>
                  <Medal aria-hidden="true" />
                  <span className={styles.podioRank}>3</span>
                </div>
                <p className={styles.podioName}>{topTres[2].nombre}</p>
                <p className={styles.podioAmount}>{formatHNL(topTres[2].total)}</p>
                <p className={styles.podioPlataforma}>{tipoLabel[topTres[2].tipo]}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tabla completa de donantes ── */}
        <section className={admin.panel}>
          <div className={admin.panelHeader}>
            <div>
              <h2 className={admin.panelTitle}>Ranking Completo de Donantes</h2>
              <p className={admin.panelSub}>
                {anioFiltro === "todos" ? "Todos los años" : `Año ${anioFiltro}`}
              </p>
            </div>
          </div>
          <div className={admin.tableWrap}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Donante</th>
                  <th>Tipo</th>
                  <th>Ciudad</th>
                  <th className={admin.num}>Donaciones</th>
                  <th>Última Donación</th>
                  <th className={admin.num}>Prendas / Valoración (Est.)</th>
                  <th>Participación</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={admin.emptyCell}>
                      Cargando ranking de donantes...
                    </td>
                  </tr>
                ) : donantes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={admin.emptyCell}>
                      No hay datos de donantes para este periodo.
                    </td>
                  </tr>
                ) : (
                  donantesOrdenados
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((donante, relativeIdx) => {
                      const absoluteIdx = (currentPage - 1) * itemsPerPage + relativeIdx;
                      const porcentaje = Math.round((donante.total / maxMonto) * 100);
                      const isTop3 = absoluteIdx < 3;

                      return (
                        <tr key={donante.id}>
                          {/* Rank */}
                          <td>
                            <span
                              className={`${styles.rank} ${
                                isTop3 ? rankClasses[absoluteIdx] : styles.rankDefault
                              }`}
                            >
                              {isTop3 ? (
                                <>
                                  {rankIcons[absoluteIdx]}
                                  <span className="sr-only">{absoluteIdx + 1}</span>
                                </>
                              ) : (
                                absoluteIdx + 1
                              )}
                            </span>
                          </td>

                          {/* Donante info */}
                          <td>
                            <div className={admin.cellPerson}>
                              <UserAvatar nombres={donante.nombre} size={36} />
                              <div>
                                <span className={admin.cellMain}>{donante.nombre}</span>
                                {donante.esRecurrente && (
                                  <span className={styles.recurrent}>
                                    <RefreshCw aria-hidden="true" />
                                    Donante recurrente
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tipo */}
                          <td>
                            <span className={`${admin.badge} ${admin.badgeInfo}`}>
                              {tipoLabel[donante.tipo]}
                            </span>
                          </td>

                          {/* Ciudad */}
                          <td className={admin.muted}>{donante.ciudad}</td>

                          {/* Donaciones */}
                          <td className={`${admin.num} ${admin.cellMain}`}>{donante.donaciones}</td>

                          {/* Última donación */}
                          <td className={`${admin.muted} ${admin.nowrap}`}>{donante.ultimaDonacion}</td>

                          {/* Total */}
                          <td className={admin.num}>
                            <span className={admin.cellMain}>{donante.total / 100} prendas</span>
                            <span className={admin.cellSub}>({formatHNL(donante.total)} est.)</span>
                          </td>

                          {/* Progress */}
                          <td>
                            <div className={admin.meter}>
                              <div className={admin.progress}>
                                <div
                                  className={`${admin.progressFill} ${absoluteIdx === 0 ? admin.progressWarn : ""}`}
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                              <span className={admin.meterPct}>{porcentaje}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}

                {/* Totales */}
                {!loading && donantes.length > 0 && (
                  <tr className={styles.totalRow}>
                    <td colSpan={6}>TOTAL ACUMULADO VALORADO</td>
                    <td className={`${admin.num} ${styles.cellOk}`}>{formatHNL(totalAcumulado)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className={`${admin.panelFooter} no-print`}>
              <span className={admin.pagerInfo}>
                Página {currentPage} de {totalPages}
              </span>
              <div className={admin.row}>
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

        {/* Nota al pie */}
        <p className={styles.footNote}>
          Donaciones en especie valoradas a una estimación de mercado (L. 100 por prenda). Información de carácter social administrativo.
        </p>
      </div>
      {/* ── FIN VISTA WEB ── */}

      {/* ── VISTA DE IMPRESIÓN REUTILIZABLE INSTITUCIONAL ── */}
      <div className={styles.printView}>
        <PrintReportDocument
          title="Top Donantes por Año — Muro de Honor"
          userRole={userRole}
          metaItems={[
            { label: "Periodo Anual", value: anioFiltro === "todos" ? "Todos los Años" : `Año ${anioFiltro}` },
            { label: "Total Donantes", value: donantes.length },
          ]}
          summaryCards={[
            { label: "Total Donantes", value: donantes.length },
            { label: "Valor Recaudado (Est.)", value: formatHNL(totalAcumulado) },
            { label: "Mayor Donante", value: donantes[0]?.nombre.split(" ")[0] ?? "—" },
            { label: "Donantes Recurrentes", value: donantes.filter((d) => d.esRecurrente).length },
          ]}
          footerNote="Muro de Honor y Reconocimiento Institucional — Fundación Dibujando Sonrisas"
        >
          {/* 1. Podio de Donantes en Impresión (Top 3) */}
          {!loading && donantes.length > 0 && (
            <div className={styles.printPodium}>
              <h3 className={styles.printPodiumTitle}>Podio de Benefactores Destacados</h3>

              <div className={styles.printPodiumRow}>
                {/* Posición 2 — Plata */}
                {topTres[1] && (
                  <div className={styles.printPodiumItem}>
                    <div className={`${styles.printMedal} ${styles.printMedal2}`}>2</div>
                    <p className={styles.printPodiumName}>{topTres[1].nombre}</p>
                    <p className={`${styles.printPodiumAmount} ${styles.printAmount2}`}>
                      {formatHNL(topTres[1].total)}
                    </p>
                    <span className={styles.printPodiumType}>{tipoLabel[topTres[1].tipo]}</span>
                  </div>
                )}

                {/* Posición 1 — Oro (Centro, más destacado) */}
                {topTres[0] && (
                  <div className={`${styles.printPodiumItem} ${styles.printPodiumFirst}`}>
                    <div className={`${styles.printMedal} ${styles.printMedal1}`}>1</div>
                    <p className={styles.printPodiumName}>{topTres[0].nombre}</p>
                    <p className={`${styles.printPodiumAmount} ${styles.printAmount1}`}>
                      {formatHNL(topTres[0].total)}
                    </p>
                    <span className={styles.printTopBadge}>
                      <Star aria-hidden="true" />
                      Mayor Donante
                    </span>
                  </div>
                )}

                {/* Posición 3 — Bronce */}
                {topTres[2] && (
                  <div className={styles.printPodiumItem}>
                    <div className={`${styles.printMedal} ${styles.printMedal3}`}>3</div>
                    <p className={styles.printPodiumName}>{topTres[2].nombre}</p>
                    <p className={`${styles.printPodiumAmount} ${styles.printAmount3}`}>
                      {formatHNL(topTres[2].total)}
                    </p>
                    <span className={styles.printPodiumType}>{tipoLabel[topTres[2].tipo]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Tabla de Ranking Completo */}
          <h3 className={styles.printSectionTitle}>Ranking Completo de Donantes</h3>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th className={styles.w4}>#</th>
                <th className={styles.w26}>Nombre del Donante</th>
                <th className={styles.w14}>Tipo</th>
                <th className={styles.w16}>Ciudad</th>
                <th className={`${styles.w10} ${styles.printCenter}`}>Aportes</th>
                <th className={styles.w15}>Última Donación</th>
                <th className={`${styles.w15} ${styles.printRight}`}>Total Valoración</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.printCenter}>Cargando donantes...</td>
                </tr>
              ) : donantes.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.printCenter}>No hay donantes registrados.</td>
                </tr>
              ) : (
                donantes.map((d, idx) => (
                  <tr key={d.id}>
                    <td className={`${styles.printCenter} ${styles.printStrong}`}>{idx + 1}</td>
                    <td className={styles.printStrong}>
                      {d.nombre}
                      {d.esRecurrente && (
                        <span className={styles.printRecurrent}>(Recurrente)</span>
                      )}
                    </td>
                    <td>{d.tipo}</td>
                    <td>{d.ciudad}</td>
                    <td className={styles.printCenter}>{d.donaciones}</td>
                    <td>{d.ultimaDonacion}</td>
                    <td className={`${styles.printRight} ${styles.printStrong}`}>{formatHNL(d.total)}</td>
                  </tr>
                ))
              )}
              {!loading && donantes.length > 0 && (
                <tr className={styles.printTotalRow}>
                  <td colSpan={6}>TOTAL ACUMULADO VALORADO</td>
                  <td className={styles.printRight}>{formatHNL(totalAcumulado)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </PrintReportDocument>
      </div>
    </div>
  );
}
