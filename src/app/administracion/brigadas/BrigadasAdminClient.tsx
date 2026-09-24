"use client";

import { useState, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, ClipboardList, Lock, Pencil, Plus, Tent, UserPlus, Wallet } from "lucide-react";
import type { Brigada, EstadoBrigada } from "@/lib/db/brigadas";
import {
  crearBrigada,
  editarBrigada,
  eliminarBrigada,
  registrarGasto,
  actualizarPresupuesto,
  aceptarInscripcion,
  rechazarInscripcion,
  asignarVoluntario,
} from "./actions";
import BrigadasTable from "./components/BrigadasTable";
import BrigadaForm from "./components/BrigadaForm";
import PresupuestoCard from "./components/PresupuestoCard";
import GastosTable, { GastoRow } from "./components/GastosTable";
import InscripcionesTable, { InscripcionRow } from "./components/InscripcionesTable";
import AsignacionesTable, { PerfilRow } from "./components/AsignacionesTable";
import GaleriaUploader from "./components/GaleriaUploader";
import GaleriaPreview, { BrigadaImagenRow } from "./components/GaleriaPreview";
import AdminToast, { type ToastState } from "@/app/administracion/components/AdminToast";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import EmptyState from "@/app/administracion/components/EmptyState";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

type TabName = "finanzas" | "inscripciones" | "asignaciones" | "galeria";

const TABS: { id: TabName; label: string; icon: ReactNode }[] = [
  { id: "finanzas", label: "Finanzas", icon: <Wallet aria-hidden="true" /> },
  { id: "inscripciones", label: "Solicitudes", icon: <ClipboardList aria-hidden="true" /> },
  { id: "asignaciones", label: "Asignar Personal", icon: <UserPlus aria-hidden="true" /> },
  { id: "galeria", label: "Fotografías", icon: <Camera aria-hidden="true" /> },
];

type BrigadasAdminClientProps = {
  initialBrigadas: Brigada[];
  initialBudgets: { id: string; brigada_id: string; presupuesto_estimado: number }[];
  initialExpenses: GastoRow[];
  initialRegistrations: InscripcionRow[];
  initialAssignments: { id: string; brigada_id: string; perfil_id: string; area_asignada: string }[];
  initialProfiles: PerfilRow[];
  initialImages: BrigadaImagenRow[];
  fetchError: string | null;
};

