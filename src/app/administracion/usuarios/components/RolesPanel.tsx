"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CircleAlert,
  Info,
  LoaderCircle,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import type { RolDetalle } from "../page";
import { guardarRolAction, eliminarRolAction } from "../actions";
import type { RolTono } from "@/lib/auth/session";
import {
  ACTION_LABELS,
  ALL_PERMISSIONS,
  IMPLICIT_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_MODULES,
  SPECIAL_PERMISSION_LABELS,
  STANDARD_ACTIONS,
  type Permission,
} from "@/lib/auth/permissions";
import AdminModal from "../../components/AdminModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import RoleBadge from "../../components/RoleBadge";
import { useToast } from "../../components/AdminToast";
import { usePermissions } from "../../components/PermissionsProvider";
import styles from "@/styles/pages/admin.module.css";
import rs from "@/styles/pages/admin-roles.module.css";

/* ── DATOS DE APOYO ── */

const TONOS: { id: RolTono; label: string }[] = [
  { id: "neutral", label: "Gris" },
  { id: "info", label: "Azul" },
  { id: "success", label: "Verde" },
  { id: "warning", label: "Naranja" },
  { id: "danger", label: "Rojo" },
  { id: "brand", label: "Amarillo" },
];

// el punto de la lista usa la tinta del mismo tono que el badge
const TONO_PUNTO: Record<RolTono, string> = {
  brand: "var(--secondaryColor)",
  info: "var(--info-ink)",
  success: "var(--ok-ink)",
  warning: "var(--warn-ink)",
  danger: "var(--bad-ink)",
  neutral: "var(--muted-ink)",
};

type Fila = {
  id: string;
  label: string;
  estandar: (Permission | null)[];
  otros: Permission[];
};

// filas de la matriz: un módulo por fila; los permisos nuevos del catálogo aparecen solos
const FILAS: Fila[] = (() => {
  const modulos = [...PERMISSION_MODULES];
  for (const p of ALL_PERMISSIONS) {
    const id = p.split(".")[0];
    if (!modulos.some((m) => m.id === id)) modulos.push({ id, label: id });
  }
  return modulos
    .map((m) => {
      const propios = ALL_PERMISSIONS.filter((p) => p.split(".")[0] === m.id);
      return {
        ...m,
        estandar: STANDARD_ACTIONS.map((a) => propios.find((p) => p === `${m.id}.${a}`) ?? null),
        otros: propios.filter(
          (p) => !(STANDARD_ACTIONS as readonly string[]).includes(p.split(".")[1])
        ),
      };
    })
    .filter((f) => f.estandar.some(Boolean) || f.otros.length > 0);
})();

type Draft = {
  nombre: string;
  descripcion: string;
  color: RolTono;
  predeterminado: boolean;
  permisos: Permission[];
};

const DRAFT_NUEVO: Draft = {
  nombre: "",
  descripcion: "",
  color: "neutral",
  predeterminado: false,
  permisos: [...IMPLICIT_PERMISSIONS],
};

function toDraft(rol: RolDetalle | null): Draft {
  if (!rol) return DRAFT_NUEVO;
  return {
    nombre: rol.nombre,
    descripcion: rol.descripcion ?? "",
    color: rol.color,
    predeterminado: rol.es_predeterminado,
    permisos: [...rol.permisos].sort(),
  };
}

