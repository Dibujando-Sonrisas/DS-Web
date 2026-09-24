"use client";

import { useState, useMemo, useTransition } from "react";
import { Search } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";

export type PerfilRow = {
  id: string;
  nombre_completo: string | null;
  rol: string;
  cargo?: string | null;
  especialidad_id?: string | null;
  activo: boolean;
  especialidades?: {
    id: string;
    nombre: string;
  } | null;
};

type AsignacionesTableProps = {
  profiles: PerfilRow[];
  assignments: Record<string, string>; // perfil_id -> area_asignada
  onAssign: (perfilId: string, area: string | null) => Promise<void>;
  isReadOnly?: boolean;
};

const AREAS_MAP: Record<string, string> = {
  registro: "Registro",
  preclinica: "Preclínica",
  consulta_medica: "Consulta Médica",
  consulta_odontologica: "Consulta Odontológica",
  farmacia: "Farmacia",
  postclinica: "Postclínica",
  ropa: "Donaciones / Ropa",
  actividades: "Actividades Infantiles",
  logistica: "Logística",
  coordinacion: "Coordinación",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  voluntario: "Voluntario",
};

export default function AsignacionesTable({
  profiles,
  assignments,
  onAssign,
  isReadOnly = false,
}: AsignacionesTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // 'all', 'assigned', 'unassigned'

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Must be active user to work in a brigade
      if (!p.activo) return false;

      const fullName = (p.nombre_completo || "").toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
        p.cargo?.toLowerCase().includes(searchTerm.toLowerCase());

      const assignedArea = assignments[p.id];
      const isAssigned = !!assignedArea;

      const matchesAssignment = assignmentFilter === "all" ||
        (assignmentFilter === "assigned" && isAssigned) ||
        (assignmentFilter === "unassigned" && !isAssigned);

      return matchesSearch && matchesAssignment;
    });
  }, [profiles, searchTerm, assignmentFilter, assignments]);

  const handleAssignChange = (perfilId: string, area: string) => {
    startTransition(async () => {
      await onAssign(perfilId, area === "none" ? null : area);
    });
  };

  return (
    <section className={styles.stackSm}>
      <h3 className={styles.subTitle}>Asignación de Personal</h3>

      <div className={brig.bleed}>
        {/* Filtros */}
        <div className={styles.toolbar}>
          {/* Buscar */}
          <div className={`${styles.filter} ${styles.filterWide}`}>
            <label className={styles.filterLabel} htmlFor="asignaciones-buscar">
              Buscar personal por nombre o cargo
            </label>
            <div className={styles.search}>
              <Search aria-hidden="true" />
              <input
                id="asignaciones-buscar"
                type="text"
                className="form-input form-input-sm"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Asignación */}
          <div className={styles.filter}>
            <label className={styles.filterLabel} htmlFor="asignaciones-filtro">
              Filtrar por Asignación
            </label>
            <select
              id="asignaciones-filtro"
              className="form-input form-input-sm"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
            >
              <option value="all">Todo el personal activo</option>
              <option value="assigned">Asignados a un área</option>
              <option value="unassigned">Sin área asignada</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Rol / Cargo</th>
                <th>Especialidad</th>
                <th>Área Asignada</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyCell}>
                    No se encontró personal activo con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const currentArea = assignments[p.id] || "none";

                  return (
                    <tr key={p.id}>
                      <td className={styles.cellMain}>{p.nombre_completo || "Usuario Sin Nombre"}</td>
                      <td>
                        <span className={styles.cellMain}>{ROLE_LABELS[p.rol] || p.rol}</span>
                        {p.cargo && <span className={styles.cellSub}>{p.cargo}</span>}
                      </td>
                      <td>
                        {p.especialidades ? (
                          <span className={`${styles.badge} ${styles.badgeInfo}`}>{p.especialidades.nombre}</span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        <select
                          className={`form-input form-input-sm ${brig.areaSelect} ${
                            currentArea !== "none" ? brig.areaSelectOn : ""
                          }`}
                          aria-label={`Área asignada a ${p.nombre_completo || "Usuario Sin Nombre"}`}
                          value={currentArea}
                          onChange={(e) => handleAssignChange(p.id, e.target.value)}
                          disabled={isPending || isReadOnly}
                        >
                          <option value="none">Sin asignar</option>
                          {Object.entries(AREAS_MAP).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
