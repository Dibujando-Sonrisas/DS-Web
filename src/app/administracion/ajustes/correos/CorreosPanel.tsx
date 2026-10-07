"use client";

import { useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Mail, Plus, Trash2, TriangleAlert } from "lucide-react";
import { PERMISSIONS } from "@/lib/auth/permissions";
import Combobox, { type ComboboxOption } from "@/app/components/Combobox";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../components/AdminToast";
import { usePermissions } from "../../components/PermissionsProvider";
import { agregarDestinatarioAction, quitarDestinatarioAction } from "./actions";
import styles from "@/styles/pages/admin.module.css";

const formatFecha = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeZone: "America/Tegucigalpa",
});

export type Destinatario = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  agregado: string;
};

type CorreosPanelProps = {
  destinatarios: Destinatario[];
  /** usuarios activos que todavía no reciben */
  opciones: ComboboxOption[];
  fetchError: string | null;
  /** variables del servidor que faltan para enviar los avisos */
  configFaltante: string[];
};

/** Ajustes → Correos: qué usuarios reciben un aviso cuando escriben desde el formulario de contacto. */
export default function CorreosPanel({
  destinatarios,
  opciones,
  fetchError,
  configFaltante,
}: CorreosPanelProps) {
  const { can } = usePermissions();
  const puedeEditar = can(PERMISSIONS.AJUSTES_UPDATE);
  const { showToast } = useToast();
  const [elegido, setElegido] = useState("");
  const [isPending, startTransition] = useTransition();

  const agregar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const usuario = opciones.find((o) => o.value === elegido);
    if (!usuario) return;
    startTransition(async () => {
      const res = await agregarDestinatarioAction(usuario.value);
      if (res.error) return showToast(res.error, "error");
      showToast(`${usuario.label} recibirá los próximos mensajes de contacto.`, "success");
      setElegido("");
    });
  };

  const quitar = (d: Destinatario) =>
    startTransition(async () => {
      const res = await quitarDestinatarioAction(d.id);
      if (res.error) return showToast(res.error, "error");
      showToast(`${d.nombre} ya no recibirá los mensajes de contacto.`, "success");
    });

  return (
    <section className={styles.panel} aria-labelledby="ajustes-correos">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="ajustes-correos" className={styles.panelTitle}>
            Mensajes de contacto <span className={styles.count}>{destinatarios.length}</span>
          </h2>
          <p className={`${styles.panelSub} ${styles.muted}`}>
            Estos usuarios reciben un aviso en su correo de acceso cada vez que alguien escribe desde
            el formulario de contacto del sitio web.
          </p>
        </div>
      </div>

      {(configFaltante.length > 0 || fetchError) && (
        <div className={styles.panelBody}>
          {fetchError ? (
            <p className="notice notice-bad" role="alert">
              <TriangleAlert aria-hidden="true" />
              <span>
                <strong>Error de Carga:</strong> {fetchError}
              </span>
            </p>
          ) : (
            <p className="notice notice-warn" role="status">
              <TriangleAlert aria-hidden="true" />
              <span>
                Los avisos por correo no están configurados en el servidor (falta{" "}
                <strong>{configFaltante.join(", ")}</strong>). Los mensajes se guardan igual en
                Mensajes de Contacto.
              </span>
            </p>
          )}
        </div>
      )}

      {puedeEditar && (
        <form className={styles.toolbar} onSubmit={agregar}>
          <div className={`${styles.filter} ${styles.filterWide}`}>
            <label className={styles.filterLabel} htmlFor="destinatario-nuevo">
              Agregar usuario
            </label>
            <Combobox
              id="destinatario-nuevo"
              className="form-input form-input-sm"
              placeholder="Buscar por nombre..."
              emptyText={
                opciones.length ? "Ningún usuario coincide con la búsqueda." : "Todos los usuarios activos ya reciben."
              }
              options={opciones}
              value={elegido}
              onChange={setElegido}
              disabled={isPending}
            />
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={isPending || !elegido}>
            {isPending ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            Agregar
          </button>
        </form>
      )}

      {destinatarios.length === 0 ? (
        <EmptyState icon={<Mail />} title="Nadie recibe los mensajes todavía">
          Agrega al menos un usuario para que los mensajes del sitio le lleguen a alguien.
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Agregado</th>
                {puedeEditar && <th className={styles.num}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {destinatarios.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className={styles.cellMain}>
                      {d.nombre}{" "}
                      {!d.activo && (
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                          Inactivo · no recibe
                        </span>
                      )}
                    </span>
                    <span className={styles.cellSub}>{d.email}</span>
                  </td>
                  <td className={styles.nowrap}>{formatFecha.format(new Date(d.agregado))}</td>
                  {puedeEditar && (
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => quitar(d)}
                          disabled={isPending}
                          aria-label={`Quitar a ${d.nombre}`}
                          title="Quitar"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
