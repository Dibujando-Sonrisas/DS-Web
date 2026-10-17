"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import AdminModal from "@/app/administracion/components/AdminModal";
import { useToast } from "@/app/administracion/components/AdminToast";
import EmptyState from "@/app/administracion/components/EmptyState";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import UserAvatar from "@/app/administracion/components/UserAvatar";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { PacienteDetalle, Profesional } from "@/lib/db/pacientes";
import { errorInfo, getLogger } from "@/lib/logger";
import {
  CAMPOS_CONSULTA,
  CAMPOS_PACIENTE,
  CAMPOS_SIGNOS,
  type ConsultationForm,
  type Errores,
  type PatientForm,
  toConsultationForm,
  toPatientForm,
  toVitalSignsForm,
  type VitalSignsForm,
  validarConsulta,
  validarDiagnosticos,
  validarPaciente,
  validarSignos,
} from "@/lib/validation/expediente";
import styles from "@/styles/pages/admin.module.css";
import pac from "@/styles/pages/admin-pacientes.module.css";
import {
  actualizarConsultaAction,
  actualizarDiagnosticosAction,
  actualizarPacienteAction,
  actualizarSignosAction,
} from "../actions";
import {
  CampoDiagnosticos,
  CamposConsulta,
  CamposPaciente,
  CamposSignos,
  useFieldFocus,
} from "../components/CamposExpediente";
import { hay, SIGNOS } from "../components/FichaPaciente";
import { ESTADOS } from "../estados";

// formulario de cada sección que se puede corregir
type Formularios = {
  paciente: PatientForm;
  signos: VitalSignsForm;
  consulta: ConsultationForm;
  diagnosticos: string;
};
type Seccion = keyof Formularios;
type Edicion = {
  [S in Seccion]: { seccion: S; form: Formularios[S] };
}[Seccion];
type ConfigSecciones = {
  [S in Seccion]: {
    titulo: string;
    orden: string[];
    validar: (form: Formularios[S]) => Errores;
    guardar: (form: Formularios[S]) => Promise<void>;
  };
};

// valida y guarda la sección en edición con la configuración que le corresponde
const validarEdicion = <S extends Seccion>(
  secciones: ConfigSecciones,
  { seccion, form }: { seccion: S; form: Formularios[S] }
) => secciones[seccion].validar(form);
const guardarEdicion = <S extends Seccion>(
  secciones: ConfigSecciones,
  { seccion, form }: { seccion: S; form: Formularios[S] }
) => secciones[seccion].guardar(form);

const logger = getLogger("pacientes", "client");

// etapas del expediente en orden; el estado dice hasta cuál llegó
const ETAPAS = ["Ingreso", "Preclínica", "Consulta", "Finalizada"];
const ULTIMA_HECHA: Record<string, number> = {
  ingresado: 0,
  preclinica: 1,
  consulta: 1,
  finalizada: 3,
};

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
          <span
            className={`icon-circle icon-circle-sm tone-${tono}`}
            aria-hidden="true"
          >
            {icono}
          </span>
          <div>
            <h2 className={styles.panelTitle}>{titulo}</h2>
            {subtitulo && <p className={styles.panelSub}>{subtitulo}</p>}
          </div>
        </div>
        {onCorregir && (
          <BotonCorregir onClick={onCorregir} que={String(titulo)} />
        )}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function BotonCorregir({ onClick, que }: { onClick: () => void; que: string }) {
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={onClick}
      aria-label={`Corregir ${que.toLowerCase()}`}
    >
      <Pencil aria-hidden="true" />
      Corregir
    </button>
  );
}

