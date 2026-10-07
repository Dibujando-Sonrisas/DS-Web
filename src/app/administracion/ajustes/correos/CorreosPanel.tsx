"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  BellOff,
  HeartHandshake,
  LoaderCircle,
  Mail,
  Plus,
  Trash2,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AvisoCorreo } from "@/lib/avisosCorreo";
import Combobox, { type ComboboxOption } from "@/app/components/Combobox";
import UserAvatar from "../../components/UserAvatar";
import { useToast } from "../../components/AdminToast";
import { usePermissions } from "../../components/PermissionsProvider";
import { agregarDestinatarioAction, quitarDestinatarioAction } from "./actions";
import styles from "@/styles/pages/admin.module.css";
import aj from "@/styles/pages/admin-ajustes.module.css";

export type Destinatario = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  agregado: string;
};

export type SeccionAviso = {
  id: AvisoCorreo;
  titulo: string;
  cuando: string;
  destinatarios: Destinatario[];
  /** usuarios activos que todavía no reciben este aviso */
  opciones: ComboboxOption[];
};

/** Mismo ícono y tono que el aviso en la campana de notificaciones. */
const ICONOS: Record<AvisoCorreo, { icono: ReactNode; tono: string }> = {
  contacto: { icono: <Mail />, tono: "tone-primary" },
  voluntario_inscripcion: { icono: <HeartHandshake />, tono: "tone-secondary" },
  usuario_nuevo: { icono: <UserPlus />, tono: "tone-secondary" },
};

const formatFecha = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeZone: "America/Tegucigalpa",
});

type CorreosPanelProps = {
  secciones: SeccionAviso[];
  fetchError: string | null;
  /** variables del servidor que faltan para enviar los avisos */
  configFaltante: string[];
};

/** Ajustes → Correos: quién recibe cada aviso por correo (catálogo en lib/avisosCorreo.ts). */
export default function CorreosPanel({ secciones, fetchError, configFaltante }: CorreosPanelProps) {
  const { can } = usePermissions();
  const puedeEditar = can(PERMISSIONS.AJUSTES_UPDATE);

  return (
    <section className={styles.panel} aria-labelledby="ajustes-correos">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="ajustes-correos" className={styles.panelTitle}>
            Avisos por correo
          </h2>
          <p className={`${styles.panelSub} ${styles.muted}`}>
            Elige quién recibe un correo cuando pasa algo en el sitio. Llega al correo de acceso de
            cada usuario; los usuarios desactivados dejan de recibirlo.
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
                Los correos no están configurados en el servidor (falta{" "}
                <strong>{configFaltante.join(", ")}</strong>). Los avisos siguen llegando a la
                campana del panel.
              </span>
            </p>
          )}
        </div>
      )}

      <ul className={aj.avisos}>
        {secciones.map((s) => (
          <SeccionAvisoItem key={s.id} seccion={s} puedeEditar={puedeEditar} />
        ))}
      </ul>
    </section>
  );
}

function SeccionAvisoItem({ seccion, puedeEditar }: { seccion: SeccionAviso; puedeEditar: boolean }) {
  const { id, titulo, cuando, destinatarios, opciones } = seccion;
  const { icono, tono } = ICONOS[id];
  const { showToast } = useToast();
  const [elegido, setElegido] = useState("");
  // cada aviso con su propio estado: guardar uno no bloquea los demás
  const [isPending, startTransition] = useTransition();

  const agregar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const usuario = opciones.find((o) => o.value === elegido);
    if (!usuario) return;
    startTransition(async () => {
      const res = await agregarDestinatarioAction(id, usuario.value);
      if (res.error) return showToast(res.error, "error");
      showToast(`${usuario.label} recibirá el aviso de ${titulo.toLowerCase()}.`, "success");
      setElegido("");
    });
  };

  const quitar = (d: Destinatario) =>
    startTransition(async () => {
      const res = await quitarDestinatarioAction(id, d.id);
      if (res.error) return showToast(res.error, "error");
      showToast(`${d.nombre} ya no recibirá el aviso de ${titulo.toLowerCase()}.`, "success");
    });

  return (
    <li className={aj.aviso} id={`aviso-${id}`} aria-labelledby={`aviso-${id}-titulo`}>
      <div className={aj.avisoInfo}>
        <span className={`icon-circle ${tono} ${aj.avisoIcono}`} aria-hidden="true">
          {icono}
        </span>
        <div>
          <h3 id={`aviso-${id}-titulo`} className={aj.avisoTitulo}>
            {titulo} <span className={styles.count}>{destinatarios.length}</span>
          </h3>
          <p className={aj.avisoCuando}>{cuando}</p>
        </div>
      </div>

      <div className={aj.avisoLista}>
        {destinatarios.length === 0 ? (
          <p className={aj.vacio}>
            <BellOff aria-hidden="true" />
            Nadie lo recibe: este correo no se envía hasta que agregues a alguien.
          </p>
        ) : (
          <ul className={aj.destinatarios}>
            {destinatarios.map((d) => (
              <li key={d.id} className={aj.destinatario}>
                <UserAvatar nombres={d.nombre} email={d.email} size={34} />
                <span className={aj.destinatarioDatos}>
                  <span className={styles.cellMain}>
                    {d.nombre}{" "}
                    {!d.activo && (
                      <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                        Inactivo · no recibe
                      </span>
                    )}
                  </span>
                  <span className={styles.cellSub} title={`Agregado el ${formatFecha.format(new Date(d.agregado))}`}>
                    {d.email}
                  </span>
                </span>
                {puedeEditar && (
                  <button
                    type="button"
                    className="btn-icon btn-icon-danger"
                    onClick={() => quitar(d)}
                    disabled={isPending}
                    aria-label={`Quitar a ${d.nombre} de ${titulo}`}
                    title="Quitar"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeEditar && (
          <form className={aj.agregar} onSubmit={agregar}>
            <label className="sr-only" htmlFor={`aviso-${id}-nuevo`}>
              Agregar usuario a {titulo}
            </label>
            <Combobox
              id={`aviso-${id}-nuevo`}
              className="form-input form-input-sm"
              placeholder="Agregar usuario..."
              emptyText={
                opciones.length
                  ? "Ningún usuario coincide con la búsqueda."
                  : "Todos los usuarios activos ya lo reciben."
              }
              options={opciones}
              value={elegido}
              onChange={setElegido}
              disabled={isPending}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={isPending || !elegido}>
              {isPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Agregar
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
