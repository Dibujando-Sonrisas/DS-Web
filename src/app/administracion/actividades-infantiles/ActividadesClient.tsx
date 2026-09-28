"use client";

import { useState, useEffect } from "react";
import {
  getActividadesInfantilesAction as getActividades,
  getDashboardActividadesAction as getDashboardActividades,
  crearActividadInfantilAction as createActividad,
  registrarParticipacionNinosAction as addParticipantesActividad,
} from "./actions";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import { Baby, ChevronLeft, ChevronRight, Gift, Plus, Smile } from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import StatCard from "@/app/administracion/components/StatCard";
import styles from "@/styles/pages/admin.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

export function ActividadesClient({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const [dashboard, setDashboard] = useState<any>(null);
  const [actividades, setActividades] = useState<any[]>([]);
  const [brigadas, setBrigadas] = useState<any[]>([]);
  const [todasLasBrigadas, setTodasLasBrigadas] = useState<any[]>([]);
  const [filtroBrigada, setFiltroBrigada] = useState<string>("todas");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroBrigada]);

  // Modals
  const [isActividadModalOpen, setIsActividadModalOpen] = useState(false);
  const [isParticipantesModalOpen, setIsParticipantesModalOpen] = useState(false);

  // Forms
  const [actividadForm, setActividadForm] = useState({ brigada_id: "", nombre: "", descripcion: "", cantidad_regalos: 0 });
  const [participantesForm, setParticipantesForm] = useState({ actividad_id: "", cantidad_ninos: 1 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dash, acts, brigs] = await Promise.all([
        getDashboardActividades(),
        getActividades(),
        getBrigadas()
      ]);
      setDashboard(dash);
      setActividades(acts);
      setTodasLasBrigadas(brigs.data || []);
      setBrigadas(brigs.data?.filter((b: any) => b.estado !== "finalizada" && b.estado !== "cancelada") || []);
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

  const submitActividad = async () => {
    if (!actividadForm.brigada_id || !actividadForm.nombre) return alert("Completa los campos requeridos");
    try {
      await createActividad({ ...actividadForm, responsable_id: userId });
      setIsActividadModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openParticipantesModal = (actividadId: string) => {
    setParticipantesForm({ actividad_id: actividadId, cantidad_ninos: 1 });
    setIsParticipantesModalOpen(true);
  };

  const submitParticipantes = async () => {
    if (participantesForm.cantidad_ninos <= 0) return alert("Cantidad inválida");
    try {
      await addParticipantesActividad(participantesForm.actividad_id, participantesForm.cantidad_ninos);
      setIsParticipantesModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = filtroBrigada === "todas"
    ? actividades
    : actividades.filter(act => act.brigada_id === filtroBrigada);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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
          <StatCard label="Total Actividades" value={dashboard?.actividades || 0} icon={<Smile />} />
          <StatCard label="Niños Beneficiados" value={dashboard?.ninos_beneficiados || 0} icon={<Baby />} />
          <StatCard
            label="Regalos Entregados"
            value={actividades.reduce((sum, act) => sum + (act.cantidad_regalos || 0), 0)}
            icon={<Gift />}
          />
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            Historial de Actividades
            {!isLoading && <span className={styles.count}>{filtered.length}</span>}
          </h2>
          {can(PERMISSIONS.ACTIVIDADES_CREATE) && (
            <button type="button" className="btn-primary btn-sm" onClick={() => {
              setActividadForm({ brigada_id: "", nombre: "", descripcion: "", cantidad_regalos: 0 });
              setIsActividadModalOpen(true);
            }}>
              <Plus aria-hidden="true" />
              Nueva Actividad
            </button>
          )}
        </div>

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

        {isLoading ? (
          <div className={styles.panelBody}>
            <div className={`${styles.skeleton} ${styles.skeletonBlock}`} />
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actividad</th>
                  <th>Brigada</th>
                  <th className={styles.num}>Regalos Entregados</th>
                  <th className={styles.num}>Niños Registrados</th>
                  <th className={styles.num}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className={styles.emptyCell}>No hay actividades registradas en esta brigada.</td></tr>
                ) : (
                  paginated.map(act => (
                    <tr key={act.id}>
                      <td className={styles.nowrap}>{new Date(act.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={styles.cellMain}>{act.nombre}</span>
                        {act.descripcion && <span className={styles.cellSub}>{act.descripcion}</span>}
                      </td>
                      <td>{act.brigadas?.nombre}</td>
                      <td className={styles.num}>{act.cantidad_regalos}</td>
                      <td className={`${styles.num} ${styles.cellMain}`}>{act.total_ninos}</td>
                      <td>
                        {can(PERMISSIONS.ACTIVIDADES_UPDATE) && (
                          <div className={styles.rowActions}>
                            <button type="button" className="btn-primary btn-xs" onClick={() => openParticipantesModal(act.id)}>
                              <Plus aria-hidden="true" />
                              Sumar Niños
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
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

      {/* Modal Nueva Actividad */}
      {isActividadModalOpen && (
        <AdminModal title="Crear Actividad Infantil" size="sm" onClose={() => setIsActividadModalOpen(false)}>
          <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); submitActividad(); }}>
            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>1. Vinculación y Datos de la Actividad</h3>

                <label className="form-field">
                  <span className="form-label">
                    Brigada Médica <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select className="form-input" value={actividadForm.brigada_id} onChange={e => setActividadForm({ ...actividadForm, brigada_id: e.target.value })} required>
                    <option value="" disabled>-- Seleccionar Brigada --</option>
                    {brigadas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">
                    Nombre de la Actividad Infantil <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input className="form-input" value={actividadForm.nombre} onChange={e => setActividadForm({ ...actividadForm, nombre: e.target.value })} placeholder="Ej. Piñata, dinámicas y taller de dibujo" required />
                </label>

                <label className="form-field">
                  <span className="form-label">
                    Descripción <span className="form-optional">(Opcional)</span>
                  </span>
                  <textarea className="form-input" rows={2} value={actividadForm.descripcion} onChange={e => setActividadForm({ ...actividadForm, descripcion: e.target.value })} placeholder="Descripción del programa de recreación..." />
                </label>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>2. Recursos y Entrega de Regalos</h3>

                <label className="form-field">
                  <span className="form-label">
                    Regalos / Juguetes Entregados <span className="form-optional">(Opcional)</span>
                  </span>
                  <input className="form-input" type="number" min="0" value={actividadForm.cantidad_regalos} onChange={e => setActividadForm({ ...actividadForm, cantidad_regalos: Number(e.target.value) })} />
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsActividadModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary btn-sm">Crear Actividad</button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Modal Sumar Niños */}
      {isParticipantesModalOpen && (
        <AdminModal
          title="Registrar Asistencia de Niños"
          description="Suma participantes a la actividad comunitaria sin registrar datos personales."
          size="sm"
          onClose={() => setIsParticipantesModalOpen(false)}
        >
          <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); submitParticipantes(); }}>
            <div className={styles.modalBody}>
              <label className="form-field">
                <span className="form-label">
                  Cantidad de Niños a Sumar <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input className="form-input" type="number" min="1" value={participantesForm.cantidad_ninos} onChange={e => setParticipantesForm({ ...participantesForm, cantidad_ninos: Number(e.target.value) })} required />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsParticipantesModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary btn-sm">Sumar a la Actividad</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
