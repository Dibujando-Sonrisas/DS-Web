"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  HeartPulse,
  History,
  LoaderCircle,
  Package,
  PackageCheck,
  Pill,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import AdminModal from "@/app/administracion/components/AdminModal";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import StatCard from "@/app/administracion/components/StatCard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { Tables } from "@/lib/database.types";
import type { FefoSuggestion } from "@/lib/db/farmacia";
import { errorInfo, getLogger } from "@/lib/logger";
import styles from "@/styles/pages/admin.module.css";
import pac from "@/styles/pages/admin-pacientes.module.css";
import {
  getDashboardFarmaciaAction,
  getEntregasFarmaciaAction,
  getFefoSuggestionsAction,
  getRecetasPendientesAction,
  registrarEntregaManualAction,
} from "./actions";

const logger = getLogger("farmacia", "client");

type Dashboard = Awaited<ReturnType<typeof getDashboardFarmaciaAction>>;
type Entrega = Awaited<ReturnType<typeof getEntregasFarmaciaAction>>[number];
type Receta = Awaited<ReturnType<typeof getRecetasPendientesAction>>[number];

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "-";

const byBrigada = <T extends { brigada_id: string | null }>(
  items: T[],
  brigadaId: string
) =>
  brigadaId === "todas"
    ? items
    : items.filter((item) => item.brigada_id === brigadaId);

