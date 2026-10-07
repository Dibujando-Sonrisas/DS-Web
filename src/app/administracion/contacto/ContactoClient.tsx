"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, Inbox, MailOpen, Reply, TriangleAlert } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { PERMISSIONS } from "@/lib/auth/permissions";
import AdminModal from "../components/AdminModal";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/AdminToast";
import { usePermissions } from "../components/PermissionsProvider";
import { marcarLeidoAction } from "./actions";
import styles from "@/styles/pages/admin.module.css";

type Mensaje = Tables<"contacto">;

const formatFecha = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Tegucigalpa",
});
const fecha = (iso: string | null) => (iso ? formatFecha.format(new Date(iso)) : "—");

type ContactoClientProps = {
  mensajes: Mensaje[];
  fetchError: string | null;
  inicialId?: string | null;
};

export default function ContactoClient({ mensajes, fetchError, inicialId }: ContactoClientProps) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState<Mensaje | null>(
    () => mensajes.find((m) => m.id === inicialId) ?? null
  );
  const [, startTransition] = useTransition();
  const puedeMarcar = can(PERMISSIONS.CONTACTO_UPDATE);
  const noLeidos = mensajes.filter((m) => !m.leido).length;

  // abrir un mensaje (también desde una notificación) lo marca como leído
  useEffect(() => {
    if (!abierto || abierto.leido || !puedeMarcar) return;
    startTransition(async () => {
      const res = await marcarLeidoAction(abierto.id);
      if (res.error) showToast(res.error, "error");
    });
  }, [abierto, puedeMarcar, showToast]);

  return (
    <div className={styles.stack}>
      {fetchError && (
        <p className="notice notice-bad" role="alert">
          <TriangleAlert aria-hidden="true" />
          <span>
            <strong>Error de Carga:</strong> {fetchError}
          </span>
        </p>
      )}

      <section className={styles.panel} aria-labelledby="bandeja-entrada">
        <div className={styles.panelHeader}>
          <h2 id="bandeja-entrada" className={styles.panelTitle}>
            Bandeja de Entrada <span className={styles.count}>{mensajes.length}</span>
          </h2>
          {noLeidos > 0 && (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>{noLeidos} sin leer</span>
          )}
        </div>

        {mensajes.length === 0 ? (
          <EmptyState icon={<Inbox />} title="Todavía no hay mensajes">
            Aquí aparecerán los mensajes que envíen desde la página de contacto del sitio.
          </EmptyState>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Remitente</th>
                  <th>Asunto / Mensaje Corto</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className={styles.num}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mensajes.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={styles.cellMain}>
                        {m.nombre} {m.apellido}
                      </span>
                      <span className={styles.cellSub}>{m.email}</span>
                    </td>
                    <td>
                      <span className={styles.cellMain}>{m.asunto || "Sin asunto"}</span>
                      <span className={`${styles.cellSub} ${styles.truncate}`}>{m.mensaje}</span>
                    </td>
                    <td className={styles.nowrap}>{fecha(m.created_at)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${m.leido ? styles.badgeSuccess : styles.badgeWarning}`}
                      >
                        {m.leido ? "Leído" : "No leído"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn-ghost btn-xs"
                          onClick={() => setAbierto(m)}
                          aria-label={`${m.leido ? "Ver" : "Leer"} mensaje de ${m.nombre}`}
                        >
                          <Eye aria-hidden="true" />
                          {m.leido ? "Ver" : "Leer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {abierto && (
        <AdminModal
          title={abierto.asunto || "Sin asunto"}
          description={`${abierto.nombre} ${abierto.apellido} · ${fecha(abierto.created_at)}`}
          icon={<MailOpen />}
          size="lg"
          onClose={() => setAbierto(null)}
        >
          <div className={styles.modalBody}>
            <dl className={styles.kv}>
              <dt>Correo:</dt>
              <dd>
                <a href={`mailto:${abierto.email}`}>{abierto.email}</a>
              </dd>
              <dt>Teléfono:</dt>
              <dd>{abierto.telefono || "No indicado"}</dd>
            </dl>
            <p className={styles.messageText}>{abierto.mensaje}</p>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAbierto(null)}>
              Cerrar
            </button>
            <a
              className="btn-primary btn-sm"
              href={`mailto:${abierto.email}?subject=${encodeURIComponent(`Re: ${abierto.asunto ?? ""}`)}`}
            >
              <Reply aria-hidden="true" />
              Responder
            </a>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