function mismoDraft(a: Draft, b: Draft) {
  const pa = [...a.permisos].sort().join();
  const pb = [...b.permisos].sort().join();
  return (
    a.nombre.trim() === b.nombre.trim() &&
    a.descripcion.trim() === b.descripcion.trim() &&
    a.color === b.color &&
    a.predeterminado === b.predeterminado &&
    pa === pb
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/* ── PESTAÑA ROLES ── */

export default function RolesPanel({ roles }: { roles: RolDetalle[] }) {
  const { can, role: myRole, permissions: myPerms } = usePermissions();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement>(null);

  // "nuevo" = formulario de creación
  const [selectedId, setSelectedId] = useState<string>(roles[0]?.id ?? "nuevo");
  const selected = selectedId === "nuevo" ? null : roles.find((r) => r.id === selectedId) ?? null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(selected));
  const inicial = useMemo(() => toDraft(selected), [selected]);
  const dirty = !mismoDraft(draft, inicial);

  const [pendingSelect, setPendingSelect] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RolDetalle | null>(null);
  const [errors, setErrors] = useState<{ nombre?: string; descripcion?: string; general?: string }>({});

  const esNuevo = selectedId === "nuevo";
  const esPropio = !!selected && selected.id === myRole.id && !myRole.es_superadmin;
  const superadminAjeno = !!selected?.es_superadmin && !myRole.es_superadmin;
  const puedeEditar = (esNuevo ? can(PERMISSIONS.ROLES_CREATE) : can(PERMISSIONS.ROLES_UPDATE)) && !esPropio && !superadminAjeno;
  const permisosBloqueados = !puedeEditar || !!selected?.es_superadmin;
  const puedeEliminar =
    !!selected && can(PERMISSIONS.ROLES_DELETE) && !selected.es_superadmin && !selected.es_predeterminado && !esPropio;

  const otorgable = (p: Permission) => myRole.es_superadmin || myPerms.includes(p);
  const marcado = (p: Permission) => !!selected?.es_superadmin || draft.permisos.includes(p);
  const bloqueado = (p: Permission) =>
    permisosBloqueados || IMPLICIT_PERMISSIONS.includes(p) || (!otorgable(p) && !draft.permisos.includes(p));

  const seleccionar = (id: string) => {
    setSelectedId(id);
    setDraft(toDraft(id === "nuevo" ? null : roles.find((r) => r.id === id) ?? null));
    setErrors({});
    // en pantallas angostas el editor queda debajo de la lista
    if (window.matchMedia("(max-width: 1099px)").matches) {
      requestAnimationFrame(() => editorRef.current?.scrollIntoView({ block: "start" }));
    }
  };

  const pedirSeleccion = (id: string) => {
    if (id === selectedId) return;
    if (dirty) setPendingSelect(id);
    else seleccionar(id);
  };

  const togglePermiso = (p: Permission, on: boolean) => {
    setDraft((d) => ({
      ...d,
      permisos: on ? [...new Set([...d.permisos, p])] : d.permisos.filter((x) => x !== p),
    }));
  };

  const toggleModulo = (fila: Fila, on: boolean) => {
    const editables = [...fila.estandar.filter(Boolean), ...fila.otros].filter(
      (p): p is Permission => !!p && !bloqueado(p) && (on ? otorgable(p) : true)
    );
    setDraft((d) => ({
      ...d,
      permisos: on
        ? [...new Set([...d.permisos, ...editables])]
        : d.permisos.filter((x) => !editables.includes(x)),
    }));
  };

  const validar = () => {
    const e: typeof errors = {};
    const nombre = draft.nombre.trim();
    if (nombre.length < 2) e.nombre = "Escribe un nombre de al menos 2 caracteres.";
    else if (nombre.length > 60) e.nombre = "El nombre admite hasta 60 caracteres.";
    else if (roles.some((r) => r.id !== selected?.id && r.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      e.nombre = `Ya existe un rol llamado "${nombre}".`;
    }
    if (draft.descripcion.trim().length > 240) e.descripcion = "La descripción admite hasta 240 caracteres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    startTransition(async () => {
      const res = await guardarRolAction({
        id: selected?.id ?? null,
        nombre: draft.nombre,
        descripcion: draft.descripcion,
        color: draft.color,
        predeterminado: draft.predeterminado,
        permisos: draft.permisos,
      });
      if (res?.error || !res?.id) {
        setErrors({ general: res?.error ?? "No se pudo guardar el rol." });
        showToast(res?.error ?? "No se pudo guardar el rol.", "error");
        return;
      }
      showToast(res.message ?? "Rol guardado.", "success");
      setErrors({});
      setSelectedId(res.id);
      setDraft({
        ...draft,
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        permisos: [...new Set([...draft.permisos, ...IMPLICIT_PERMISSIONS])].sort(),
      });
    });
  };

  const totalMarcados = selected?.es_superadmin ? ALL_PERMISSIONS.length : draft.permisos.length;
  const titulo = esNuevo ? "Nuevo rol" : selected?.nombre ?? "Rol";

  return (
    <div className={rs.layout}>
      {/* Lista de roles */}
      <section className={`${styles.panel} ${rs.listPanel}`} aria-labelledby="roles-lista">
        <div className={styles.panelHeader}>
          <h2 id="roles-lista" className={styles.panelTitle}>
            Roles <span className={styles.count}>{roles.length}</span>
          </h2>
          {can(PERMISSIONS.ROLES_CREATE) && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => pedirSeleccion("nuevo")}
              disabled={esNuevo}
            >
              <Plus aria-hidden="true" />
              Nuevo rol
            </button>
          )}
        </div>

        {roles.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="Aún no hay roles">
            Crea el primero para asignarlo a los miembros.
          </EmptyState>
        ) : (
          <ul className={rs.roleList}>
            {roles.map((rol) => (
              <li key={rol.id}>
                <button
                  type="button"
                  className={rs.roleItem}
                  aria-current={rol.id === selectedId ? "true" : undefined}
                  onClick={() => pedirSeleccion(rol.id)}
                >
                  <span className={rs.roleDot} style={{ background: TONO_PUNTO[rol.color] }} aria-hidden="true" />
                  <span className={rs.roleText}>
                    <span className={rs.roleName}>{rol.nombre}</span>
                    <span className={rs.roleMeta}>
                      {plural(rol.usuarios, "usuario", "usuarios")} ·{" "}
                      {rol.es_superadmin ? "todos los permisos" : plural(rol.permisos.length, "permiso", "permisos")}
                    </span>
                    {(rol.es_superadmin || rol.es_predeterminado) && (
                      <span className={rs.roleFlags}>
                        {rol.es_superadmin && (
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            <Lock aria-hidden="true" />
                            Protegido
                          </span>
                        )}
                        {rol.es_predeterminado && (
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            <UserPlus aria-hidden="true" />
                            Usuarios nuevos
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editor del rol seleccionado */}
      {(selected || esNuevo) && (
        <section ref={editorRef} className={`${styles.panel} ${rs.editor}`} aria-labelledby="rol-editor">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="rol-editor" className={styles.panelTitle}>
                {titulo}
              </h2>
              {!esNuevo && selected && (
                <p className={styles.panelSub}>
                  {plural(selected.usuarios, "miembro tiene", "miembros tienen")} este rol.
                </p>
              )}
            </div>
            {puedeEliminar && (
              <div className={styles.panelActions}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setDeleteTarget(selected)}
                  disabled={isPending}
                >
                  <Trash2 aria-hidden="true" />
                  Eliminar rol
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (puedeEditar && dirty) guardar();
            }}
          >
            <div className={`${styles.panelBody} ${styles.stack} ${rs.editorBody}`}>
              {/* Por qué no se puede editar, si es el caso */}
              {selected?.es_superadmin && (
                <p className="notice">
                  <Info aria-hidden="true" />
                  <span>
                    El Administrador tiene <strong>todos los permisos</strong>, también los de apartados que se agreguen
                    en el futuro. No se puede eliminar ni quitarle permisos.
                  </span>
                </p>
              )}
              {esPropio && (
                <p className="notice notice-warn">
                  <Lock aria-hidden="true" />
                  <span>Este es tu rol. Para evitar que alguien se dé más acceso, otro usuario debe editarlo.</span>
                </p>
              )}
              {!esNuevo && !can(PERMISSIONS.ROLES_UPDATE) && !esPropio && (
                <p className="notice notice-warn">
                  <Lock aria-hidden="true" />
                  <span>Modo solo lectura: no tienes permiso para editar roles.</span>
                </p>
              )}
              {errors.general && (
                <p className="form-error form-alert" role="alert">
                  <CircleAlert aria-hidden="true" />
                  {errors.general}
                </p>
              )}

              <fieldset className={styles.formSection} disabled={!puedeEditar || isPending}>
                <h3 className={styles.formSectionTitle}>Datos del rol</h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="form-label">
                      Nombre <span className="form-required">*</span>
                    </span>
                    <input
                      className="form-input"
                      value={draft.nombre}
                      maxLength={60}
                      onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                      placeholder="Ej. Voluntario de Farmacia"
                      aria-invalid={!!errors.nombre}
                    />
                    {errors.nombre && (
                      <span className="form-error">
                        <CircleAlert aria-hidden="true" />
                        {errors.nombre}
                      </span>
                    )}
                  </label>

                  <div className="form-field">
                    <span className="form-label" id="rol-color">
                      Color de la etiqueta
                    </span>
                    <div className={rs.tones} role="radiogroup" aria-labelledby="rol-color">
                      {TONOS.map((t) => (
                        <label key={t.id} className={rs.tone} title={t.label}>
                          <input
                            type="radio"
                            name="rol-color"
                            value={t.id}
                            checked={draft.color === t.id}
                            onChange={() => setDraft({ ...draft, color: t.id })}
                            aria-label={t.label}
                          />
                          <RoleBadge role={{ nombre: draft.nombre.trim() || "Rol", color: t.id }} />
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="form-field form-field-full">
                    <span className="form-label">
                      Descripción <span className="form-optional">(opcional)</span>
                    </span>
                    <textarea
                      className="form-input"
                      rows={2}
                      maxLength={240}
                      value={draft.descripcion}
                      onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                      placeholder="Para qué sirve este rol y a quién se asigna."
                      aria-invalid={!!errors.descripcion}
                    />
                    <span className="form-hint">{draft.descripcion.trim().length}/240</span>
                    {errors.descripcion && (
                      <span className="form-error">
                        <CircleAlert aria-hidden="true" />
                        {errors.descripcion}
                      </span>
                    )}
                  </label>

                  {!selected?.es_superadmin && (
                    <div className="form-field form-field-full">
                      <label className="form-check">
                        <input
                          type="checkbox"
                          checked={draft.predeterminado}
                          disabled={!!selected?.es_predeterminado}
                          onChange={(e) => setDraft({ ...draft, predeterminado: e.target.checked })}
                        />
                        Asignar a los usuarios nuevos
                      </label>
                      <span className="form-hint">
                        {selected?.es_predeterminado
                          ? "Es el rol de quien se registra. Para cambiarlo, marca otro rol como predeterminado."
                          : "Quien se registre recibirá este rol. Solo un rol puede serlo; el anterior deja de serlo."}
                      </span>
                    </div>
                  )}
                </div>
              </fieldset>

              <section className={styles.formSection} aria-labelledby="rol-permisos">
                <div className={rs.matrixHead}>
                  <h3 id="rol-permisos" className={styles.formSectionTitle}>
                    Permisos
                  </h3>
                  <span className={rs.matrixCount}>
                    {totalMarcados} de {ALL_PERMISSIONS.length} seleccionados
                  </span>
                </div>
                {!myRole.es_superadmin && puedeEditar && (
                  <p className="form-hint">Solo puedes otorgar los permisos que tú mismo tienes.</p>
                )}

                <div className={`${styles.tableWrap} ${rs.matrixWrap}`}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Módulo</th>
                        {STANDARD_ACTIONS.map((a) => (
                          <th key={a} scope="col" className={rs.check}>
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                        <th scope="col">Otros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILAS.map((fila) => {
                        const todos = [...fila.estandar.filter(Boolean), ...fila.otros] as Permission[];
                        const n = todos.filter(marcado).length;
                        const toggleables = todos.filter((p) => !bloqueado(p));
                        return (
                          <tr key={fila.id}>
                            <td>
                              <label className={rs.moduleToggle}>
                                <input
                                  type="checkbox"
                                  checked={n === todos.length}
                                  ref={(el) => {
                                    if (el) el.indeterminate = n > 0 && n < todos.length;
                                  }}
                                  disabled={toggleables.length === 0}
                                  onChange={(e) => toggleModulo(fila, e.target.checked)}
                                  aria-label={`Todos los permisos de ${fila.label}`}
                                />
                                <span>
                                  {fila.label}{" "}
                                  <span className={rs.moduleCount}>
                                    {n}/{todos.length}
                                  </span>
                                </span>
                              </label>
                            </td>
                            {fila.estandar.map((p, i) =>
                              p ? (
                                <td key={p} className={rs.check}>
                                  <label
                                    className={rs.cellToggle}
                                    title={
                                      IMPLICIT_PERMISSIONS.includes(p)
                                        ? "Siempre incluido: sin él no se puede entrar al panel"
                                        : !otorgable(p) && !permisosBloqueados
                                          ? "No puedes otorgar un permiso que no tienes"
                                          : undefined
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={marcado(p)}
                                      disabled={bloqueado(p)}
                                      onChange={(e) => togglePermiso(p, e.target.checked)}
                                      aria-label={`${ACTION_LABELS[STANDARD_ACTIONS[i]]} · ${fila.label}`}
                                    />
                                  </label>
                                </td>
                              ) : (
                                <td key={`${fila.id}-${i}`} className={rs.check}>
                                  <span className={rs.na} aria-label="No aplica">
                                    —
                                  </span>
                                </td>
                              )
                            )}
                            <td>
                              {fila.otros.length === 0 ? (
                                <span className={rs.na} aria-label="No aplica">
                                  —
                                </span>
                              ) : (
                                fila.otros.map((p) => (
                                  <label key={p} className={rs.special}>
                                    <input
                                      type="checkbox"
                                      checked={marcado(p)}
                                      disabled={bloqueado(p)}
                                      onChange={(e) => togglePermiso(p, e.target.checked)}
                                    />
                                    {SPECIAL_PERMISSION_LABELS[p] ?? p.split(".")[1]}
                                  </label>
                                ))
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {puedeEditar && (
              <div className={`${styles.panelFooter} ${rs.saveBar}`}>
                <span className={`${rs.saveState} ${dirty ? rs.saveStateDirty : ""}`} role="status">
                  {esNuevo ? "Rol sin crear" : dirty ? "Cambios sin guardar" : "Sin cambios"}
                </span>
                <div className={rs.saveActions}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => (esNuevo ? seleccionar(roles[0]?.id ?? "nuevo") : setDraft(inicial))}
                    disabled={isPending || (!esNuevo && !dirty)}
                  >
                    {esNuevo ? "Cancelar" : "Descartar"}
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={isPending || !dirty}>
                    {isPending && <LoaderCircle className="spin" aria-hidden="true" />}
                    {isPending ? "Guardando..." : esNuevo ? "Crear rol" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Cambiar de rol con cambios sin guardar */}
      {pendingSelect && (
        <ConfirmDialog
          title="¿Descartar los cambios?"
          confirmLabel="Descartar cambios"
          cancelLabel="Seguir editando"
          onCancel={() => setPendingSelect(null)}
          onConfirm={() => {
            const id = pendingSelect;
            setPendingSelect(null);
            seleccionar(id);
          }}
        >
          Tienes cambios sin guardar en <strong>{titulo}</strong>. Si continúas, se perderán.
        </ConfirmDialog>
      )}

      {deleteTarget && (
        <EliminarRolDialog
          rol={deleteTarget}
          roles={roles}
          puedeAsignarAdmin={myRole.es_superadmin}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            const siguiente = roles.find((r) => r.id !== deleteTarget.id);
            seleccionar(siguiente?.id ?? "nuevo");
          }}
        />
      )}
    </div>
  );
}

/* ── ELIMINAR ROL (con reasignación de sus usuarios) ── */

function EliminarRolDialog({
  rol,
  roles,
  puedeAsignarAdmin,
  onCancel,
  onDeleted,
}: {
  rol: RolDetalle;
  roles: RolDetalle[];
  puedeAsignarAdmin: boolean;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const destinos = roles.filter((r) => r.id !== rol.id);
  const [destinoId, setDestinoId] = useState(
    (destinos.find((r) => r.es_predeterminado) ?? destinos.find((r) => !r.es_superadmin))?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const eliminar = () => {
    startTransition(async () => {
      const res = await eliminarRolAction(rol.id, rol.usuarios > 0 ? destinoId : null);
      if (res?.error) {
        setError(res.error);
        showToast(res.error, "error");
        return;
      }
      showToast(res?.message ?? "Rol eliminado.", "success");
      onDeleted();
    });
  };

  return (
    <AdminModal
      title={`¿Eliminar el rol ${rol.nombre}?`}
      onClose={onCancel}
      size="sm"
      role="alertdialog"
      busy={isPending}
      icon={<TriangleAlert />}
      iconTone="tertiary"
    >
      <form
        className={styles.modalForm}
        onSubmit={(e) => {
          e.preventDefault();
          eliminar();
        }}
      >
        <div className={styles.modalBody}>
          {rol.usuarios > 0 ? (
            <>
              <p>
                <strong>{plural(rol.usuarios, "miembro tiene", "miembros tienen")}</strong> este rol. Antes de
                eliminarlo, elige qué rol tendrán.
              </p>
              <label className="form-field">
                <span className="form-label">Pasar sus miembros a</span>
                <select
                  className="form-input"
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  disabled={isPending}
                  required
                >
                  {destinos.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.es_superadmin && !puedeAsignarAdmin}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p>Ningún miembro tiene este rol.</p>
          )}
          <p>Esta acción no se puede deshacer.</p>
          {error && (
            <p className="form-error form-alert" role="alert">
              <CircleAlert aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-danger btn-sm"
            disabled={isPending || (rol.usuarios > 0 && !destinoId)}
          >
            {isPending && <LoaderCircle className="spin" aria-hidden="true" />}
            {isPending ? "Eliminando..." : "Eliminar rol"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
