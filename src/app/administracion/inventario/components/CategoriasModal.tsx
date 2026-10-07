"use client";

import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { Check, LoaderCircle, Pencil, Pill, Plus, Syringe, Tags, Tent, Trash2, X } from "lucide-react";
import type { CategoriaInventario, TipoRecurso } from "@/lib/db/inventario";
import {
  createCategoriaAction as createCategoria,
  updateCategoriaAction as updateCategoria,
  deleteCategoriaAction as deleteCategoria,
} from "../actions";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import EmptyState from "@/app/administracion/components/EmptyState";
import { useToast } from "@/app/administracion/components/AdminToast";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "@/styles/pages/admin.module.css";

// mismas pestañas que el filtro de la tabla de inventario
const TIPOS = [
  { id: "medicamento", label: "Fármacos", icon: <Pill aria-hidden="true" /> },
  { id: "insumo_medico", label: "Insumos", icon: <Syringe aria-hidden="true" /> },
  { id: "material_brigada", label: "Material Brigada", icon: <Tent aria-hidden="true" /> },
] as const;

type CategoriasModalProps = {
  categorias: CategoriaInventario[];
  /** pestaña abierta al entrar */
  tipoInicial: TipoRecurso;
  /** vuelve a cargar la lista después de agregar, renombrar o eliminar */
  onChanged: () => Promise<void>;
  onClose: () => void;
};

/** Inventario → Categorías: cada tipo de recurso con su propia lista. */
export function CategoriasModal({ categorias, tipoInicial, onChanged, onClose }: CategoriasModalProps) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<TipoRecurso>(tipoInicial);
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null);
  const [borrando, setBorrando] = useState<CategoriaInventario | null>(null);

  const tipoActual = TIPOS.find((t) => t.id === tipo)!;
  const lista = categorias.filter((c) => c.tipo_recurso === tipo);

  // ejecuta la acción; con éxito recarga la lista y avisa
  const guardar = (accion: () => Promise<{ error?: string }>, exito: string, despues?: () => void) =>
    startTransition(async () => {
      const res = await accion();
      if (res.error) return showToast(res.error, "error");
      await onChanged();
      despues?.();
      showToast(exito);
    });

  const agregar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nombre = nueva.trim();
    if (!nombre) return;
    guardar(() => createCategoria(nombre, tipo), `Categoría «${nombre}» agregada a ${tipoActual.label}.`, () =>
      setNueva("")
    );
  };

  const renombrar = () => {
    if (!editando) return;
    const nombre = editando.nombre.trim();
    const original = categorias.find((c) => c.id === editando.id);
    if (!nombre || nombre === original?.nombre) return setEditando(null);
    guardar(() => updateCategoria(editando.id, nombre), `Categoría renombrada a «${nombre}».`, () =>
      setEditando(null)
    );
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      renombrar();
    } else if (e.key === "Escape") {
      e.preventDefault(); // cancela la edición sin cerrar el modal
      setEditando(null);
    }
  };

  const eliminar = () => {
    if (!borrando) return;
    guardar(() => deleteCategoria(borrando.id), `Categoría «${borrando.nombre}» eliminada.`, () =>
      setBorrando(null)
    );
  };

  return (
    <>
      <AdminModal
        title="Categorías de inventario"
        description="Cada tipo de recurso tiene sus propias categorías. Al crear un recurso solo aparecen las de su tipo."
        icon={<Tags />}
        onClose={onClose}
        busy={isPending}
      >
        <div className={styles.tabs} role="tablist" aria-label="Tipo de recurso">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tipo === t.id}
              className={styles.tab}
              onClick={() => {
                setTipo(t.id);
                setEditando(null);
              }}
            >
              {t.icon}
              {t.label}
              <span className={styles.tabCount}>{categorias.filter((c) => c.tipo_recurso === t.id).length}</span>
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          {can(PERMISSIONS.INVENTARIO_CREATE) && (
            <form className={styles.inlineAdd} onSubmit={agregar}>
              <label className="sr-only" htmlFor="categoria-nueva">
                Nueva categoría de {tipoActual.label}
              </label>
              <input
                id="categoria-nueva"
                className="form-input form-input-sm"
                placeholder={`Nueva categoría de ${tipoActual.label.toLowerCase()}`}
                maxLength={100}
                autoComplete="off"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
              />
              <button type="submit" className="btn-primary btn-sm" disabled={isPending || !nueva.trim()}>
                {isPending && !editando && !borrando ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                Agregar
              </button>
            </form>
          )}

          {lista.length === 0 ? (
            <EmptyState icon={<Tags />} title={`Aún no hay categorías de ${tipoActual.label.toLowerCase()}`} dashed>
              Las que agregues aparecerán al crear un recurso de este tipo.
            </EmptyState>
          ) : (
            <ul className={styles.itemList}>
              {lista.map((c) => (
                <li key={c.id} className={styles.itemRow}>
                  {editando?.id === c.id ? (
                    <>
                      <span className={styles.itemText}>
                        <label className="sr-only" htmlFor="categoria-editando">
                          Nuevo nombre de {c.nombre}
                        </label>
                        <input
                          id="categoria-editando"
                          className="form-input form-input-sm"
                          maxLength={100}
                          autoComplete="off"
                          autoFocus
                          value={editando.nombre}
                          onChange={(e) => setEditando({ id: c.id, nombre: e.target.value })}
                          onKeyDown={onEditKeyDown}
                          disabled={isPending}
                        />
                      </span>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={renombrar}
                          disabled={isPending}
                          aria-label={`Guardar nombre de ${c.nombre}`}
                          title="Guardar"
                        >
                          {isPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setEditando(null)}
                          disabled={isPending}
                          aria-label="Cancelar"
                          title="Cancelar"
                        >
                          <X aria-hidden="true" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={styles.itemText}>
                        <span className={styles.cellMain}>{c.nombre}</span>
                        <span className={styles.cellSub}>
                          {c.recursos === 0 ? "Sin recursos" : c.recursos === 1 ? "1 recurso" : `${c.recursos} recursos`}
                        </span>
                      </span>
                      <div className={styles.rowActions}>
                        {can(PERMISSIONS.INVENTARIO_UPDATE) && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setEditando({ id: c.id, nombre: c.nombre })}
                            disabled={isPending}
                            aria-label={`Renombrar ${c.nombre}`}
                            title="Renombrar"
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        {can(PERMISSIONS.INVENTARIO_DELETE) && (
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => setBorrando(c)}
                            disabled={isPending || c.recursos > 0}
                            aria-label={`Eliminar ${c.nombre}`}
                            title={c.recursos > 0 ? "Tiene recursos: cámbialos de categoría para poder eliminarla" : "Eliminar"}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={isPending}>
            Listo
          </button>
        </div>
      </AdminModal>

      {borrando && (
        <ConfirmDialog
          title="¿Eliminar categoría?"
          confirmLabel="Sí, eliminar"
          busyLabel="Eliminando..."
          busy={isPending}
          onCancel={() => setBorrando(null)}
          onConfirm={eliminar}
        >
          La categoría <strong>{borrando.nombre}</strong> dejará de aparecer en {tipoActual.label}.
        </ConfirmDialog>
      )}
    </>
  );
}
