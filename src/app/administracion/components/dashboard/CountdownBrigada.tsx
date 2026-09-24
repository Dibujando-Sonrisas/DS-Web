import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CountdownCard from "@/app/components/CountdownCard";

// fecha_brigada es una fecha sin hora: se formatea en UTC para no correr el día
const formatFecha = (fecha: string) =>
  new Intl.DateTimeFormat("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(fecha));

export default async function CountdownBrigada() {
  const supabase = await createSupabaseServerClient();
  const { data: brigada } = await supabase
    .from("dashboard_brigadas")
    .select("*")
    .maybeSingle();

  if (!brigada) {
    return (
      <section className={`${styles.panel} ${dash.countdownEmpty}`}>
        <div className="icon-circle icon-circle-sm" aria-hidden="true">
          <CalendarDays />
        </div>
        <div>
          <h2>Próxima Brigada Médica</h2>
          <p>No hay brigadas activas programadas en este momento.</p>
        </div>
      </section>
    );
  }

  const dias = brigada.dias_faltantes || 0;
  let countdownText = `Faltan ${dias} días para la brigada`;
  if (dias === 0) countdownText = "¡La brigada médica es HOY!";
  if (dias < 0) countdownText = "Brigada en curso / Pendiente de cierre";

  return (
    <section className={dash.countdown} aria-labelledby="proxima-brigada">
      <div>
        <h2 id="proxima-brigada" className={dash.countdownTitle}>
          Próxima brigada: <span>{brigada.nombre}</span>
        </h2>

        <div className={dash.countdownMeta}>
          <span className="chip">
            <MapPin aria-hidden="true" />
            Comunidad: {brigada.lugar}
          </span>
          {brigada.fecha_brigada && (
            <span className="chip">
              <CalendarDays aria-hidden="true" />
              {formatFecha(brigada.fecha_brigada)}
            </span>
          )}
        </div>

        <Link href="/administracion/brigadas" className="btn-outline btn-sm">
          Ver brigada
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {/* mismo contador que en el inicio del sitio; el mensaje cuando ya llegó el día */}
      {dias > 0 && brigada.fecha_brigada ? (
        <CountdownCard targetDateStr={brigada.fecha_brigada} />
      ) : (
        <p className={dash.countdownMsg}>
          <Clock aria-hidden="true" />
          {countdownText}
        </p>
      )}
    </section>
  );
}
