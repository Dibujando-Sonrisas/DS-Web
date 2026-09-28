import { Droplet, Droplets, Gauge, HeartPulse, Info, PersonStanding, Ruler, Scale, Thermometer, Wind, type LucideIcon } from "lucide-react";
import UserAvatar from "@/app/administracion/components/UserAvatar";
import type { Datos } from "@/lib/validation/expediente";
import styles from "@/styles/pages/admin.module.css";
import pac from "@/styles/pages/admin-pacientes.module.css";

export const hay = (v: unknown) => v !== null && v !== undefined && v !== "";

/** Índice de masa corporal a partir del peso (kg) y la talla (cm). */
function imc(peso: unknown, talla: unknown) {
  const kg = Number(peso);
  const m = Number(talla) / 100;
  return hay(peso) && hay(talla) && kg > 0 && m > 0 ? (kg / (m * m)).toFixed(1) : null;
}

// signos vitales en el orden de la preclínica; el IMC se calcula del peso y la talla
export const SIGNOS: { label: string; unidad?: string; Icon: LucideIcon; valor: (s: Datos) => unknown }[] = [
  { label: "Peso", unidad: "kg", Icon: Scale, valor: (s) => s.peso },
  { label: "Talla", unidad: "cm", Icon: Ruler, valor: (s) => s.talla },
  { label: "IMC", Icon: PersonStanding, valor: (s) => imc(s.peso, s.talla) },
  { label: "Temperatura", unidad: "°C", Icon: Thermometer, valor: (s) => s.temperatura },
  { label: "Frec. cardíaca", unidad: "lpm", Icon: HeartPulse, valor: (s) => s.frecuencia_cardiaca },
  { label: "Frec. respiratoria", unidad: "rpm", Icon: Wind, valor: (s) => s.frecuencia_respiratoria },
  { label: "Presión arterial", unidad: "mmHg", Icon: Gauge, valor: (s) => s.presion_arterial },
  { label: "Saturación O2", unidad: "%", Icon: Droplet, valor: (s) => s.saturacion },
  { label: "Glucosa", unidad: "mg/dL", Icon: Droplets, valor: (s) => s.glucosa },
];

/**
 * Ficha del paciente sobre el asistente: quién es y, desde la preclínica, sus signos
 * vitales y observaciones, para atender la consulta sin volver de paso.
 */
export function FichaPaciente({
  paciente,
  signos,
  brigada,
  estado,
}: {
  paciente: Datos;
  /** null mientras la preclínica no se ha guardado */
  signos: Datos | null;
  brigada?: string;
  estado: { label: string; badge: string };
}) {
  const detalle = [
    hay(paciente.edad) && `${paciente.edad} años`,
    paciente.sexo,
    paciente.comunidad,
    brigada,
    paciente.responsable && `Responsable: ${paciente.responsable}`,
  ].filter(Boolean);
  const conDatos = signos ? SIGNOS.filter((s) => hay(s.valor(signos))) : [];

  return (
    <section className={pac.ficha} aria-label="Paciente del expediente">
      <div className={pac.resumen}>
        <UserAvatar nombres={paciente.nombres} apellidos={paciente.apellidos} size={56} />
        <div className={pac.resumenId}>
          <h2 className={styles.panelTitle}>
            {paciente.nombres} {paciente.apellidos}
          </h2>
          <p className={styles.muted}>
            <span className={styles.cellCode}>{paciente.codigo}</span>
            {detalle.map((d) => ` · ${d}`)}
          </p>
        </div>
        <div className={pac.resumenAcciones}>
          <span className={`${styles.badge} ${styles[estado.badge]}`}>{estado.label}</span>
        </div>
      </div>

      {signos && (
        <div className={pac.fichaSignos}>
          <h3 className={pac.etiqueta}>Signos de preclínica</h3>
          {conDatos.length > 0 ? (
            <ul className={`${pac.signosResumen} tone-rotate`}>
              {conDatos.map(({ label, unidad, Icon, valor }) => (
                <li key={label}>
                  <Icon aria-hidden="true" />
                  {label}
                  <strong>
                    {String(valor(signos))}
                    {unidad && ` ${unidad}`}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>La preclínica se guardó sin signos vitales.</p>
          )}
        </div>
      )}

      {signos && hay(signos.observaciones) && (
        <p className="notice">
          <Info aria-hidden="true" />
          <span>
            <strong>Observaciones de preclínica: </strong>
            {signos.observaciones}
          </span>
        </p>
      )}
    </section>
  );
}