export default function BrigadasAdminClient({
  initialBrigadas,
  initialBudgets,
  initialExpenses,
  initialRegistrations,
  initialAssignments,
  initialProfiles,
  initialImages,
  fetchError,
}: BrigadasAdminClientProps) {
  const { can } = usePermissions();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBrigadas.length > 0 ? initialBrigadas[0].id : null
  );
  const [activeTab, setActiveTab] = useState<TabName>("finanzas");

  // Modals / Dialog state
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingBrigada, setEditingBrigada] = useState<Brigada | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brigada | null>(null);

  // Transitions
  const [isPending, startActionTransition] = useTransition();

  // Toast notifications
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Maps / Memoized values for summary calculations
  const budgetsMap = useMemo(() => {
    const map: Record<string, number> = {};
    initialBudgets.forEach((b) => {
      map[b.brigada_id] = b.presupuesto_estimado || 0;
    });
    return map;
  }, [initialBudgets]);

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    initialExpenses.forEach((e) => {
      map[e.brigada_id] = (map[e.brigada_id] || 0) + (e.monto || 0);
    });
    return map;
  }, [initialExpenses]);

  const registrationsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    initialRegistrations.forEach((r) => {
      map[r.brigada_id] = (map[r.brigada_id] || 0) + 1;
    });
    return map;
  }, [initialRegistrations]);

  // Find active selected brigade
  const activeBrigada = useMemo(() => {
    return initialBrigadas.find((b) => b.id === selectedId) || null;
  }, [initialBrigadas, selectedId]);

  const isReadOnly = activeBrigada?.estado === "finalizada";

  // Filtered lists for the active selected brigade
  const activeExpenses = useMemo(() => {
    if (!selectedId) return [];
    return initialExpenses.filter((e) => e.brigada_id === selectedId);
  }, [initialExpenses, selectedId]);

  const activeRegistrations = useMemo(() => {
    if (!selectedId) return [];
    return initialRegistrations.filter((r) => r.brigada_id === selectedId);
  }, [initialRegistrations, selectedId]);

  const activeAssignmentsMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (selectedId) {
      initialAssignments
        .filter((a) => a.brigada_id === selectedId)
        .forEach((a) => {
          map[a.perfil_id] = a.area_asignada;
        });
    }
    return map;
  }, [initialAssignments, selectedId]);

  const activeImages = useMemo(() => {
    if (!selectedId) return [];
    return initialImages.filter((img) => img.brigada_id === selectedId);
  }, [initialImages, selectedId]);

  const closeModal = () => {
    setModalMode(null);
    setEditingBrigada(null);
  };

  // 1. Create Brigade Submit Handler
  const handleCreateBrigada = async (data: Parameters<typeof crearBrigada>[0]) => {
    startActionTransition(async () => {
      const res = await crearBrigada(data);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Brigada creada y presupuesto inicializado con éxito.", "success");
        closeModal();
        if (res.id) setSelectedId(res.id);
        router.refresh();
      }
    });
  };

  // 2. Edit Brigade Submit Handler
  const handleEditBrigada = async (data: Parameters<typeof editarBrigada>[1] & { id?: string }) => {
    const targetId = data.id || editingBrigada?.id;
    if (!targetId) {
      showToast("No se pudo identificar la brigada a editar.", "error");
      return;
    }
    startActionTransition(async () => {
      const res = await editarBrigada(targetId, data);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Brigada actualizada correctamente.", "success");
        closeModal();
        router.refresh();
      }
    });
  };

  // 3. Delete Brigade Confirm Handler
  const handleDeleteBrigada = async () => {
    if (!deleteTarget) return;
    startActionTransition(async () => {
      const res = await eliminarBrigada(deleteTarget.id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Brigada eliminada con éxito.", "success");
        setDeleteTarget(null);
        // Select first available or null
        const remaining = initialBrigadas.filter((b) => b.id !== deleteTarget.id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    });
  };

  // 4. Update Budget Action
  const handleUpdateBudget = async (newAmount: number) => {
    if (!selectedId) return;
    const res = await actualizarPresupuesto(selectedId, newAmount);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Presupuesto inicial actualizado.", "success");
    }
  };

  // 5. Gasto Save Action (insert, update, delete)
  const handleSaveGasto = async (gasto: Omit<GastoRow, "id"> & { id?: string }, isDelete = false) => {
    const res = await registrarGasto(gasto, isDelete);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(
        isDelete
          ? "Gasto eliminado con éxito."
          : gasto.id
            ? "Gasto actualizado con éxito."
            : "Gasto registrado con éxito.",
        "success"
      );
    }
  };

  // 6. Accept Registration
  const handleAcceptRegistration = async (id: string) => {
    const res = await aceptarInscripcion(id);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Solicitud aceptada.", "success");
    }
  };

  // 7. Reject Registration
  const handleRejectRegistration = async (id: string) => {
    const res = await rechazarInscripcion(id);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Solicitud rechazada.", "success");
    }
  };

  // 8. Assign Volunteer to Area
  const handleAssignVolunteer = async (perfilId: string, area: string | null) => {
    if (!selectedId) return;
    const res = await asignarVoluntario(selectedId, perfilId, area);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(area ? "Área asignada correctamente." : "Asignación removida.", "success");
    }
  };

  // Status badges labels/colors
  const ESTADO_LABELS: Record<EstadoBrigada, string> = {
    inscripciones_abiertas: "Inscripciones Abiertas",
    inscripciones_cerradas: "Inscripciones Cerradas",
    finalizada: "Finalizada (Solo Consulta)",
    cancelada: "Cancelada",
  };

  const ESTADO_CLASSES: Record<EstadoBrigada, string> = {
    inscripciones_abiertas: styles.badgeInfo,
    inscripciones_cerradas: styles.badgeNeutral,
    finalizada: styles.badgeNeutral,
    cancelada: styles.badgeDanger,
  };

  return (
    <div className={styles.stack}>
      <AdminToast toast={toast} />

      {fetchError && (
        <p className="notice notice-bad" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>
            <strong>Error de Carga:</strong> {fetchError}
          </span>
        </p>
      )}

      {/* 1. Tabla de listado y filtros */}
      <BrigadasTable
        actions={
          can(PERMISSIONS.BRIGADAS_CREATE) && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                setEditingBrigada(null);
                setModalMode("create");
              }}
            >
              <Plus aria-hidden="true" />
              Nueva Brigada
            </button>
          )
        }
        brigadas={initialBrigadas}
        budgets={budgetsMap}
        spent={spentMap}
        registrationsCount={registrationsCountMap}
        selectedBrigadaId={selectedId}
        onSelect={setSelectedId}
        onEdit={(b) => {
          setEditingBrigada(b);
          setModalMode("edit");
        }}
        onDelete={setDeleteTarget}
      />

      {/* 2. Sección de Detalles y Gestión del Evento Seleccionado */}
      {activeBrigada ? (
        <section className={styles.panel} aria-labelledby="brigada-detalle">
          <div className={styles.panelHeader}>
            <h2 id="brigada-detalle" className={styles.panelTitle}>
              {activeBrigada.nombre} ({activeBrigada.codigo})
            </h2>
            <div className={styles.panelActions}>
              <span className={`${styles.badge} ${ESTADO_CLASSES[activeBrigada.estado]}`}>
                {ESTADO_LABELS[activeBrigada.estado]}
              </span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setEditingBrigada(activeBrigada);
                  setModalMode("edit");
                }}
              >
                <Pencil aria-hidden="true" />
                Editar Información
              </button>
            </div>
          </div>

          {/* Aviso de solo lectura */}
          {isReadOnly && (
            <p className={`notice notice-warn ${brig.detailNotice}`}>
              <Lock aria-hidden="true" />
              <span>
                <strong>Brigada Finalizada:</strong> Esta brigada se encuentra en modo de consulta. No se pueden realizar modificaciones en finanzas, voluntarios, galería ni permitir inscripciones.
              </span>
            </p>
          )}

          <div className={styles.tabs} role="tablist" aria-label="Gestión de la brigada">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={styles.tab}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.panelBody}>
            {activeTab === "finanzas" && (
              <div className={styles.stack}>
                <PresupuestoCard
                  presupuestoEstimado={budgetsMap[activeBrigada.id] ?? 0}
                  presupuestoEjecutado={spentMap[activeBrigada.id] ?? 0}
                  onUpdateBudget={handleUpdateBudget}
                  isReadOnly={isReadOnly}
                />
                <GastosTable
                  brigadaId={activeBrigada.id}
                  gastos={activeExpenses}
                  onSaveGasto={handleSaveGasto}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}

            {activeTab === "inscripciones" && (
              <InscripcionesTable
                inscripciones={activeRegistrations}
                profiles={initialProfiles}
                assignments={activeAssignmentsMap}
                onAccept={handleAcceptRegistration}
                onReject={handleRejectRegistration}
                onAssign={handleAssignVolunteer}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === "asignaciones" && (
              <AsignacionesTable
                profiles={initialProfiles}
                assignments={activeAssignmentsMap}
                onAssign={handleAssignVolunteer}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === "galeria" && (
              <div className={styles.stack}>
                <GaleriaUploader
                  brigadaId={activeBrigada.id}
                  brigadaCodigo={activeBrigada.codigo}
                  existingImages={activeImages}
                  onUploadSuccess={() => router.refresh()}
                  isReadOnly={isReadOnly}
                />
                <GaleriaPreview
                  brigadaId={activeBrigada.id}
                  brigadaCodigo={activeBrigada.codigo}
                  imagenes={activeImages}
                  onReload={() => router.refresh()}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        </section>
      ) : (
        <EmptyState dashed icon={<Tent />} title="No hay brigadas registradas">
          Haz clic en &quot;+ Nueva Brigada&quot; para registrar la primera.
        </EmptyState>
      )}

      {/* 3. Form Modal */}
      {modalMode && (
        <BrigadaForm
          mode={modalMode}
          brigada={editingBrigada || undefined}
          initialBudget={editingBrigada ? budgetsMap[editingBrigada.id] ?? 0 : 0}
          onClose={closeModal}
          onSubmit={modalMode === "create" ? handleCreateBrigada : (handleEditBrigada as any)}
          isSubmitting={isPending}
        />
      )}

      {/* 4. Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar Brigada?"
          confirmLabel="Sí, eliminar"
          busyLabel="Eliminando..."
          busy={isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteBrigada}
        >
          ¿Estás seguro de que deseas eliminar la brigada{" "}
          <strong>
            {deleteTarget.codigo} — {deleteTarget.nombre}
          </strong>
          ? Se eliminarán todos los presupuestos, gastos, solicitudes y asignaciones relacionadas. Esta acción
          no se puede deshacer.
        </ConfirmDialog>
      )}
    </div>
  );
}
