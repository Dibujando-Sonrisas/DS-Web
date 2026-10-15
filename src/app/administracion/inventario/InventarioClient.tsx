"use client";

import {
  Boxes,
  Layers,
  Lock,
  Pencil,
  Pill,
  Plus,
  Syringe,
  Tags,
  Tent,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { generateCleanToken } from "@/lib/coding/codingUtils";
import type { CategoriaInventario, TipoRecurso } from "@/lib/db/inventario";
import { errorInfo, getLogger } from "@/lib/logger";
import styles from "@/styles/pages/admin.module.css";
import {
  createMedicamentoAction as createMedicamento,
  deleteMedicamentoAction as deleteMedicamento,
  getCategoriasInventarioAction as getCategoriasInventario,
  getMedicamentosAction as getMedicamentos,
  updateMedicamentoAction as updateMedicamento,
} from "./actions";
import { CategoriasModal } from "./components/CategoriasModal";
import { LotesModal } from "./components/LotesModal";
import { MedicamentoForm } from "./components/MedicamentoForm";

const logger = getLogger("inventario", "client");

function generarCodigoRecurso(nombre: string, tipo: string): string {
  const prefijo =
    tipo === "insumo_medico"
      ? "INS"
      : tipo === "material_brigada"
        ? "MAT"
        : "MED";
  const tokenLimpio = generateCleanToken(5);
  return `INV-${prefijo}-${tokenLimpio}`;
}

export function InventarioClient({
  initialLotes = null,
}: {
  /** recurso cuyos lotes se abren al entrar */
  initialLotes?: { id: string; nombre: string } | null;
}) {
  const { can } = usePermissions();
  const [medicamentos, setMedicamentos] = useState<Record<string, unknown>[]>(
    []
  );
  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  // pestaña con la que se abre Categorías; null = cerrado
  const [categoriasTipo, setCategoriasTipo] = useState<TipoRecurso | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedLotes, setSelectedMedLotes] = useState(initialLotes);
  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | "medicamento" | "insumo_medico" | "material_brigada"
  >("todos");

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [selectedMedForEdit, setSelectedMedForEdit] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Delete Modal
  const [medToDelete, setMedToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMedicamentos = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMedicamentos(filtroTipo);
      setMedicamentos(data);
      logger.debug("Inventory loaded", { count: data?.length, filtroTipo });
    } catch (error) {
      logger.error("Inventory load failed", errorInfo(error));
    } finally {
      setIsLoading(false);
    }
  }, [filtroTipo]);

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await getCategoriasInventario();
      setCategorias(data);
    } catch (error) {
      logger.error("Inventory categories load failed", errorInfo(error));
    }
  }, []);

  // se recarga al montar y cada vez que cambia filtroTipo (fetchMedicamentos depende de él)
  useEffect(() => {
    fetchMedicamentos();
    fetchCategorias();
  }, [fetchMedicamentos, fetchCategorias]);

  // recarga al abrir: el conteo de recursos por categoría cambia al crear o borrar recursos
  const abrirCategorias = (tipo: TipoRecurso) => {
    setCategoriasTipo(tipo);
    fetchCategorias();
  };

  const handleOpenMedForm = (med: any = null) => {
    logger.debug("Resource form opened", {
      medicamentoId: med?.medicamento_id ?? med?.id ?? null,
    });
    setSelectedMedForEdit(med);
    setIsMedModalOpen(true);
  };

  const handleCloseMedForm = () => {
    setIsMedModalOpen(false);
    setSelectedMedForEdit(null);
  };

  const handleSubmitMed = async (data: any, cantidadInicial: number = 0) => {
    try {
      setIsSubmitting(true);

      const payload = { ...data };

      if (selectedMedForEdit) {
        // EDICIÓN: Conservar el código almacenado o el ingresado por el usuario. NO REGENERAR.
        payload.codigo =
          data.codigo ||
          selectedMedForEdit.codigo ||
          generarCodigoRecurso(payload.nombre, payload.tipo_recurso);
      } else {
        // CREACIÓN: Generar únicamente cuando es un nuevo recurso y no se ingresó código manual
        if (!payload.codigo || payload.codigo.trim() === "") {
          payload.codigo = generarCodigoRecurso(
            payload.nombre,
            payload.tipo_recurso
          );
        }
      }

      // Garantizar que la longitud final no exceda los 20 caracteres del campo varchar(20)
      if (payload.codigo && payload.codigo.length > 20) {
        payload.codigo = payload.codigo.substring(0, 20);
      }

      const targetId = selectedMedForEdit
        ? selectedMedForEdit.medicamento_id || selectedMedForEdit.id
        : null;

      // Depuración temporal requerida por las instrucciones
      logger.debug("Resource save submitted", {
        medicamentoId: targetId,
        isUpdate: Boolean(selectedMedForEdit && targetId),
      });

      if (selectedMedForEdit && targetId) {
        await updateMedicamento(targetId, payload);
      } else {
        await createMedicamento(payload, cantidadInicial);
      }

      handleCloseMedForm();
      fetchMedicamentos();
    } catch (error: any) {
      logger.error("Resource save failed", errorInfo(error));
      alert(error.message || "Error al guardar el recurso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!medToDelete) return;
    try {
      setIsDeleting(true);
      const targetId = medToDelete.medicamento_id || medToDelete.id;
      await deleteMedicamento(targetId);
      setMedToDelete(null);
      fetchMedicamentos();
    } catch (error: any) {
      logger.error("Resource deletion failed", {
        ...errorInfo(error),
        medicamentoId: medToDelete.medicamento_id || medToDelete.id,
      });
      alert(error.message || "Error al eliminar el recurso.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getTipoBadge = (tipo?: string) => {
    switch (tipo) {
      case "insumo_medico":
        return (
          <span className={`${styles.badge} ${styles.badgeBrand}`}>
            Insumo Médico
          </span>
        );
      case "material_brigada":
        return (
          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
            Material Brigada
          </span>
        );
      default:
        return (
          <span className={`${styles.badge} ${styles.badgeInfo}`}>
            Medicamento
          </span>
        );
    }
  };

  const getStockBadge = (estado: string) => {
    let tone = styles.badgeSuccess;
    if (estado === "Sin Existencias") {
      tone = styles.badgeDanger;
    } else if (estado === "Stock Bajo" || estado === "Stock Crítico") {
      tone = styles.badgeWarning;
    }

    return (
      <span className={`${styles.badge} ${styles.badgeDot} ${tone}`}>
        {estado}
      </span>
    );
  };

  const FILTROS = [
    { id: "todos", label: "Todos", icon: <Boxes aria-hidden="true" /> },
    { id: "medicamento", label: "Fármacos", icon: <Pill aria-hidden="true" /> },
    {
      id: "insumo_medico",
      label: "Insumos",
      icon: <Syringe aria-hidden="true" />,
    },
    {
      id: "material_brigada",
      label: "Material Brigada",
      icon: <Tent aria-hidden="true" />,
    },
  ] as const;

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>
              Gestión Global de Inventario
              {!isLoading && (
                <span className={styles.count}>{medicamentos.length}</span>
              )}
            </h2>
            <p className={styles.panelSub}>
              Control unificado de medicamentos, insumos médicos y material de
              brigadas
            </p>
          </div>

          <div className={styles.panelActions}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() =>
                abrirCategorias(
                  filtroTipo === "todos" ? "medicamento" : filtroTipo
                )
              }
            >
              <Tags aria-hidden="true" />
              Categorías
            </button>
            {can(PERMISSIONS.INVENTARIO_CREATE) ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => handleOpenMedForm()}
              >
                <Plus aria-hidden="true" />
                Nuevo Recurso
              </button>
            ) : (
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                <Lock aria-hidden="true" />
                Modo Solo Lectura
              </span>
            )}
          </div>
        </div>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Tipo de recurso"
        >
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtroTipo === f.id}
              className={styles.tab}
              onClick={() => setFiltroTipo(f.id)}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
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
                  <th>Tipo</th>
                  <th>Nombre del Recurso</th>
                  <th>Unidad</th>
                  <th className={styles.num}>Stock Mínimo</th>
                  <th className={styles.num}>Stock Total</th>
                  <th>Estado</th>
                  <th className={styles.num}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {medicamentos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      No hay recursos registrados en esta categoría de
                      inventario.
                    </td>
                  </tr>
                ) : (
                  medicamentos.map((med: any) => (
                    <tr key={med.medicamento_id || med.id}>
                      <td>{getTipoBadge(med.tipo_recurso)}</td>
                      {/* la descripción va bajo el nombre para que las acciones quepan sin desplazar */}
                      <td>
                        <span className={styles.cellMain}>{med.nombre}</span>
                        {med.descripcion && (
                          <span
                            className={`${styles.cellSub} ${styles.truncate}`}
                            title={med.descripcion}
                          >
                            {med.descripcion}
                          </span>
                        )}
                      </td>
                      <td>{med.unidad_medida || "-"}</td>
                      <td className={styles.num}>{med.stock_minimo}</td>
                      <td className={`${styles.num} ${styles.cellMain}`}>
                        {med.stock_total || 0}
                      </td>
                      <td>
                        {getStockBadge(med.estado_stock || "Sin Existencias")}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {can(PERMISSIONS.INVENTARIO_UPDATE) && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleOpenMedForm(med)}
                              aria-label={`Editar ${med.nombre}`}
                              title="Editar"
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-ghost btn-xs"
                            onClick={() =>
                              setSelectedMedLotes({
                                id: med.medicamento_id || med.id,
                                nombre: med.nombre,
                              })
                            }
                            aria-label={`Ver lotes de ${med.nombre}`}
                          >
                            <Layers aria-hidden="true" />
                            Ver Lotes
                          </button>
                          {can(PERMISSIONS.INVENTARIO_DELETE) && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              onClick={() => setMedToDelete(med)}
                              aria-label={`Eliminar ${med.nombre}`}
                              title="Eliminar"
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedMedLotes && (
        <LotesModal
          isOpen={true}
          onClose={() => setSelectedMedLotes(null)}
          medicamentoId={selectedMedLotes.id}
          medicamentoNombre={selectedMedLotes.nombre}
          onLotesChanged={fetchMedicamentos}
        />
      )}

      {isMedModalOpen && (
        <AdminModal
          title={
            selectedMedForEdit
              ? "Editar medicamento"
              : "Nuevo Medicamento o Insumo"
          }
          onClose={handleCloseMedForm}
          busy={isSubmitting}
        >
          <MedicamentoForm
            initialData={selectedMedForEdit}
            categorias={categorias}
            onSubmit={handleSubmitMed}
            onCancel={handleCloseMedForm}
            onManageCategorias={abrirCategorias}
            isLoading={isSubmitting}
          />
        </AdminModal>
      )}

      {/* después del formulario: si se abre desde ahí, queda encima */}
      {categoriasTipo && (
        <CategoriasModal
          categorias={categorias}
          tipoInicial={categoriasTipo}
          onChanged={fetchCategorias}
          onClose={() => setCategoriasTipo(null)}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {medToDelete && (
        <ConfirmDialog
          title="¿Eliminar Recurso?"
          confirmLabel="Sí, eliminar"
          busyLabel="Eliminando..."
          busy={isDeleting}
          onCancel={() => setMedToDelete(null)}
          onConfirm={handleDeleteConfirm}
        >
          Estás a punto de eliminar <strong>{medToDelete.nombre}</strong>. Esta
          acción borrará permanentemente todos sus lotes asociados y el
          historial de stock en este sistema.
        </ConfirmDialog>
      )}
    </div>
  );
}
