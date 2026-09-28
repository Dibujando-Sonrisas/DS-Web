"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import type { Brigada, EstadoBrigada } from "@/lib/db/brigadas";
import styles from "@/styles/pages/admin.module.css";
import brig from "@/styles/pages/admin-brigadas.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

type BrigadasTableProps = {
  brigadas: Brigada[];
  budgets: Record<string, number>; // brigada_id -> estimated
  spent: Record<string, number>; // brigada_id -> executed (spent)
  registrationsCount: Record<string, number>; // brigada_id -> count
  selectedBrigadaId: string | null;
  onSelect: (id: string) => void;
  onEdit: (b: Brigada) => void;
  onDelete: (b: Brigada) => void;
  actions?: ReactNode; // botones que van en la cabecera del panel (p. ej. "Nueva Brigada")
};

const ESTADO_CLASSES: Record<EstadoBrigada, string> = {
  inscripciones_abiertas: styles.badgeInfo,
  inscripciones_cerradas: styles.badgeNeutral,
  finalizada: styles.badgeNeutral,
  cancelada: styles.badgeDanger,
};

const ESTADO_LABELS: Record<EstadoBrigada, string> = {
  inscripciones_abiertas: "Inscripciones Abiertas",
  inscripciones_cerradas: "Inscripciones Cerradas",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export default function BrigadasTable({
  brigadas,
  budgets,
  spent,
  registrationsCount,
  selectedBrigadaId,
  onSelect,
  onEdit,
  onDelete,
  actions,
}: BrigadasTableProps) {
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [placeFilter, setPlaceFilter] = useState("all");

  // Format currencies to Honduran Lempira / USD format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Extract unique years for filtering
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    brigadas.forEach((b) => {
      if (b.fecha_brigada) {
        const year = new Date(b.fecha_brigada).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [brigadas]);

  // Extract unique places/communities for filtering
  const uniquePlaces = useMemo(() => {
    const places = new Set<string>();
    brigadas.forEach((b) => {
      if (b.lugar) places.add(b.lugar.trim());
    });
    return Array.from(places).sort();
  }, [brigadas]);

  // Apply filters and search
  const filteredBrigadas = useMemo(() => {
    return brigadas.filter((b) => {
      const matchesSearch = b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.codigo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || b.estado === statusFilter;

      const bYear = b.fecha_brigada ? new Date(b.fecha_brigada).getFullYear().toString() : "";
      const matchesYear = yearFilter === "all" || bYear === yearFilter;

      const matchesPlace = placeFilter === "all" || b.lugar === placeFilter;

      return matchesSearch && matchesStatus && matchesYear && matchesPlace;
    });
  }, [brigadas, searchTerm, statusFilter, yearFilter, placeFilter]);

  return (
    <section className={styles.panel} aria-labelledby="listado-brigadas">
      <div className={styles.panelHeader}>
        <h2 id="listado-brigadas" className={styles.panelTitle}>
          Listado de Brigadas <span className={styles.count}>{filteredBrigadas.length}</span>
        </h2>
        {actions && <div className={styles.panelActions}>{actions}</div>}
      </div>

      {/* Filtros */}
      <div className={styles.toolbar}>
        {/* Buscador */}
        <div className={`${styles.filter} ${styles.filterWide}`}>
          <label className={styles.filterLabel} htmlFor="brigadas-buscar">
            Buscar por nombre o código
          </label>
          <div className={styles.search}>
            <Search aria-hidden="true" />
            <input
              id="brigadas-buscar"
              type="text"
              className="form-input form-input-sm"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Estado */}
        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="brigadas-estado">
            Filtrar por Estado
          </label>
          <select
            id="brigadas-estado"
            className="form-input form-input-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="inscripciones_abiertas">Inscripciones Abiertas</option>
            <option value="inscripciones_cerradas">Inscripciones Cerradas</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {/* Año */}
        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="brigadas-anio">
            Filtrar por Año
          </label>
          <select
            id="brigadas-anio"
            className="form-input form-input-sm"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">Todos los años</option>
            {uniqueYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Lugar */}
        <div className={styles.filter}>
          <label className={styles.filterLabel} htmlFor="brigadas-comunidad">
            Filtrar por Comunidad
          </label>
          <select
            id="brigadas-comunidad"
            className="form-input form-input-sm"
            value={placeFilter}
            onChange={(e) => setPlaceFilter(e.target.value)}
          >
            <option value="all">Todas las comunidades</option>
            {uniquePlaces.map((pl) => (
              <option key={pl} value={pl}>
                {pl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Brigada</th>
              <th>Lugar</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th className={styles.num}>P. Estimado</th>
              <th className={styles.num}>P. Ejecutado</th>
              <th className={styles.num}>Inscritos</th>
              <th className={styles.num}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrigadas.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  No se encontraron brigadas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredBrigadas.map((b) => {
                const estBudget = budgets[b.id] ?? 0;
                const execBudget = spent[b.id] ?? 0;
                const inscCount = registrationsCount[b.id] ?? 0;
                const isSelected = selectedBrigadaId === b.id;

                return (
                  <tr
                    key={b.id}
                    className={`${styles.rowClickable} ${isSelected ? styles.rowSelected : ""}`}
                    onClick={() => onSelect(b.id)}
                  >
                    {/* el código va bajo el nombre para que la tabla quepa sin desplazamiento */}
                    <td>
                      <span className={styles.cellMain}>{b.nombre}</span>
                      <span className={`${styles.cellSub} ${styles.nowrap}`}>{b.codigo}</span>
                      {b.descripcion && (
                        <span className={styles.cellSub}>
                          <span className={brig.clamp}>{b.descripcion}</span>
                        </span>
                      )}
                    </td>
                    <td>{b.lugar || "—"}</td>
                    <td className={styles.nowrap}>{formatDate(b.fecha_brigada)}</td>
                    <td>
                      <span className={`${styles.badge} ${ESTADO_CLASSES[b.estado]}`}>
                        {ESTADO_LABELS[b.estado]}
                      </span>
                    </td>
                    <td className={styles.num}>{formatCurrency(estBudget)}</td>
                    <td className={`${styles.num} ${execBudget > estBudget ? brig.valueBad : ""}`}>
                      {formatCurrency(execBudget)}
                    </td>
                    <td className={styles.num}>{inscCount}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={styles.rowActions}>
                        {can(PERMISSIONS.BRIGADAS_UPDATE) && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => onEdit(b)}
                            aria-label={`Editar ${b.nombre}`}
                            title="Editar"
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        {can(PERMISSIONS.BRIGADAS_DELETE) && (
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => onDelete(b)}
                            aria-label={`Eliminar ${b.nombre}`}
                            title="Eliminar"
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
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
