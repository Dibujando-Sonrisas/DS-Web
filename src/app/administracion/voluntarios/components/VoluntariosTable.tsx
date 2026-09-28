"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import StatusBadge from "@/app/administracion/components/StatusBadge";
import UserAvatar from "@/app/administracion/components/UserAvatar";
import styles from "@/styles/pages/admin.module.css";
import VolunteerFilters from "./VolunteerFilters";

export type VoluntarioRow = {
  id: string;
  nombre_completo: string | null;
  rol: string | null;
  avatar_url: string | null;
  activo: boolean;
  cargo: string | null;
  telefono?: string | null;
  especialidades?: { id: string; nombre: string } | null;
  asignaciones_voluntarios?: any[];
  participaciones_voluntarios?: any[];
};

type VoluntariosTableProps = {
  voluntarios: VoluntarioRow[];
};

export default function VoluntariosTable({ voluntarios }: VoluntariosTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const specialties = useMemo(() => {
    const specs = new Map();
    voluntarios.forEach(v => {
      if (v.especialidades) {
        specs.set(v.especialidades.id, v.especialidades.nombre);
      }
    });
    return Array.from(specs.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [voluntarios]);

  const filtered = useMemo(() => {
    return voluntarios.filter((v) => {
      const matchSearch = v.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSpecialty = filterSpecialty === "all" || v.especialidades?.id === filterSpecialty;
      const matchStatus = filterStatus === "all" 
        || (filterStatus === "active" && v.activo)
        || (filterStatus === "inactive" && !v.activo);

      return matchSearch && matchSpecialty && matchStatus;
    });
  }, [voluntarios, searchTerm, filterSpecialty, filterStatus]);

  return (
    <section className={styles.panel} aria-labelledby="listado-voluntarios">
      <div className={styles.panelHeader}>
        <h2 id="listado-voluntarios" className={styles.panelTitle}>
          Voluntarios Encontrados <span className={styles.count}>{filtered.length}</span>
        </h2>
      </div>

      <VolunteerFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterSpecialty={filterSpecialty}
        onSpecialtyChange={setFilterSpecialty}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        specialties={specialties}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Voluntario</th>
              <th>Especialidad</th>
              <th>Cargo</th>
              <th className={styles.num}>Participaciones</th>
              <th>Estado</th>
              <th className={styles.num}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  No se encontraron voluntarios con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((v) => {
                const nombre = v.nombre_completo || "Sin nombre";
                return (
                  <tr key={v.id}>
                    <td>
                      <div className={styles.cellPerson}>
                        <UserAvatar avatarUrl={v.avatar_url} nombres={v.nombre_completo} size={36} />
                        <div>
                          <span className={styles.cellMain}>{nombre}</span>
                          {v.rol && (
                            <span className={styles.cellSub}>
                              Rol: {ROLE_LABELS[v.rol as AppRole] ?? v.rol}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{v.especialidades?.nombre || <span className={styles.muted}>Sin asignar</span>}</td>
                    <td>{v.cargo || <span className={styles.muted}>N/A</span>}</td>
                    <td className={styles.num}>
                      {v.participaciones_voluntarios?.length || 0} brigadas
                    </td>
                    <td>
                      <StatusBadge activo={v.activo} />
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={`/administracion/voluntarios/${v.id}`}
                          className="btn-ghost btn-xs"
                          aria-label={`Ver perfil de ${nombre}`}
                        >
                          <Eye aria-hidden="true" />
                          Ver Perfil
                        </Link>
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
  );
}