export function FarmaciaClient({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const [dashboard, setDashboard] = useState<Dashboard>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [pendientes, setPendientes] = useState<Receta[]>([]);
  const [todasLasBrigadas, setTodasLasBrigadas] = useState<
    Tables<"brigadas">[]
  >([]);
  const [filtroBrigada, setFiltroBrigada] = useState<string>("todas");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pendientes" | "historial">(
    "pendientes"
  );
  const [currentPagePendientes, setCurrentPagePendientes] = useState(1);
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const itemsPerPage = 20;

  // biome-ignore lint/correctness/useExhaustiveDependencies: el filtro y la pestaña son los disparadores; al cambiarlos se vuelve a la página 1
  useEffect(() => {
    setCurrentPagePendientes(1);
    setCurrentPageHistorial(1);
  }, [filtroBrigada, activeTab]);

  const entregadoPorId = userId;

  // Modal State
  const [selectedConsulta, setSelectedConsulta] = useState<Receta | null>(null);
  const [fefoSuggestions, setFefoSuggestions] = useState<FefoSuggestion[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dash, hist, pend, brigs] = await Promise.all([
        getDashboardFarmaciaAction(),
        getEntregasFarmaciaAction(),
        getRecetasPendientesAction(),
        getBrigadas(),
      ]);
      setDashboard(dash);
      setEntregas(hist);
      setPendientes(pend);
      setTodasLasBrigadas(brigs.data || []);
    } catch (e) {
      logger.error("Pharmacy load failed", errorInfo(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEntregaModal = async (receta: Receta) => {
    setSelectedConsulta(receta);
    setObservaciones("");
    setModalError("");
    setModalSuccess("");
    setIsModalOpen(true);
    setIsSubmitting(true);
    try {
      const suggestions = await getFefoSuggestionsAction(receta.id);
      setFefoSuggestions(suggestions);
    } catch (e) {
      logger.error("FEFO suggestion failed", {
        ...errorInfo(e),
        consultaId: receta.id,
      });
      setModalError(
        `Error al calcular FEFO: ${e instanceof Error ? e.message : ""}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCantidadChange = (idx: number, newCantidad: number) => {
    const updated = [...fefoSuggestions];
    updated[idx].cantidad_sugerida = newCantidad;
    setFefoSuggestions(updated);
  };

  const handleConfirmarEntrega = async () => {
    if (!selectedConsulta) return;
    setModalError("");
    setModalSuccess("");

    if (fefoSuggestions.some((s) => s.error)) {
      setModalError(
        "No se puede entregar. Hay medicamentos agotados. Ajusta las cantidades."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await registrarEntregaManualAction(
        fefoSuggestions,
        observaciones,
        selectedConsulta.id,
        entregadoPorId
      );
      setModalSuccess(
        "¡Entrega registrada exitosamente! El inventario ha sido actualizado."
      );
      setTimeout(() => {
        setIsModalOpen(false);
        fetchData();
      }, 1500);
    } catch (e) {
      logger.error("Pharmacy delivery failed", {
        ...errorInfo(e),
        consultaId: selectedConsulta.id,
      });
      setModalError(
        `Error al procesar la entrega: ${e instanceof Error ? e.message : ""}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // lista de la pestaña activa, filtrada por brigada y paginada
  const pendientesFiltradas = byBrigada(pendientes, filtroBrigada);
  const entregasFiltradas = byBrigada(entregas, filtroBrigada);
  const filteredCount =
    activeTab === "pendientes"
      ? pendientesFiltradas.length
      : entregasFiltradas.length;
  const curPage =
    activeTab === "pendientes" ? currentPagePendientes : currentPageHistorial;
  const setCurPage =
    activeTab === "pendientes"
      ? setCurrentPagePendientes
      : setCurrentPageHistorial;
  const paginate = <T,>(items: T[]) =>
    items.slice((curPage - 1) * itemsPerPage, curPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCount / itemsPerPage);

  return (
    <div className={styles.stack}>
      {/* Modal */}
      {isModalOpen && selectedConsulta && (
        <AdminModal
          title="Registrar Entrega a Paciente"
          size="lg"
          onClose={() => setIsModalOpen(false)}
        >
          <div className={styles.modalBody}>
            {modalError && (
              <p className="form-error form-alert" role="alert">
                <CircleAlert aria-hidden="true" />
                <span>{modalError}</span>
              </p>
            )}
            {modalSuccess && (
              <p className="notice notice-ok" role="status">
                <CircleCheck aria-hidden="true" />
                <span>{modalSuccess}</span>
              </p>
            )}

            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                1. Información del Paciente y Receta
              </h3>
              <dl className={styles.kv}>
                <dt>Paciente:</dt>
                <dd>
                  {selectedConsulta.pacientes?.nombres}{" "}
                  {selectedConsulta.pacientes?.apellidos}
                </dd>
                <dt>Fecha Receta:</dt>
                <dd>{formatDate(selectedConsulta.created_at)}</dd>
              </dl>
            </div>

            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>
                2. Asignación de Lotes (Automático FEFO)
              </h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Medicamento</th>
                      <th>Lote</th>
                      <th className={styles.num}>Stock Lote</th>
                      <th className={styles.num}>Cant. Solicitada</th>
                      <th>Cant. a Entregar</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSubmitting && fefoSuggestions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyCell}>
                          Calculando lotes FEFO...
                        </td>
                      </tr>
                    ) : (
                      fefoSuggestions.map((s, idx) => (
                        <tr key={s.medicamento_id}>
                          <td className={styles.cellMain}>
                            {s.medicamento_nombre}
                          </td>
                          <td className={styles.cellCode}>{s.lote_numero}</td>
                          <td className={styles.num}>{s.stock_disponible}</td>
                          <td className={styles.num}>{s.cantidad_requerida}</td>
                          <td>
                            <label className={pac.qty}>
                              <span className="sr-only">
                                Cantidad a entregar de {s.medicamento_nombre}
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={s.stock_disponible}
                                value={s.cantidad_sugerida}
                                onChange={(e) =>
                                  handleCantidadChange(
                                    idx,
                                    Number(e.target.value)
                                  )
                                }
                                className="form-input form-input-sm"
                                disabled={!!s.error}
                              />
                            </label>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${s.error ? styles.badgeDanger : s.warning ? styles.badgeWarning : styles.badgeSuccess}`}
                            >
                              {s.error || s.warning || "Stock suficiente"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* el formulario abarca solo las observaciones, como antes: Enter en una cantidad no envía la entrega */}
            <form
              id="farmacia-entrega-form"
              className={styles.formSection}
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmarEntrega();
              }}
            >
              <h3 className={styles.formSectionTitle}>
                3. Observaciones y Confirmación
              </h3>
              <label className="form-field">
                <span className="form-label">
                  Observaciones de Entrega{" "}
                  <span className="form-optional">(Opcional)</span>
                </span>
                <textarea
                  className="form-input"
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Opcional: Ej. Paciente rechazó un medicamento..."
                />
              </label>
            </form>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="farmacia-entrega-form"
              className="btn-primary btn-sm"
              disabled={isSubmitting || fefoSuggestions.length === 0}
            >
              {isSubmitting ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <PackageCheck aria-hidden="true" />
              )}
              {isSubmitting
                ? "Procesando Entrega..."
                : "Confirmar Entrega de Medicamentos"}
            </button>
          </div>
        </AdminModal>
      )}

      {/* Dashboard Top */}
      {dashboard ? (
        <div className={`${styles.statGrid} tone-rotate`}>
          <StatCard
            label="Pacientes Atendidos"
            value={dashboard.pacientes_atendidos || 0}
            icon={<HeartPulse />}
          />
          <StatCard
            label="Líneas de Entrega"
            value={dashboard.total_entregas || 0}
            icon={<Package />}
          />
          <StatCard
            label="Unidades Entregadas"
            value={dashboard.total_unidades_entregadas || 0}
            icon={<Pill />}
          />
        </div>
      ) : (
        isLoading && (
          <div className={styles.statGrid}>
            <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
            <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
            <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          </div>
        )
      )}

      {/* Tabs */}
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Secciones de farmacia"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pendientes"}
          className={styles.tab}
          onClick={() => setActiveTab("pendientes")}
        >
          <ClipboardList aria-hidden="true" />
          Recetas Pendientes
          <span className={styles.tabCount}>{pendientes.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "historial"}
          className={styles.tab}
          onClick={() => setActiveTab("historial")}
        >
          <History aria-hidden="true" />
          Historial de Entregas
        </button>
      </div>

      {/* Main Table Container */}
      {isLoading ? (
        <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
          <span className="sr-only">Cargando...</span>
        </div>
      ) : (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              {activeTab === "pendientes"
                ? "Recetas Pendientes de Entrega"
                : "Historial de Medicamentos Entregados"}
            </h2>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <label
                className={styles.filterLabel}
                htmlFor="farmacia-filtro-brigada"
              >
                {activeTab === "pendientes"
                  ? "Filtrar por Brigada Activa:"
                  : "Filtrar por Brigada:"}
              </label>
              <select
                id="farmacia-filtro-brigada"
                className="form-input form-input-sm"
                value={filtroBrigada}
                onChange={(e) => setFiltroBrigada(e.target.value)}
              >
                <option value="todas">Todas las Brigadas</option>
                {todasLasBrigadas
                  .filter(
                    (b) =>
                      activeTab !== "pendientes" ||
                      (b.estado !== "finalizada" && b.estado !== "cancelada")
                  )
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className={styles.tableWrap}>
            {activeTab === "pendientes" ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha Consulta</th>
                    <th>Paciente</th>
                    <th>Medicamentos Recetados</th>
                    <th className={styles.num}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        No hay recetas pendientes en esta brigada.
                      </td>
                    </tr>
                  ) : (
                    paginate(pendientesFiltradas).map((p) => (
                      <tr key={p.id}>
                        <td className={styles.nowrap}>
                          {formatDate(p.created_at)}
                        </td>
                        <td className={styles.cellMain}>
                          {p.pacientes?.nombres} {p.pacientes?.apellidos}
                        </td>
                        <td>
                          <ul className={styles.stackSm}>
                            {p.medicamentos_consulta?.map((m) => (
                              <li key={m.medicamento_id}>
                                <span
                                  className={`${styles.badge} ${styles.badgeInfo}`}
                                >
                                  {m.cantidad}x {m.medicamentos?.nombre}
                                </span>
                                {m.indicaciones && (
                                  <span className={styles.cellSub}>
                                    ({m.indicaciones})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          {(can(PERMISSIONS.FARMACIA_PROCESS) ||
                            can(PERMISSIONS.FARMACIA_CREATE)) && (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className="btn-primary btn-xs"
                                onClick={() => openEntregaModal(p)}
                              >
                                <PackageCheck aria-hidden="true" />
                                Realizar Entrega
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha Entrega</th>
                    <th>Paciente</th>
                    <th>Medicamento</th>
                    <th className={styles.num}>Cantidad</th>
                    <th>Lote</th>
                    <th>Vencimiento</th>
                    <th>Entregado Por</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        No hay historial de entregas para esta brigada.
                      </td>
                    </tr>
                  ) : (
                    paginate(entregasFiltradas).map((e) => (
                      <tr key={e.id}>
                        <td className={styles.nowrap}>
                          {formatDate(e.fecha_entrega)}
                        </td>
                        <td className={styles.cellMain}>{e.paciente}</td>
                        <td>{e.medicamento}</td>
                        <td className={`${styles.num} ${styles.cellMain}`}>
                          {e.cantidad}
                        </td>
                        <td className={styles.cellCode}>{e.numero_lote}</td>
                        <td className={styles.nowrap}>
                          {formatDate(e.fecha_vencimiento)}
                        </td>
                        <td className={styles.muted}>{e.entregado_por}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <nav className={styles.panelFooter} aria-label="Paginación">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={curPage === 1}
                onClick={() => setCurPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </button>
              <span className={styles.pagerInfo}>
                Página {curPage} de {totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={curPage === totalPages}
                onClick={() =>
                  setCurPage((prev) => Math.min(prev + 1, totalPages))
                }
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
