"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Save,
  Stethoscope,
  Tent,
  UserRound,
} from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import { useToast } from "@/app/administracion/components/AdminToast";
import EmptyState from "@/app/administracion/components/EmptyState";
import UserAvatar from "@/app/administracion/components/UserAvatar";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  CAMPOS_CONSULTA,
  CAMPOS_PACIENTE,
  CAMPOS_SIGNOS,
  sinNulos,
  validarConsulta,
  validarDiagnosticos,
  validarPaciente,
  validarSignos,
  type Datos,
  type Errores,
} from "@/lib/validation/expediente";
import {
  actualizarConsultaAction,
  actualizarDiagnosticosAction,
  actualizarPacienteAction,
  actualizarSignosAction,
} from "../actions";
import { ESTADOS } from "../PacientesClient";
import {
  CampoDiagnosticos,
  CamposConsulta,
  CamposPaciente,
  CamposSignos,
  useFieldFocus,
} from "../components/CamposExpediente";
import { hay, SIGNOS } from "../components/FichaPaciente";
import styles from "@/styles/pages/admin.module.css";
import pac from "@/styles/pages/admin-pacientes.module.css";

type Seccion = "paciente" | "signos" | "consulta" | "diagnosticos";

// etapas del expediente en orden; el estado dice hasta cuál llegó
const ETAPAS = ["Ingreso", "Preclínica", "Consulta", "Finalizada"];
const ULTIMA_HECHA: Record<string, number> = { ingresado: 0, preclinica: 1, consulta: 1, finalizada: 3 };

// zona horaria fija: el servidor y el navegador muestran el mismo día
const fecha = (v: string | null) =>
  v
    ? new Date(v).toLocaleDateString("es-HN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Tegucigalpa",
      })
    : null;

