"use client";

import { Search } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";

type VolunteerFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterSpecialty: string;
  onSpecialtyChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  specialties: { id: string; nombre: string }[];
};

/** Barra de filtros: va dentro del panel de voluntarios, bajo su título. */
export default function VolunteerFilters({
  searchTerm,
  onSearchChange,
  filterSpecialty,
  onSpecialtyChange,
  filterStatus,
  onStatusChange,
  specialties,
}: VolunteerFiltersProps) {
  return (
    <div className={styles.toolbar}>
      <div className={`${styles.filter} ${styles.filterWide}`}>
        <label className={styles.filterLabel} htmlFor="voluntarios-buscar">
          Buscar por nombre
        </label>
        <div className={styles.search}>
          <Search aria-hidden="true" />
          <input
            id="voluntarios-buscar"
            type="text"
            className="form-input form-input-sm"
            placeholder="Buscar voluntario..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.filter}>
        <label className={styles.filterLabel} htmlFor="voluntarios-especialidad">
          Especialidad
        </label>
        <select
          id="voluntarios-especialidad"
          className="form-input form-input-sm"
          value={filterSpecialty}
          onChange={(e) => onSpecialtyChange(e.target.value)}
        >
          <option value="all">Todas las especialidades</option>
          {specialties.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.nombre}</option>
          ))}
        </select>
      </div>

      <div className={styles.filter}>
        <label className={styles.filterLabel} htmlFor="voluntarios-estado">
          Estado
        </label>
        <select
          id="voluntarios-estado"
          className="form-input form-input-sm"
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
    </div>
  );
}
