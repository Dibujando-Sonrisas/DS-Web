"use client";

import { Stethoscope, Tent, UserCheck, Users } from "lucide-react";
import StatCard from "@/app/administracion/components/StatCard";
import styles from "@/styles/pages/admin.module.css";
import type { VoluntarioRow } from "./VoluntariosTable";
import { useMemo } from "react";

type VolunteerStatsCardsProps = {
  voluntarios: VoluntarioRow[];
};

export default function VolunteerStatsCards({ voluntarios }: VolunteerStatsCardsProps) {
  const stats = useMemo(() => {
    const total = voluntarios.length;
    const activos = voluntarios.filter(v => v.activo).length;

    // Contar participaciones totales
    let participaciones = 0;
    const especialidadesSet = new Set();

    voluntarios.forEach(v => {
      participaciones += (v.participaciones_voluntarios?.length || 0);
      if (v.especialidades) {
        especialidadesSet.add(v.especialidades.id);
      }
    });

    return {
      total,
      activos,
      especialidades: especialidadesSet.size,
      participaciones
    };
  }, [voluntarios]);

  return (
    <div className={`${styles.statGrid} tone-rotate`}>
      <StatCard label="Total Voluntarios" value={stats.total} icon={<Users />} />
      <StatCard
        label="Voluntarios Activos"
        value={stats.activos}
        icon={<UserCheck />}
        valueTone="ok"
      />
      <StatCard label="Especialidades" value={stats.especialidades} icon={<Stethoscope />} />
      <StatCard label="Participaciones Totales" value={stats.participaciones} icon={<Tent />} />
    </div>
  );
}