/** Tarjeta de una sección del expediente: ícono, título y su botón para corregirla. */
function Tarjeta({
  titulo,
  icono,
  tono = "primary",
  subtitulo,
  onCorregir,
  children,
}: {
  titulo: ReactNode;
  icono: ReactNode;
  /** color de marca del ícono */
  tono?: "primary" | "secondary" | "tertiary";
  subtitulo?: ReactNode;
  onCorregir?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={pac.tarjetaTitulo}>
          <span className={`icon-circle icon-circle-sm tone-${tono}`} aria-hidden="true">
            {icono}
          </span>
          <div>
            <h2 className={styles.panelTitle}>{titulo}</h2>
            {subtitulo && <p className={styles.panelSub}>{subtitulo}</p>}
          </div>
        </div>
        {onCorregir && <BotonCorregir onClick={onCorregir} que={String(titulo)} />}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function BotonCorregir({ onClick, que }: { onClick: () => void; que: string }) {
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={onClick} aria-label={`Corregir ${que.toLowerCase()}`}>
      <Pencil aria-hidden="true" />
      Corregir
    </button>
  );
}

/** Un signo vital: ícono, nombre y cifra con su unidad. */
function Vital({ icono, label, valor, unidad }: { icono: ReactNode; label: string; valor: unknown; unidad?: string }) {
  return (
    <li className={pac.vital}>
      <span className={pac.vitalLabel}>
        {icono}
        {label}
      </span>
      {hay(valor) ? (
        <span className={pac.vitalValor}>
          {String(valor)}
          {unidad && <small>{unidad}</small>}
        </span>
      ) : (
        <span className={pac.vitalVacio}>Sin dato</span>
      )}
    </li>
  );
}

export function ExpedienteClient({
  expediente,
  brigada,
  estado,
  tomadoPor,
  tomadoPorMi,
  medicos,
  odontologos,
}: {
  expediente: Datos;
  brigada: string | null;
  estado: string;
  tomadoPor: string | null;
  tomadoPorMi: boolean;
  medicos: Datos[];
  odontologos: Datos[];
}) {
  const router = useRouter();
  const { can } = usePermissions();
  const puedeCorregir = can(PERMISSIONS.PACIENTES_UPDATE);

  const { paciente, signos } = expediente;
  const consulta = expediente.consultas[0];
  const info = ESTADOS[estado] ?? ESTADOS.finalizada;
  // el siguiente paso lo hace otro usuario si el paciente ya está en consulta con alguien más
  const siguiente = estado === "consulta" && !tomadoPorMi ? undefined : info.siguiente;
  const hecha = ULTIMA_HECHA[estado] ?? 3;
  const odontologica = consulta?.tipo_consulta === "Odontologica";

  const [editando, setEditando] = useState<Seccion | null>(null);
  const [form, setForm] = useState<Datos>({});
  const [errors, setErrors] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const { registerRef, focusFirstError } = useFieldFocus();

  // cada sección: con qué datos abre el formulario, cómo se valida y dónde se guarda
  const secciones: Record<
    Seccion,
    { titulo: string; datos: () => Datos; validar: () => Errores; orden: string[]; guardar: () => Promise<void> }
  > = {
    paciente: {
      titulo: "Corregir datos del paciente",
      datos: () => sinNulos(paciente),
      validar: () => validarPaciente(form),
      orden: CAMPOS_PACIENTE,
      guardar: () => actualizarPacienteAction(paciente.id, form),
    },
    signos: {
      titulo: "Corregir signos vitales",
      datos: () => sinNulos(signos),
      validar: () => validarSignos(form),
      orden: CAMPOS_SIGNOS,
      guardar: () => actualizarSignosAction(paciente.id, form),
    },
    consulta: {
      titulo: "Corregir consulta",
      datos: () => sinNulos(consulta),
      validar: () => validarConsulta(form),
      orden: CAMPOS_CONSULTA,
      guardar: () => actualizarConsultaAction(consulta.id, form),
    },
    diagnosticos: {
      titulo: "Corregir diagnósticos",
      datos: () => ({ diagnosticos: consulta.diagnosticos_consulta.map((d: Datos) => d.diagnostico).join(", ") }),
      validar: () => validarDiagnosticos(form.diagnosticos),
      orden: ["diagnosticosStr"],
      guardar: () => actualizarDiagnosticosAction(consulta.id, form.diagnosticos),
    },
  };

  const abrir = (s: Seccion) => {
    setForm(secciones[s].datos());
    setErrors({});
    setError("");
    setEditando(s);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!editando || guardando) return;
    const seccion = secciones[editando];

    const errs = seccion.validar();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs, seccion.orden);
      return;
    }

    setGuardando(true);
    setError("");
    try {
      await seccion.guardar();
      setEditando(null);
      showToast("Cambios guardados en el expediente.");
      router.refresh();
    } catch (err) {
      console.error("Error técnico al corregir el expediente:", err);
      setError("No fue posible guardar los cambios. Verifique la información e intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const campos = { errors, setErrors, registerRef };

  // datos de contacto y registro; lo que no se llenó no se muestra
  const meta: [ReactNode, string, ReactNode][] = [
    [<Tent key="i" />, "Brigada", brigada],
    [<MapPin key="i" />, "Comunidad", paciente.comunidad],
    [<Phone key="i" />, "Teléfono", paciente.telefono],
    [<UserRound key="i" />, "Responsable", paciente.responsable],
    [<CalendarDays key="i" />, "Registrado", fecha(paciente.created_at)],
  ];

  return (
    <div className={styles.stack}>
      {/* ── RESUMEN: quién es el paciente y en qué etapa va ── */}
      <section className={styles.panel} aria-label="Resumen del expediente">
        <div className={`${styles.panelBody} ${styles.stack}`}>
          <div className={pac.resumen}>
            <UserAvatar nombres={paciente.nombres} apellidos={paciente.apellidos} size={64} />
            <div className={pac.resumenId}>
              <p className={pac.resumenCodigo}>{paciente.codigo}</p>
              <p className={styles.muted}>
                {[hay(paciente.edad) && `${paciente.edad} años`, paciente.sexo].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className={pac.resumenAcciones}>
              <span className={`${styles.badge} ${styles[info.badge]}`}>{info.label}</span>
              {estado === "consulta" && tomadoPor && <span className={styles.muted}>Con {tomadoPor}</span>}
              {puedeCorregir && <BotonCorregir onClick={() => abrir("paciente")} que="datos del paciente" />}
              {siguiente && puedeCorregir && (
                <Link href={`/administracion/pacientes/nuevo?paciente=${paciente.id}`} className="btn-primary btn-sm">
                  {siguiente}
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          <dl className={pac.meta}>
            {meta
              .filter(([, , valor]) => hay(valor))
              .map(([icono, label, valor]) => (
                <div key={label}>
                  <span aria-hidden="true">{icono}</span>
                  <div>
                    <dt>{label}</dt>
                    <dd>{valor}</dd>
                  </div>
                </div>
              ))}
          </dl>

          <ol className={styles.steps} aria-label="Etapas del expediente">
            {ETAPAS.map((etapa, i) => {
              const hecho = i <= hecha;
              const actual = i === hecha + 1;
              return (
                <li key={etapa}>
                  <span
                    className={`${styles.step} ${actual ? styles.stepCurrent : ""} ${hecho ? styles.stepDone : ""}`}
                    aria-current={actual ? "step" : undefined}
                  >
                    <span className={styles.stepNum}>{hecho ? <Check aria-hidden="true" /> : i + 1}</span>
                    {etapa}
                    {hecho && <span className="sr-only"> (hecha)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── PRECLÍNICA ── */}
      <Tarjeta
        titulo="Signos vitales"
        icono={<Activity />}
        tono="tertiary"
        subtitulo="Tomados en la preclínica."
        onCorregir={puedeCorregir && signos ? () => abrir("signos") : undefined}
      >
        {signos ? (
          <div className={styles.stack}>
            <ul className={`${pac.vitales} tone-rotate`}>
              {SIGNOS.map(({ label, unidad, Icon, valor }) => (
                <Vital key={label} icono={<Icon aria-hidden="true" />} label={label} valor={valor(signos)} unidad={unidad} />
              ))}
            </ul>
            {hay(signos.observaciones) && (
              <div>
                <h3 className={pac.etiqueta}>Observaciones de preclínica</h3>
                <p className={pac.nota}>{signos.observaciones}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={<Activity />} title="Aún no se toma la preclínica." />
        )}
      </Tarjeta>

      {/* ── CONSULTA Y DIAGNÓSTICOS ── */}
      <Tarjeta
        titulo={consulta ? (odontologica ? "Consulta odontológica" : "Consulta médica") : "Consulta"}
        icono={<Stethoscope />}
        subtitulo={
          consulta
            ? [consulta.medico?.nombre_completo && `Atendió ${consulta.medico.nombre_completo}`, fecha(consulta.created_at)]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        onCorregir={puedeCorregir && consulta ? () => abrir("consulta") : undefined}
      >
        {consulta ? (
          <div className={styles.stack}>
            {consulta.requiere_postclinica && (
              <p className="notice notice-warn">
                <CircleAlert aria-hidden="true" />
                <span>El paciente requiere postclínica.</span>
              </p>
            )}

            <div className={pac.narrativa}>
              {[
                ["Motivo de consulta", consulta.motivo_consulta],
                ["Enfermedad actual", consulta.enfermedad_actual],
                ["Plan de tratamiento", consulta.tratamiento],
              ].map(([titulo, texto]) => (
                <div key={titulo}>
                  <h3 className={pac.etiqueta}>{titulo}</h3>
                  <p className={pac.nota}>{texto || "-"}</p>
                </div>
              ))}
            </div>

            <div className={pac.diagnosticos}>
              <div className={styles.rowBetween}>
                <h3 className={pac.etiqueta}>
                  Diagnósticos <span className={styles.count}>{consulta.diagnosticos_consulta.length}</span>
                </h3>
                {puedeCorregir && <BotonCorregir onClick={() => abrir("diagnosticos")} que="diagnósticos" />}
              </div>
              <ul className={pac.chips}>
                {consulta.diagnosticos_consulta.map((d: Datos) => (
                  <li key={d.id}>
                    <ClipboardList aria-hidden="true" />
                    {d.diagnostico}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Stethoscope />}
            title={estado === "consulta" ? `En consulta con ${tomadoPor ?? "otro usuario"}.` : "Aún no se atiende la consulta."}
          />
        )}
      </Tarjeta>

      {/* ── RECETA: solo lectura, farmacia entrega a partir de ella ── */}
      {consulta && (
        <Tarjeta
          titulo={
            <>
              Receta médica <span className={styles.count}>{consulta.medicamentos_consulta.length}</span>
            </>
          }
          icono={<Pill />}
          tono="secondary"
          subtitulo="Solo lectura: farmacia entrega los medicamentos a partir de esta receta."
        >
          {consulta.medicamentos_consulta.length === 0 ? (
            <EmptyState icon={<Pill />} title="Sin medicamentos recetados." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th className={styles.num}>Cantidad</th>
                    <th>Indicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {consulta.medicamentos_consulta.map((m: Datos) => (
                    <tr key={m.id}>
                      <td className={styles.cellMain}>{m.medicamentos?.nombre ?? "-"}</td>
                      <td className={styles.num}>{m.cantidad}</td>
                      <td>{m.indicaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}

      {editando && (
        <AdminModal
          title={secciones[editando].titulo}
          description={`Expediente ${paciente.codigo}`}
          size="lg"
          icon={<Pencil />}
          busy={guardando}
          onClose={() => setEditando(null)}
        >
          <form className={styles.modalForm} onSubmit={guardar} noValidate>
            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                {editando === "paciente" && <CamposPaciente value={form} setValue={setForm} {...campos} />}
                {editando === "signos" && <CamposSignos value={form} setValue={setForm} {...campos} />}
                {editando === "consulta" && (
                  <CamposConsulta
                    value={form}
                    setValue={setForm}
                    {...campos}
                    medicos={medicos}
                    odontologos={odontologos}
                  />
                )}
                {editando === "diagnosticos" && (
                  <CampoDiagnosticos
                    value={form.diagnosticos}
                    setValue={(v) => setForm({ diagnosticos: v })}
                    {...campos}
                  />
                )}
              </div>

              {error && (
                <p className="form-error form-alert" role="alert">
                  <CircleAlert aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditando(null)} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={guardando}>
                {guardando ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

    </div>
  );
}
