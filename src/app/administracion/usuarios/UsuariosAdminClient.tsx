"use client";

import { useState, useTransition } from "react";
import type { ProfileWithSpecialty, SpecialtyRow } from "./page";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import {
  changeRoleAction,
  changeSpecialtyAction,
  activateUserAction,
  deactivateUserAction,
} from "./actions";
import { LoaderCircle, Pencil, Search, TriangleAlert } from "lucide-react";
import AdminModal from "../components/AdminModal";
import { useToast } from "../components/AdminToast";
import RoleBadge from "../components/RoleBadge";
import StatusBadge from "../components/StatusBadge";
import UserAvatar from "../components/UserAvatar";
import styles from "@/styles/pages/admin.module.css";

type UsuariosAdminClientProps = {
  rows: ProfileWithSpecialty[];
  specialties: SpecialtyRow[];
  fetchError: string | null;
  currentUserId: string;
};

export default function UsuariosAdminClient({
  rows,
  specialties,
  fetchError,
  currentUserId,
}: UsuariosAdminClientProps) {
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<ProfileWithSpecialty | null>(
    null
  );
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [selectedSpecialtyId, setSelectedSpecialtyId] =
    useState<string>("none");
  const [selectedActive, setSelectedActive] = useState<boolean>(true);

  // Transition & UX State
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Open Edit Modal
  const openEditModal = (user: ProfileWithSpecialty) => {
    setEditTarget(user);
    setSelectedRole(user.rol);
    setSelectedSpecialtyId(user.especialidad_id || "none");
    setSelectedActive(user.activo);
  };

  // Close Edit Modal
  const closeEditModal = () => {
    if (!isPending) {
      setEditTarget(null);
    }
  };

  // Handle Save
  const handleSave = () => {
    if (!editTarget) return;

    startTransition(async () => {
      try {
        // 1. Check and update Role if changed
        if (selectedRole !== editTarget.rol) {
          const res = await changeRoleAction(editTarget.id, selectedRole);
          if (res?.error) throw new Error(res.error);
        }

        // 2. Check and update Specialty if changed
        const currentSpecId = editTarget.especialidad_id || "none";
        if (selectedSpecialtyId !== currentSpecId) {
          const specIdValue =
            selectedSpecialtyId === "none" ? null : selectedSpecialtyId;
          const res = await changeSpecialtyAction(editTarget.id, specIdValue);
          if (res?.error) throw new Error(res.error);
        }

        // 3. Check and update Active Status if changed
        if (selectedActive !== editTarget.activo) {
          const res = selectedActive
            ? await activateUserAction(editTarget.id)
            : await deactivateUserAction(editTarget.id);
          if (res?.error) throw new Error(res.error);
        }

        showToast("Usuario actualizado exitosamente.", "success");
        setEditTarget(null);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Ocurrió un error al guardar.",
          "error"
        );
      }
    });
  };

  // Filter Logic
  const filteredRows = rows.filter((user) => {
    const fullName = (user.nombre_completo || "").toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      user.id.includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.rol === roleFilter;

    const matchesSpecialty =
      specialtyFilter === "all" ||
      (specialtyFilter === "none" && !user.especialidad_id) ||
      user.especialidad_id === specialtyFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.activo) ||
      (statusFilter === "inactive" && !user.activo);

    return matchesSearch && matchesRole && matchesSpecialty && matchesStatus;
  });

  const isSelf = editTarget?.id === currentUserId;

  return (
    <>
      {fetchError && (
        <p className="notice notice-bad" role="alert">
          <TriangleAlert aria-hidden="true" />
          <span>
            <strong>Error de Carga:</strong> {fetchError}
          </span>
        </p>
      )}

      <section className={styles.panel} aria-labelledby="miembros-registrados">
        <div className={styles.panelHeader}>
          <h2 id="miembros-registrados" className={styles.panelTitle}>
            Miembros Registrados <span className={styles.count}>{filteredRows.length}</span>
          </h2>
        </div>

        {/* Filtros */}
        <div className={styles.toolbar}>
          <div className={`${styles.filter} ${styles.filterWide}`}>
            <label className={styles.filterLabel} htmlFor="usuarios-buscar">
              Buscar por nombre
            </label>
            <div className={styles.search}>
              <Search aria-hidden="true" />
              <input
                id="usuarios-buscar"
                type="text"
                className="form-input form-input-sm"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.filter}>
            <label className={styles.filterLabel} htmlFor="usuarios-rol">
              Rol
            </label>
            <select
              id="usuarios-rol"
              className="form-input form-input-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos los roles</option>
              {APP_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filter}>
            <label className={styles.filterLabel} htmlFor="usuarios-especialidad">
              Especialidad
            </label>
            <select
              id="usuarios-especialidad"
              className="form-input form-input-sm"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
            >
              <option value="all">Todas las especialidades</option>
              <option value="none">Sin especialidad</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filter}>
            <label className={styles.filterLabel} htmlFor="usuarios-estado">
              Estado
            </label>
            <select
              id="usuarios-estado"
              className="form-input form-input-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Rol</th>
                <th>Cargo</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No se encontraron miembros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((user) => {
                  const nameDisplay =
                    user.nombre_completo
                      ? user.nombre_completo.trim()
                      : "Usuario Nuevo (Sin Perfil)";
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.cellPerson}>
                          <UserAvatar
                            avatarUrl={user.avatar_url}
                            nombres={user.nombre_completo}
                            size={36}
                          />
                          <div>
                            <span className={styles.cellMain}>{nameDisplay}</span>
                            <span className={styles.cellSub}>
                              ID: <code>{user.id.substring(0, 8)}...</code>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RoleBadge role={user.rol} />
                      </td>
                      <td>
                        {user.cargo || <span className={styles.muted}>—</span>}
                      </td>
                      <td>
                        {user.especialidades?.nombre || (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge activo={user.activo} />
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => openEditModal(user)}
                            aria-label={`Editar ${nameDisplay}`}
                            title="Editar"
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Edición de Usuario */}
      {editTarget && (
        <AdminModal title="Editar Miembro" size="sm" onClose={closeEditModal} busy={isPending}>
          <form
            className={styles.modalForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className={styles.modalBody}>
              <div className={styles.cellPerson}>
                <UserAvatar
                  avatarUrl={editTarget.avatar_url}
                  nombres={editTarget.nombre_completo}
                  size={56}
                />
                <div>
                  <span className={styles.cellMain}>
                    {editTarget.nombre_completo
                      ? editTarget.nombre_completo.trim()
                      : "Usuario Sin Nombre"}
                  </span>
                  <span className={styles.cellSub}>
                    ID: <code>{editTarget.id}</code>
                  </span>
                </div>
              </div>

              {/* Editar Rol */}
              <label className="form-field">
                <span className="form-label">Rol en la Plataforma</span>
                <select
                  className="form-input"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                  disabled={isPending || isSelf}
                >
                  {APP_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                {isSelf && (
                  <span className="form-hint">
                    No puedes cambiar tu propio rol de administrador.
                  </span>
                )}
              </label>

              {/* Editar Especialidad */}
              <label className="form-field">
                <span className="form-label">Especialidad Médica/Odontológica</span>
                <select
                  className="form-input"
                  value={selectedSpecialtyId}
                  onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                  disabled={isPending}
                >
                  <option value="none">Ninguna / Administrativo</option>
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {/* Editar Estado Activo */}
              <div className="form-field">
                <span className="form-label">Acceso Activo</span>
                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={selectedActive}
                    onChange={(e) => setSelectedActive(e.target.checked)}
                    disabled={isPending || isSelf}
                  />
                  Permitir acceso al panel administrativo
                </label>
                {isSelf && (
                  <span className="form-hint">No puedes desactivar tu propio acceso.</span>
                )}
              </div>

              {/* Mensaje de Confirmación Extra si se Desactiva */}
              {!selectedActive && editTarget.activo && (
                <p className="notice notice-bad">
                  <TriangleAlert aria-hidden="true" />
                  <span>
                    <strong>Atención:</strong> Desactivar esta cuenta bloqueará
                    inmediatamente la sesión de este usuario y no podrá volver a
                    iniciar sesión hasta ser reactivado.
                  </span>
                </p>
              )}
            </div>

            {/* Acciones de Modal */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={closeEditModal}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={isPending}>
                {isPending && <LoaderCircle className="spin" aria-hidden="true" />}
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

    </>
  );
}
