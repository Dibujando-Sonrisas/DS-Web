"use client";

import { ChevronLeft, ChevronRight, Printer, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { errorInfo, getLogger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import styles from "@/styles/pages/admin.module.css";
import listas from "@/styles/pages/admin-reportes-listas.module.css";
import rep from "@/styles/pages/reportes.module.css";
import PrintReportDocument from "./PrintReportDocument";

const logger = getLogger("reportes", "client");

interface Brigada {
  id: string;
  nombre: string;
}

interface PacienteData {
  id: string;
  nombre: string;
  edad: number;
  comunidad: string;
  motivo: string;
  medico: string;
  medicamentos: string[];
}

export default function PacientesBrigada() {
  const { role } = usePermissions();
  const userRole = role.nombre;
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [brigadaSeleccionada, setBrigadaSeleccionada] = useState<string>("");
  const [pacientes, setPacientes] = useState<PacienteData[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // biome-ignore lint/correctness/useExhaustiveDependencies: los filtros son el disparador; al cambiarlos se vuelve a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [brigadaSeleccionada, busqueda]);

  useEffect(() => {
    async function fetchBrigadas() {
      try {
        const { data, error } = await supabase
          .from("brigadas")
          .select("id, nombre")
          .order("fecha_brigada", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          setBrigadas(data);
          setBrigadaSeleccionada(data[0].id);
        }
      } catch (err) {
        logger.error("Brigade list load failed", errorInfo(err));
      }
    }
    fetchBrigadas();
  }, []);

  useEffect(() => {
    if (!brigadaSeleccionada) return;
    async function fetchPacientes() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("pacientes")
          .select(`
            id,
            nombres,
            apellidos,
            edad,
            comunidad,
            consultas (
              id,
              motivo_consulta,
              medico:perfiles (
                nombre_completo
              ),
              medicamentos_consulta (
                medicamentos (
                  nombre
                )
              )
            )
          `)
          .eq("brigada_id", brigadaSeleccionada);
        if (error) throw error;

        const formatted = (data || []).map((p) => {
          const consulta = p.consultas?.[0];
          const meds = consulta
            ? (consulta.medicamentos_consulta || [])
                .map((mc) => mc.medicamentos?.nombre)
                .filter((nombre): nombre is string => Boolean(nombre))
            : [];
          return {
            id: p.id,
            nombre: `${p.nombres} ${p.apellidos ?? ""}`.trim(),
            edad: p.edad || 0,
            comunidad: p.comunidad || "N/A",
            motivo: consulta?.motivo_consulta || "Solo registro/triage",
            medico: consulta?.medico?.nombre_completo || "No asignado",
            medicamentos: meds,
          };
        });
        setPacientes(formatted);
      } catch (err) {
        logger.error("Brigade patients load failed", {
          ...errorInfo(err),
          brigadaId: brigadaSeleccionada,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPacientes();
  }, [brigadaSeleccionada]);

  const pacientesFiltrados = pacientes
    .filter(
      (p) =>
        busqueda === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.comunidad.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.medico.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const nombreBrigada =
    brigadas.find((b) => b.id === brigadaSeleccionada)?.nombre || "";
  const totalPages = Math.ceil(pacientesFiltrados.length / itemsPerPage);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Reporte de Pacientes por Brigada";

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
            <h2 className={styles.sectionTitle}>
              Reporte de Pacientes por Brigada
            </h2>
            <p className={styles.sectionLead}>
              Listado detallado de pacientes atendidos, diagnóstico y
              medicamentos recetados.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handlePrint}
          >
            <Printer aria-hidden="true" />
            Imprimir
          </button>
        </div>

        <section className={styles.panel}>
          {/* Filtros */}
          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="brigada-select">
                Brigada
              </label>
              <select
                id="brigada-select"
                className="form-input form-input-sm"
                value={brigadaSeleccionada}
                onChange={(e) => setBrigadaSeleccionada(e.target.value)}
              >
                {brigadas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.filter} ${styles.filterWide}`}>
              <label className={styles.filterLabel} htmlFor="busqueda-paciente">
                Buscar paciente
              </label>
              <div className={styles.search}>
                <Search aria-hidden="true" />
                <input
                  id="busqueda-paciente"
                  type="text"
                  className="form-input form-input-sm"
                  placeholder="Nombre, comunidad, médico…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabla Web */}
          {loading ? (
            <div className={styles.panelBody}>
              <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
                <span className="sr-only">
                  Cargando pacientes de la brigada...
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre del Paciente</th>
                    <th className={styles.num}>Edad</th>
                    <th>Comunidad</th>
                    <th>Motivo de Consulta</th>
                    <th>Médico Asignado</th>
                    <th>Medicamentos Recetados</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        No hay pacientes registrados en esta brigada.
                      </td>
                    </tr>
                  ) : (
                    pacientesFiltrados
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map((p, relativeIdx) => {
                        const absoluteIdx =
                          (currentPage - 1) * itemsPerPage + relativeIdx;
                        return (
                          <tr key={p.id}>
                            <td className={styles.muted}>{absoluteIdx + 1}</td>
                            <td className={styles.cellMain}>{p.nombre}</td>
                            <td className={styles.num}>{p.edad}</td>
                            <td>{p.comunidad}</td>
                            <td>{p.motivo}</td>
                            <td>{p.medico}</td>
                            <td>
                              {p.medicamentos.length === 0 ? (
                                <span className={styles.muted}>Ninguno</span>
                              ) : (
                                <div className={listas.pills}>
                                  {p.medicamentos.map((med, i) => (
                                    <span
                                      // biome-ignore lint/suspicious/noArrayIndexKey: un mismo medicamento puede repetirse entre consultas; lista de solo lectura que no se reordena
                                      key={`${med}-${i}`}
                                      className={`${styles.badge} ${styles.badgeInfo}`}
                                    >
                                      {med}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pacientesFiltrados.length > 0 && (
            <div className={styles.panelFooter}>
              <span className={styles.pagerInfo}>
                Página {currentPage} de {totalPages}
              </span>
              <div className={styles.row}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                >
                  <ChevronLeft aria-hidden="true" />
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
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
          title="Reporte de Pacientes por Brigada"
          userRole={userRole}
          metaItems={[
            { label: "Brigada", value: nombreBrigada || "Todas" },
            { label: "Total Pacientes", value: pacientesFiltrados.length },
          ]}
          footerNote="Confidencialidad médica — Fundación Dibujando Sonrisas"
        >
          <table className={rep.printTable}>
            <thead>
              <tr>
                <th className={rep.w4}>#</th>
                <th className={rep.w24}>Nombre del Paciente</th>
                <th className={rep.w6}>Edad</th>
                <th className={rep.w16}>Comunidad</th>
                <th className={rep.w20}>Motivo de Consulta</th>
                <th className={rep.w16}>Médico Asignado</th>
                <th className={rep.w14}>Medicamentos Recetados</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={rep.printCenter}>
                    Cargando pacientes de la brigada...
                  </td>
                </tr>
              ) : pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className={rep.printCenter}>
                    No se encontraron pacientes para esta brigada.
                  </td>
                </tr>
              ) : (
                pacientesFiltrados.map((p, idx) => (
                  <tr key={p.id}>
                    <td className={rep.printCenter}>{idx + 1}</td>
                    <td className={rep.printStrong}>{p.nombre}</td>
                    <td className={rep.printCenter}>{p.edad}</td>
                    <td>{p.comunidad}</td>
                    <td>{p.motivo}</td>
                    <td>{p.medico}</td>
                    <td>
                      {p.medicamentos.length === 0 ? (
                        <span className={rep.printMuted}>Ninguno</span>
                      ) : (
                        p.medicamentos.join(", ")
                      )}
                    </td>
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