/** Un signo vital: ícono, nombre y cifra con su unidad. */
function Vital({
  icono,
  label,
  valor,
  unidad,
}: {
  icono: ReactNode;
  label: string;
  valor: unknown;
  unidad?: string;
}) {
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
  expediente: PacienteDetalle;
  brigada: string | null;
  estado: string;
  tomadoPor: string | null;
  tomadoPorMi: boolean;
  medicos: Profesional[];
  odontologos: Profesional[];
}) {
  const router = useRouter();
  const { can } = usePermissions();
  const puedeCorregir = can(PERMISSIONS.PACIENTES_UPDATE);

  const { paciente, signos } = expediente;
  const consulta = expediente.consultas[0];
  const info = ESTADOS[estado] ?? ESTADOS.finalizada;
  // el siguiente paso lo hace otro usuario si el paciente ya está en consulta con alguien más
  const siguiente =
    estado === "consulta" && !tomadoPorMi ? undefined : info.siguiente;
  const hecha = ULTIMA_HECHA[estado] ?? 3;
  const odontologica = consulta?.tipo_consulta === "Odontologica";

  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [errors, setErrors] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const { registerRef, focusFirstError } = useFieldFocus();

  // cada sección: cómo se valida su formulario y dónde se guarda
  const secciones: ConfigSecciones = {
    paciente: {
      titulo: "Corregir datos del paciente",
      orden: CAMPOS_PACIENTE,
      validar: validarPaciente,
      guardar: (form) => actualizarPacienteAction(paciente.id, form),
    },
    signos: {
      titulo: "Corregir signos vitales",
      orden: CAMPOS_SIGNOS,
      validar: validarSignos,
      guardar: (form) => actualizarSignosAction(paciente.id, form),
    },
    consulta: {
      titulo: "Corregir consulta",
      orden: CAMPOS_CONSULTA,
      validar: validarConsulta,
      guardar: (form) => actualizarConsultaAction(consulta.id, form),
    },
    diagnosticos: {
      titulo: "Corregir diagnósticos",
      orden: ["diagnosticosStr"],
      validar: validarDiagnosticos,
      guardar: (form) => actualizarDiagnosticosAction(consulta.id, form),
    },
  };

  const abrir = (e: Edicion) => {
    setEdicion(e);
    setErrors({});
    setError("");
  };
  const cerrar = () => setEdicion(null);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!edicion || guardando) return;

    const errs = validarEdicion(secciones, edicion);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs, secciones[edicion.seccion].orden);
      return;
    }

    setGuardando(true);
    setError("");
    try {
      await guardarEdicion(secciones, edicion);
      cerrar();
      showToast("Cambios guardados en el expediente.");
      router.refresh();
    } catch (err) {
      logger.error("Patient record correction failed", {
        ...errorInfo(err),
        seccion: edicion.seccion,
        pacienteId: paciente.id,
      });
      setError(
        "No fue posible guardar los cambios. Verifique la información e intente nuevamente."
      );
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
            <UserAvatar
              nombres={paciente.nombres}
              apellidos={paciente.apellidos}
              size={64}
            />
            <div className={pac.resumenId}>
              <p className={pac.resumenCodigo}>{paciente.codigo}</p>
              <p className={styles.muted}>
                {[hay(paciente.edad) && `${paciente.edad} años`, paciente.sexo]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className={pac.resumenAcciones}>
              <span className={`${styles.badge} ${styles[info.badge]}`}>
                {info.label}
              </span>
              {estado === "consulta" && tomadoPor && (
                <span className={styles.muted}>Con {tomadoPor}</span>
              )}
              {puedeCorregir && (
                <BotonCorregir
                  onClick={() =>
                    abrir({
                      seccion: "paciente",
                      form: toPatientForm(paciente),
                    })
                  }
                  que="datos del paciente"
                />
              )}
              {siguiente && puedeCorregir && (
                <Link
                  href={`/administracion/pacientes/nuevo?paciente=${paciente.id}`}
                  className="btn-primary btn-sm"
                >
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
                    <span className={styles.stepNum}>
                      {hecho ? <Check aria-hidden="true" /> : i + 1}
                    </span>
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
        onCorregir={
          puedeCorregir && signos
            ? () => abrir({ seccion: "signos", form: toVitalSignsForm(signos) })
            : undefined
        }
      >
        {signos ? (
          <div className={styles.stack}>
            <ul className={`${pac.vitales} tone-rotate`}>
              {SIGNOS.map(({ label, unidad, Icon, valor }) => (
                <Vital
                  key={label}
                  icono={<Icon aria-hidden="true" />}
                  label={label}
                  valor={valor(signos)}
                  unidad={unidad}
                />
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
          <EmptyState
            icon={<Activity />}
            title="Aún no se toma la preclínica."
          />
        )}
      </Tarjeta>

      {/* ── CONSULTA Y DIAGNÓSTICOS ── */}
      <Tarjeta
        titulo={
          consulta
            ? odontologica
              ? "Consulta odontológica"
              : "Consulta médica"
            : "Consulta"
        }
        icono={<Stethoscope />}
        subtitulo={
          consulta
            ? [
                consulta.medico?.nombre_completo &&
                  `Atendió ${consulta.medico.nombre_completo}`,
                fecha(consulta.created_at),
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        onCorregir={
          puedeCorregir && consulta
            ? () =>
                abrir({
                  seccion: "consulta",
                  form: toConsultationForm(consulta),
                })
            : undefined
        }
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
                  Diagnósticos{" "}
                  <span className={styles.count}>
                    {consulta.diagnosticos_consulta.length}
                  </span>
                </h3>
                {puedeCorregir && (
                  <BotonCorregir
                    onClick={() =>
                      abrir({
                        seccion: "diagnosticos",
                        form: consulta.diagnosticos_consulta
                          .map((d) => d.diagnostico)
                          .join(", "),
                      })
                    }
                    que="diagnósticos"
                  />
                )}
              </div>
              <ul className={pac.chips}>
                {consulta.diagnosticos_consulta.map((d) => (
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
            title={
              estado === "consulta"
                ? `En consulta con ${tomadoPor ?? "otro usuario"}.`
                : "Aún no se atiende la consulta."
            }
          />
        )}
      </Tarjeta>

      {/* ── RECETA: solo lectura, farmacia entrega a partir de ella ── */}
      {consulta && (
        <Tarjeta
          titulo={
            <>
              Receta médica{" "}
              <span className={styles.count}>
                {consulta.medicamentos_consulta.length}
              </span>
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
                  {consulta.medicamentos_consulta.map((m) => (
                    <tr key={m.id}>
                      <td className={styles.cellMain}>
                        {m.medicamentos?.nombre ?? "-"}
                      </td>
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

      {edicion && (
        <AdminModal
          title={secciones[edicion.seccion].titulo}
          description={`Expediente ${paciente.codigo}`}
          size="lg"
          icon={<Pencil />}
          busy={guardando}
          onClose={cerrar}
        >
          <form className={styles.modalForm} onSubmit={guardar} noValidate>
            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                {edicion.seccion === "paciente" && (
                  <CamposPaciente
                    value={edicion.form}
                    setValue={(form) =>
                      setEdicion({ seccion: "paciente", form })
                    }
                    {...campos}
                  />
                )}
                {edicion.seccion === "signos" && (
                  <CamposSignos
                    value={edicion.form}
                    setValue={(form) => setEdicion({ seccion: "signos", form })}
                    {...campos}
                  />
                )}
                {edicion.seccion === "consulta" && (
                  <CamposConsulta
                    value={edicion.form}
                    setValue={(form) =>
                      setEdicion({ seccion: "consulta", form })
                    }
                    {...campos}
                    medicos={medicos}
                    odontologos={odontologos}
                  />
                )}
                {edicion.seccion === "diagnosticos" && (
                  <CampoDiagnosticos
                    value={edicion.form}
                    setValue={(form) =>
                      setEdicion({ seccion: "diagnosticos", form })
                    }
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
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={cerrar}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={guardando}
              >
                {guardando ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
