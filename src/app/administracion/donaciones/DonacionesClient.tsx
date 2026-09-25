"use client";

import { useState, useEffect } from "react";
import {
  getDonacionesRopaAction as getDonacionesRopa,
  getEntregasRopaAction as getEntregasRopa,
  getDashboardRopaAction as getDashboardRopa,
  getResumenRopaAction as getResumenRopa,
  getPacientesBrigadaParaRopaAction as getPacientesBrigadaParaRopa,
  registrarDonacionRopaAction as createDonacionRopa,
  registrarEntregaRopaAction as createEntregaRopa,
} from "./actions";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Gift,
  LoaderCircle,
  Plus,
  Shirt,
  Users,
} from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import { useToast } from "@/app/administracion/components/AdminToast";
import StatCard from "@/app/administracion/components/StatCard";
import styles from "@/styles/pages/admin.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

export function DonacionesClient({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const [resumen, setResumen] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [donaciones, setDonaciones] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"donaciones" | "entregas">("donaciones");
  const [filtroBrigada, setFiltroBrigada] = useState<string>("todas");
  const [brigadasActivas, setBrigadasActivas] = useState<any[]>([]);
  const [todasLasBrigadas, setTodasLasBrigadas] = useState<any[]>([]);
  const [currentPageDonaciones, setCurrentPageDonaciones] = useState(1);
  const [currentPageEntregas, setCurrentPageEntregas] = useState(1);
  const itemsPerPage = 20;

  const { showToast } = useToast();

  useEffect(() => {
    setCurrentPageDonaciones(1);
    setCurrentPageEntregas(1);
  }, [filtroBrigada, activeTab]);

  // Donacion Modal
  const [isDonacionModalOpen, setIsDonacionModalOpen] = useState(false);
  const [donacionForm, setDonacionForm] = useState({ fecha_donacion: new Date().toISOString().split('T')[0], nombre_donante: "", cantidad_prendas: 1, observaciones: "", tipo_donacion: "Ropa" });

  // Entrega Modal
  const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);
  const [pacientesElegibles, setPacientesElegibles] = useState<any[]>([]);
  const [entregaForm, setEntregaForm] = useState({ brigada_id: "", paciente_id: "", cantidad_prendas: 1, observaciones: "" });
  const [isFetchingPacientes, setIsFetchingPacientes] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, dash, d, e, b] = await Promise.all([
        getResumenRopa(),
        getDashboardRopa(),
        getDonacionesRopa(),
        getEntregasRopa(),
        getBrigadas()
      ]);
      setResumen(res);
      setDashboard(dash);
      setDonaciones(d);
      setEntregas(e);
      setTodasLasBrigadas(b.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const openDonacionModal = () => {
    setDonacionForm({ fecha_donacion: new Date().toISOString().split('T')[0], nombre_donante: "", cantidad_prendas: 1, observaciones: "", tipo_donacion: "Ropa" });
    setIsDonacionModalOpen(true);
  };

  const submitDonacion = async () => {
    if (donacionForm.cantidad_prendas <= 0) return showToast("Cantidad inválida", "error");
    try {
      await createDonacionRopa(donacionForm);
      setIsDonacionModalOpen(false);
      showToast("Donación registrada correctamente", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const openEntregaModal = async () => {
    setIsEntregaModalOpen(true);
    setEntregaForm({ brigada_id: "", paciente_id: "", cantidad_prendas: 1, observaciones: "" });
    setPacientesElegibles([]);
    try {
      const bRes = await getBrigadas();
      const activas = bRes.data?.filter(b => b.estado !== 'finalizada' && b.estado !== 'cancelada') || [];
      setBrigadasActivas(activas);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBrigadaChange = async (brigadaId: string) => {
    setEntregaForm(prev => ({ ...prev, brigada_id: brigadaId, paciente_id: "" }));
    setPacientesElegibles([]);
    if (!brigadaId) return;
    
    setIsFetchingPacientes(true);
    try {
      const pacs = await getPacientesBrigadaParaRopa(brigadaId);
      setPacientesElegibles(pacs);
    } catch (e: any) {
      alert("Error cargando pacientes: " + e.message);
    } finally {
      setIsFetchingPacientes(false);
    }
  };

  const submitEntrega = async () => {
    if (!entregaForm.brigada_id || !entregaForm.paciente_id) return showToast("Seleccione brigada y paciente", "error");
    if (entregaForm.cantidad_prendas < 1 || entregaForm.cantidad_prendas > 2) return showToast("Máximo 2 prendas por paciente", "error");
    
    // Check if patient selected has enough availability
    const pac = pacientesElegibles.find(p => p.id === entregaForm.paciente_id);
    if (!pac || entregaForm.cantidad_prendas > pac.prendasDisponibles) {
      return showToast("El paciente no puede recibir esa cantidad de prendas. Límite: 2 por paciente.", "error");
    }

    try {
      await createEntregaRopa({
        ...entregaForm,
        entregado_por: userId
      });
      setIsEntregaModalOpen(false);
      showToast("Entrega de ropa registrada", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Paginación de la pestaña activa (las entregas se filtran por brigada)
  const entregasFiltradas = filtroBrigada === "todas"
    ? entregas
    : entregas.filter(e => e.brigada_id === filtroBrigada);
  const listaActiva = activeTab === "donaciones" ? donaciones : entregasFiltradas;
  const totalPages = Math.ceil(listaActiva.length / itemsPerPage);
  const curPage = activeTab === "donaciones" ? currentPageDonaciones : currentPageEntregas;
  const setCurPage = activeTab === "donaciones" ? setCurrentPageDonaciones : setCurrentPageEntregas;

  return (
    <div className={styles.stack}>
      {/* Stats Grid */}
      {isLoading ? (
        <div className={styles.statGrid}>
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
        </div>
      ) : (
        <div className={`${styles.statGrid} tone-rotate`}>
          <StatCard label="Prendas Donadas" value={resumen?.prendas_donadas || 0} icon={<Shirt />} />
          <StatCard label="Prendas Entregadas" value={dashboard?.prendas_entregadas || 0} icon={<Gift />} />
          <StatCard label="Pacientes Beneficiados" value={dashboard?.pacientes_beneficiados || 0} icon={<Users />} />
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Donaciones y entregas de ropa">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "donaciones"}
          className={styles.tab}
          onClick={() => setActiveTab("donaciones")}
        >
          <Shirt aria-hidden="true" />
          Donaciones Recibidas <span className={styles.tabCount}>{donaciones.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "entregas"}
          className={styles.tab}
          onClick={() => setActiveTab("entregas")}
        >
          <Gift aria-hidden="true" />
          Ropa Entregada <span className={styles.tabCount}>{entregas.length}</span>
        </button>
      </div>

      {/* Tables */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            {activeTab === "donaciones" ? "Historial de Donaciones" : "Ropa Entregada en Brigadas"}
          </h2>
          {can(PERMISSIONS.DONACIONES_CREATE) && (
            <div className={styles.panelActions}>
              <button type="button" className="btn-ghost btn-sm" onClick={openDonacionModal}>
                <Plus aria-hidden="true" />
                Nueva Donación
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={openEntregaModal}>
                <Plus aria-hidden="true" />
                Registrar Entrega
              </button>
            </div>
          )}
        </div>

        {activeTab === "entregas" && (
          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <label className={styles.filterLabel} htmlFor="filtro-brigada">Filtrar Historial por Brigada:</label>
              <select
                id="filtro-brigada"
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
        )}

        {isLoading ? (
          <div className={styles.panelBody}>
            <div className={`${styles.skeleton} ${styles.skeletonBlock}`} />
          </div>
        ) : (
          <div className={styles.tableWrap}>
            {activeTab === "donaciones" ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Donante</th>
                    <th className={styles.num}>Cantidad</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {donaciones.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyCell}>No hay donaciones registradas</td></tr>
                  ) : (
                    donaciones.slice((currentPageDonaciones - 1) * itemsPerPage, currentPageDonaciones * itemsPerPage).map(d => (
                      <tr key={d.id}>
                        <td className={styles.cellCode}>{d.codigo}</td>
                        <td className={styles.nowrap}>{new Date(d.fecha_donacion).toLocaleDateString()}</td>
                        <td><span className={`${styles.badge} ${styles.badgeInfo}`}>{d.tipo_donacion || 'Ropa'}</span></td>
                        <td>{d.nombre_donante || "-"}</td>
                        <td className={`${styles.num} ${styles.cellMain}`}>{d.cantidad_prendas}</td>
                        <td>{d.observaciones || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Brigada</th>
                    <th>Paciente</th>
                    <th className={styles.num}>Prendas</th>
                    <th>Entregado Por</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyCell}>No hay entregas registradas en esta brigada</td></tr>
                  ) : (
                    entregasFiltradas.slice((currentPageEntregas - 1) * itemsPerPage, currentPageEntregas * itemsPerPage).map(e => (
                      <tr key={e.id}>
                        <td className={styles.nowrap}>{new Date(e.fecha_entrega).toLocaleDateString()}</td>
                        <td>{e.brigadas?.nombre}</td>
                        <td className={styles.cellMain}>{e.pacientes?.nombres} {e.pacientes?.apellidos}</td>
                        <td className={`${styles.num} ${styles.cellMain}`}>{e.cantidad_prendas}</td>
                        <td>{e.perfiles?.nombre_completo}</td>
                        <td>{e.observaciones || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.panelFooter}>
            <span className={styles.pagerInfo}>Página {curPage} de {totalPages}</span>
            <div className={styles.row}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={curPage === 1}
                onClick={() => setCurPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={curPage === totalPages}
                onClick={() => setCurPage(prev => Math.min(prev + 1, totalPages))}
              >
                Siguiente
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal Donacion */}
      {isDonacionModalOpen && (
        <AdminModal title="Registrar Donación de Ropa" size="sm" onClose={() => setIsDonacionModalOpen(false)}>
          <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); submitDonacion(); }}>
            <div className={styles.modalBody}>
              <div className="form-grid">
                <label className="form-field">
                  <span className="form-label">
                    Tipo de Donación <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select className="form-input" value={donacionForm.tipo_donacion} onChange={e => setDonacionForm({...donacionForm, tipo_donacion: e.target.value})} required>
                    <option value="Ropa">Ropa</option>
                    <option value="Dinero">Dinero</option>
                    <option value="Juguetes">Juguetes</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Fecha de Donación <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input className="form-input" type="date" value={donacionForm.fecha_donacion} onChange={e => setDonacionForm({...donacionForm, fecha_donacion: e.target.value})} required />
                </label>
              </div>
              <label className="form-field">
                <span className="form-label">Donante</span>
                <input className="form-input" value={donacionForm.nombre_donante} onChange={e => setDonacionForm({...donacionForm, nombre_donante: e.target.value})} placeholder="Nombre de la persona o institución" />
              </label>
              <label className="form-field">
                <span className="form-label">
                  Cantidad (Prendas, Lempiras o Unidades) <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input className="form-input" type="number" min="1" step="any" value={donacionForm.cantidad_prendas} onChange={e => setDonacionForm({...donacionForm, cantidad_prendas: Number(e.target.value)})} required />
              </label>
              <label className="form-field">
                <span className="form-label">Observaciones</span>
                <textarea className="form-input" rows={2} value={donacionForm.observaciones} onChange={e => setDonacionForm({...donacionForm, observaciones: e.target.value})} />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsDonacionModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary btn-sm">Guardar Donación</button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Modal Entrega */}
      {isEntregaModalOpen && (
        <AdminModal title="Registrar Entrega a Paciente" size="sm" onClose={() => setIsEntregaModalOpen(false)}>
          <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); submitEntrega(); }}>
            <div className={styles.modalBody}>
              <label className="form-field">
                <span className="form-label">
                  Brigada Activa <span className="form-required" aria-hidden="true">*</span>
                </span>
                <select className="form-input" value={entregaForm.brigada_id} onChange={e => handleBrigadaChange(e.target.value)} required>
                  <option value="" disabled>-- Seleccionar Brigada --</option>
                  {brigadasActivas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </label>

              {isFetchingPacientes && (
                <p className="notice">
                  <LoaderCircle className="spin" aria-hidden="true" />
                  <span>Cargando pacientes de la brigada...</span>
                </p>
              )}

              {entregaForm.brigada_id && !isFetchingPacientes && (
                <label className="form-field">
                  <span className="form-label">
                    Paciente (Elegibles para Ropa) <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select className="form-input" value={entregaForm.paciente_id} onChange={e => setEntregaForm({...entregaForm, paciente_id: e.target.value})} required>
                    <option value="" disabled>-- Seleccionar Paciente --</option>
                    {pacientesElegibles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombres} {p.apellidos} (Max. disp: {p.prendasDisponibles})
                      </option>
                    ))}
                  </select>
                  {pacientesElegibles.length === 0 && (
                    <span className="form-error">
                      <CircleAlert size={14} aria-hidden="true" />
                      No hay pacientes elegibles en esta brigada (o todos ya recibieron sus 2 prendas).
                    </span>
                  )}
                </label>
              )}

              <label className="form-field">
                <span className="form-label">
                  Cantidad (Máx 2 por paciente) <span className="form-required" aria-hidden="true">*</span>
                </span>
                <select className="form-input" value={entregaForm.cantidad_prendas} onChange={e => setEntregaForm({...entregaForm, cantidad_prendas: Number(e.target.value)})} required>
                  <option value={1}>1 Prenda</option>
                  <option value={2}>2 Prendas</option>
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Observaciones</span>
                <textarea className="form-input" rows={2} value={entregaForm.observaciones} onChange={e => setEntregaForm({...entregaForm, observaciones: e.target.value})} />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsEntregaModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary btn-sm" disabled={!entregaForm.paciente_id}>Registrar Entrega</button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Toast Alert */}
    </div>
  );
}
