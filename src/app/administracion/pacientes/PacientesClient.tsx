"use client";

import { useState, useEffect } from "react";
import {
  getPacientesAtendidosAction as getPacientesAtendidos,
  getPacientesDashboardAction as getPacientesDashboard,
} from "./actions";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import { ChevronLeft, ChevronRight, HeartPulse, Mars, Plus, Venus } from "lucide-react";
import StatCard from "@/app/administracion/components/StatCard";
import styles from "@/styles/pages/admin.module.css";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

export function PacientesClient() {
  const { can } = usePermissions();
  const router = useRouter();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [todasLasBrigadas, setTodasLasBrigadas] = useState<any[]>([]);
  const [filtroBrigada, setFiltroBrigada] = useState<string>("todas");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroBrigada]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [pacs, dash, brigs] = await Promise.all([
        getPacientesAtendidos(),
        getPacientesDashboard(),
        getBrigadas()
      ]);
      setPacientes(pacs);
      setDashboard(dash);
      setTodasLasBrigadas(brigs.data || []);
    } catch (error) {
      console.error("Error al cargar pacientes", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mounted) fetchData();
    return () => { mounted = false; };
  }, []);

  const filtered = filtroBrigada === "todas"
    ? pacientes
    : pacientes.filter(p => p.brigada_id === filtroBrigada);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className={styles.stack}>
      {/* Dashboard Top */}
      {dashboard ? (
        <div className={`${styles.statGrid} tone-rotate`}>
          <StatCard label="Total Pacientes" value={dashboard.pacientes} icon={<HeartPulse />} />
          <StatCard label="Hombres Atendidos" value={dashboard.hombres} icon={<Mars />} />
          <StatCard label="Mujeres Atendidas" value={dashboard.mujeres} icon={<Venus />} />
        </div>
      ) : isLoading && (
        <div className={styles.statGrid}>
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
        </div>
      )}

      {isLoading ? (
        <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
          <span className="sr-only">Cargando expedientes...</span>
        </div>
      ) : (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>
                Listado de Atenciones <span className={styles.count}>{filtered.length}</span>
              </h2>
              <p className={styles.panelSub}>Historial de expedientes digitados por brigada.</p>
            </div>
            {can(PERMISSIONS.PACIENTES_CREATE) && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => router.push("/administracion/pacientes/nuevo")}
              >
                <Plus aria-hidden="true" />
                Nuevo Expediente
              </button>
            )}
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="pacientes-filtro-brigada">
                Filtrar por Brigada:
              </label>
              <select
                id="pacientes-filtro-brigada"
                className="form-input form-input-sm"
                value={filtroBrigada}
                onChange={e => setFiltroBrigada(e.target.value)}
              >
                <option value="todas">Todas las Brigadas</option>
                {todasLasBrigadas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Paciente</th>
                  <th>Brigada</th>
                  <th>Consulta</th>
                  <th>Médico Atendió</th>
                  <th>Fecha Digitado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      No hay expedientes registrados en esta brigada.
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id}>
                      <td className={styles.cellCode}>{p.codigo}</td>
                      <td className={styles.cellMain}>{p.paciente}</td>
                      <td>{p.brigada}</td>
                      <td>
                        <span className={`${styles.badge} ${p.tipo_consulta === "Odontologica" ? styles.badgeBrand : styles.badgeInfo}`}>
                          {p.tipo_consulta}
                        </span>
                      </td>
                      <td>{p.medico || "-"}</td>
                      <td className={styles.nowrap}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className={styles.panelFooter} aria-label="Paginación">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </button>
              <span className={styles.pagerInfo}>Página {currentPage} de {totalPages}</span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Siguiente
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
