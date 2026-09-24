import { Eye } from "lucide-react";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";

// datos de muestra hasta conectar la bandeja real
const MENSAJES = [
  {
    nombre: "Ana García",
    email: "ana@example.com",
    asunto: "Duda sobre donaciones",
    resumen: "Hola, me gustaría saber si aceptan...",
    fecha: "Hoy, 10:45 AM",
    leido: false,
  },
  {
    nombre: "Empresa XYZ",
    email: "contacto@xyz.com",
    asunto: "Propuesta de patrocinio",
    resumen: "Nos interesa colaborar con su causa...",
    fecha: "Ayer, 16:20 PM",
    leido: true,
  },
  {
    nombre: "Juan Pérez",
    email: "juan@example.com",
    asunto: "Problemas con formulario",
    resumen: "Intento registrarme pero me da un error...",
    fecha: "13 May, 2026",
    leido: true,
  },
];

export default function ContactoPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Mensajes de Contacto"
        description="Revisa y responde los mensajes enviados a través de la página web."
      />

      <section className={styles.panel} aria-labelledby="bandeja-entrada">
        <div className={styles.panelHeader}>
          <h2 id="bandeja-entrada" className={styles.panelTitle}>
            Bandeja de Entrada
          </h2>
        </div>
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
              {MENSAJES.map((m) => (
                <tr key={m.email}>
                  <td>
                    <span className={styles.cellMain}>{m.nombre}</span>
                    <span className={styles.cellSub}>{m.email}</span>
                  </td>
                  <td>
                    <span className={styles.cellMain}>{m.asunto}</span>
                    <span className={`${styles.cellSub} ${styles.truncate}`}>{m.resumen}</span>
                  </td>
                  <td className={styles.nowrap}>{m.fecha}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${m.leido ? styles.badgeSuccess : styles.badgeWarning}`}
                    >
                      {m.leido ? "Leído" : "No leído"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <a
                        href="#"
                        className="btn-ghost btn-xs"
                        aria-label={`${m.leido ? "Ver" : "Leer"} mensaje de ${m.nombre}`}
                      >
                        <Eye aria-hidden="true" />
                        {m.leido ? "Ver" : "Leer"}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
