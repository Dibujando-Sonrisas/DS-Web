"use client";

import styles from "@/styles/pages/admin.module.css";
import personas from "@/styles/pages/admin-personas.module.css";
import type { VoluntarioRow } from "./VoluntariosTable";
import RoleBadge from "../../components/RoleBadge";
import UserAvatar from "../../components/UserAvatar";

type VoluntarioProfileProps = {
  voluntario: VoluntarioRow;
};

export default function VoluntarioProfile({ voluntario }: VoluntarioProfileProps) {
  const participacionesCount = voluntario.participaciones_voluntarios?.length || 0;
  const horasEstimadas = participacionesCount * 8;

  return (
    <section className={styles.panel} aria-labelledby="perfil-voluntario">
      <div className={styles.panelHeader}>
        <h2 id="perfil-voluntario" className={styles.panelTitle}>
          Perfil del Voluntario
        </h2>
        <span
          className={`${styles.badge} ${styles.badgeDot} ${
            voluntario.activo ? styles.badgeSuccess : styles.badgeNeutral
          }`}
        >
          {voluntario.activo ? "Voluntario Activo" : "Inactivo"}
        </span>
      </div>

      <div className={`${styles.panelBody} ${personas.profile}`}>
        <span className={personas.avatarRing}>
          <UserAvatar
            avatarUrl={voluntario.avatar_url}
            nombres={voluntario.nombre_completo}
            size={96}
          />
        </span>

        <dl className={styles.kv}>
          <dt>Rol Asignado</dt>
          <dd>
            <RoleBadge role={voluntario.rol as any} />
          </dd>
          <dt>Especialidad / Área</dt>
          <dd>
            <span
              className={`${styles.badge} ${
                voluntario.especialidades ? styles.badgeInfo : styles.badgeNeutral
              }`}
            >
              {voluntario.especialidades?.nombre || "Sin Especialidad Asignada"}
            </span>
          </dd>
          <dt>Teléfono</dt>
          <dd>{voluntario.telefono || "No especificado"}</dd>
          <dt>Cargo u Oficio</dt>
          <dd>{voluntario.cargo || "Voluntario General"}</dd>
          <dt>Brigadas Participadas</dt>
          <dd>{participacionesCount} Brigadas</dd>
          <dt>Horas de Servicio</dt>
          <dd>~{horasEstimadas} Horas Certificables</dd>
        </dl>
      </div>
    </section>
  );
}
