"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import { getMedicamentosAction as getMedicamentos } from "@/app/administracion/inventario/actions";
import { supabase } from "@/lib/supabase";
import {
  getPacienteDetalleAction as getPacienteDetalle,
  liberarConsultaAction as liberarConsulta,
  registrarConsultaAction as registrarConsulta,
  registrarPacienteAction as registrarPaciente,
  registrarPreclinicaAction as registrarPreclinica,
  tomarConsultaAction as tomarConsulta,
} from "../actions";
import { ESTADOS } from "../PacientesClient";
import {
  CampoDiagnosticos,
  CamposConsulta,
  CamposPaciente,
  CamposSignos,
  FieldError,
  useFieldFocus,
} from "../components/CamposExpediente";
import { FichaPaciente } from "../components/FichaPaciente";
import Combobox from "@/app/components/Combobox";
import {
  CAMPOS_CONSULTA,
  CAMPOS_PACIENTE,
  CAMPOS_SIGNOS,
  sinNulos,
  validarConsulta,
  validarDiagnosticos,
  validarPaciente,
  validarSignos,
  type Errores,
} from "@/lib/validation/expediente";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Lock,
  LogOut,
  Plus,
  Save,
  Trash2,
  UserX,
} from "lucide-react";
import styles from "@/styles/pages/admin.module.css";
import pac from "@/styles/pages/admin-pacientes.module.css";

// pasos del asistente; "next" es el texto del botón que lleva al siguiente
const STEPS = [
  { id: 1, label: "Datos Paciente", next: "Siguiente: Signos" },
  { id: 2, label: "Signos Vitales", next: "Siguiente: Consulta" },
  { id: 3, label: "Consulta", next: "Siguiente: Diagnósticos" },
  { id: 4, label: "Diagnósticos", next: "Siguiente: Medicamentos" },
  { id: 5, label: "Receta Médica" },
];

export function NuevoExpedienteClient({ pacienteId: pacienteInicial }: { pacienteId?: string }) {
  const router = useRouter();

  // El expediente se llena por etapas, cada una puede hacerla otro usuario:
  // 1 ingresado (datos del paciente), 2 preclínica (signos), 3 finalizada (consulta, diagnósticos y receta).
  // savedStep es la última etapa guardada; sus pasos quedan de solo lectura.
  // Entre la preclínica y el final, quien abre la consulta toma al paciente (estado "consulta").
  const [pacienteId, setPacienteId] = useState<string | null>(pacienteInicial ?? null);
  const [savedStep, setSavedStep] = useState(0);
  const [tomada, setTomada] = useState(false);
  const [ocupadoPor, setOcupadoPor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Data sources
  const [brigadas, setBrigadas] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [odontologos, setOdontologos] = useState<any[]>([]);
  const [medicamentosList, setMedicamentosList] = useState<any[]>([]);

  // Form State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1); // 1 to 5

  // Errors & Messaging
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recetaError, setRecetaError] = useState<string>("");
  const [backendError, setBackendError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const { registerRef, focusFirstError } = useFieldFocus();

  // 1. Paciente
  const [paciente, setPaciente] = useState<any>({
    brigada_id: "",
    nombres: "",
    apellidos: "",
    sexo: "Masculino",
    fecha_nacimiento: "",
    edad: "",
    telefono: "",
    comunidad: "",
    responsable: "",
  });

  // 2. Signos
  const [signos, setSignos] = useState<any>({
    peso: "",
    talla: "",
    temperatura: "",
    frecuencia_cardiaca: "",
    frecuencia_respiratoria: "",
    presion_arterial: "",
    saturacion: "",
    glucosa: "",
    observaciones: "",
  });

  // 3. Consulta
  const [consulta, setConsulta] = useState<any>({
    tipo_consulta: "Medica",
    medico_id: "",
    motivo_consulta: "",
    enfermedad_actual: "",
    tratamiento: "",
    requiere_postclinica: false,
    observaciones: "",
  });

  // 4. Diagnosticos
  const [diagnosticosStr, setDiagnosticosStr] = useState("");

  // 5. Medicamentos
  const [medsRecetados, setMedsRecetados] = useState<any[]>([]);
  const [newMedId, setNewMedId] = useState("");
  const [newMedCantidad, setNewMedCantidad] = useState("1");
  const [newMedIndicaciones, setNewMedIndicaciones] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [bRes, mRes, pRes, det] = await Promise.all([
          getBrigadas(),
          getMedicamentos(),
          supabase
            .from("perfiles")
            .select("*, especialidades:especialidad_id(id, nombre)")
            .order("nombre_completo", { ascending: true }),
          pacienteInicial ? getPacienteDetalle(pacienteInicial) : null,
        ]);
        const etapa = det ? (det.consultas.length > 0 ? 3 : det.signos ? 2 : 1) : 0;
        // abrir la consulta toma al paciente; si ya lo tiene otro usuario, se avisa quién
        const ocupado = etapa === 2 ? await tomarConsulta(pacienteInicial!) : null;
        if (mounted) {
          // expediente ya ingresado: se cargan sus etapas y se abre la que sigue
          if (det) {
            setPaciente((prev: Record<string, unknown>) => ({ ...prev, ...sinNulos(det.paciente) }));
            if (det.signos) setSignos((prev: Record<string, unknown>) => ({ ...prev, ...sinNulos(det.signos) }));
            setSavedStep(etapa);
            setActiveTab(etapa + 1);
            setTomada(etapa === 2 && !ocupado);
            setOcupadoPor(ocupado);
          }

          const activeBrigadas =
            bRes.data?.filter((b: any) => b.estado !== "finalizada" && b.estado !== "cancelada") || [];
          setBrigadas(activeBrigadas);
          const prescribibles = (mRes || []).filter((m: any) => m.tipo_recurso !== "material_brigada");
          setMedicamentosList(prescribibles);

          const allProfiles = pRes.data || [];
          // médicos y odontólogos activos, por rol, ordenados por nombre
          const activos = allProfiles.filter((v: any) => v.activo !== false);
          const porRol = (rol: string) =>
            activos
              .filter((v: any) => (v.rol || "").toLowerCase() === rol)
              .sort((a: any, b: any) => (a.nombre_completo || "").localeCompare(b.nombre_completo || ""));

          setMedicos(porRol("medico"));
          setOdontologos(porRol("odontologo"));
        }
      } catch (e) {
        console.error(e);
        if (mounted && pacienteInicial) setLoadError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, [pacienteInicial]);

  // muestra los errores de un paso y lleva el foco al primero; true si el paso es válido
  const aplicar = (errs: Errores, orden: string[]) => {
    setErrors(errs);
    focusFirstError(errs, orden);
    return Object.keys(errs).length === 0;
  };

  const validateStep1 = () =>
    aplicar(
      {
        ...(paciente.brigada_id ? {} : { brigada_id: "Debe seleccionar una brigada activa obligatoriamente." }),
        ...validarPaciente(paciente),
      },
      ["brigada_id", ...CAMPOS_PACIENTE]
    );
  const validateStep2 = () => aplicar(validarSignos(signos), CAMPOS_SIGNOS);
  const validateStep3 = () => aplicar(validarConsulta(consulta), CAMPOS_CONSULTA);
  const validateStep4 = () => aplicar(validarDiagnosticos(diagnosticosStr), ["diagnosticosStr"]);

  const validators = [validateStep1, validateStep2, validateStep3, validateStep4];

  // Etapa 1: guarda el paciente y devuelve su id
  const guardarPaciente = async (): Promise<string> => {
    const nuevo = await registrarPaciente(paciente);
    setPacienteId(nuevo.id);
    setPaciente((prev: Record<string, unknown>) => ({ ...prev, codigo: nuevo.codigo }));
    setSavedStep(1);
    // si se recarga la página, continúa este expediente en lugar de ingresar al paciente otra vez
    window.history.replaceState(null, "", `?paciente=${nuevo.id}`);
    return nuevo.id;
  };

  // Etapa 2: guarda los signos vitales (vacíos también: marcan la preclínica como hecha)
  const guardarPreclinica = async (id: string) => {
    await registrarPreclinica(id, signos);
    setSavedStep(2);
  };

  // Guarda la etapa que cierra el paso 1 o 2; devuelve el id del paciente, o null si falló
  const guardarEtapa = async (step: number, id: string | null): Promise<string | null> => {
    setBackendError("");
    setIsSubmitting(true);
    try {
      if (step === 1) return await guardarPaciente();
      await guardarPreclinica(id!);
      return id;
    } catch (e) {
      console.error("Error técnico al guardar la etapa del expediente:", e);
      setBackendError("No fue posible guardar la información. Verifique los datos e intente nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const salir = (msg: string) => {
    setIsSubmitting(true); // el formulario queda bloqueado mientras redirige
    setSuccessMsg(msg);
    setTimeout(() => {
      router.push("/administracion/pacientes");
    }, 1500);
  };

  // Entrar a la consulta toma al paciente para que otro usuario no lo atienda a la vez
  const tomar = async (id: string): Promise<boolean> => {
    setBackendError("");
    setIsSubmitting(true);
    try {
      const otro = await tomarConsulta(id);
      if (otro) {
        setOcupadoPor(otro);
        return false;
      }
      setTomada(true);
      return true;
    } catch (e) {
      console.error("Error técnico al tomar al paciente para la consulta:", e);
      setBackendError("No fue posible iniciar la consulta. Intente nuevamente.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salir sin terminar la consulta: el paciente vuelve a esperar y otro usuario puede tomarlo
  const liberar = async () => {
    setBackendError("");
    setIsSubmitting(true);
    try {
      await liberarConsulta(pacienteId!);
      salir("Paciente liberado: vuelve a quedar en espera de consulta. Redirigiendo a la lista de pacientes...");
    } catch (e) {
      console.error("Error técnico al liberar al paciente:", e);
      setBackendError("No fue posible liberar al paciente. Intente nuevamente.");
      setIsSubmitting(false);
    }
  };

  // Avanzar valida cada paso pendiente y guarda al cerrar una etapa; los pasos ya guardados solo se revisan
  const goToTab = async (targetTab: number) => {
    if (targetTab === activeTab) return;

    if (targetTab < activeTab) {
      setErrors({});
      setActiveTab(targetTab);
      return;
    }

    let id = pacienteId;
    for (let step = activeTab; step < targetTab; step++) {
      if (step <= savedStep) continue;
      if (!validators[step - 1]()) {
        setActiveTab(step);
        return;
      }
      if (step <= 2) {
        id = await guardarEtapa(step, id);
        if (!id) {
          setActiveTab(step);
          return;
        }
      }
    }

    if (targetTab >= 3 && !tomada && !(await tomar(id!))) return;

    setErrors({});
    setActiveTab(targetTab);
  };

  // Cierra la etapa del paso actual y vuelve al listado, donde otro usuario la continúa
  const guardarYSalir = async () => {
    if (!validators[activeTab - 1]()) return;
    if (!(await guardarEtapa(activeTab, pacienteId))) return;
    salir(
      activeTab === 1
        ? "Paciente ingresado. Queda pendiente la preclínica; redirigiendo a la lista de pacientes..."
        : "Preclínica guardada. Queda pendiente la consulta; redirigiendo a la lista de pacientes..."
    );
  };

  const handleAddMed = () => {
    setRecetaError("");
    const medErrorObj: Record<string, string> = {};

    if (!newMedId) {
      medErrorObj.newMedId = "Debe seleccionar un medicamento.";
    }

    const numCant = Number(newMedCantidad);
    if (!newMedCantidad || isNaN(numCant) || !Number.isInteger(numCant) || numCant <= 0) {
      medErrorObj.newMedCantidad = "La cantidad debe ser un número entero mayor a 0.";
    }

    const indicClean = newMedIndicaciones.trim();
    if (!indicClean) {
      medErrorObj.newMedIndicaciones = "Las indicaciones son obligatorias.";
    }

    if (Object.keys(medErrorObj).length > 0) {
      setErrors((prev) => ({ ...prev, ...medErrorObj }));
      focusFirstError(medErrorObj, ["newMedId", "newMedCantidad", "newMedIndicaciones"]);
      return;
    }

    const m = medicamentosList.find((x) => x.medicamento_id === newMedId || x.id === newMedId);
    if (!m) return;

    const targetId = m.medicamento_id || m.id;
    const isDuplicate = medsRecetados.some((x) => x.medicamento_id === targetId);

    if (isDuplicate) {
      setRecetaError(`El medicamento "${m.nombre}" ya fue agregado a la receta.`);
      return;
    }

    setMedsRecetados((prev) => [
      ...prev,
      {
        medicamento_id: targetId,
        nombre: m.nombre,
        cantidad: numCant,
        indicaciones: indicClean,
      },
    ]);

    setNewMedId("");
    setNewMedCantidad("1");
    setNewMedIndicaciones("");
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.newMedId;
      delete copy.newMedCantidad;
      delete copy.newMedIndicaciones;
      return copy;
    });
  };

  const handleRemoveMed = (idx: number) => {
    setMedsRecetados((prev) => prev.filter((_, i) => i !== idx));
  };

  // Etapa 3: guarda la consulta con sus diagnósticos y la receta; cierra el expediente
  const handleSubmit = async () => {
    if (isSubmitting || !pacienteId) return;

    setBackendError("");
    setSuccessMsg("");

    if (!validateStep3()) {
      setActiveTab(3);
      return;
    }
    if (!validateStep4()) {
      setActiveTab(4);
      return;
    }

    try {
      setIsSubmitting(true);

      const mList = medsRecetados.map((m) => ({
        medicamento_id: m.medicamento_id,
        cantidad: m.cantidad,
        indicaciones: m.indicaciones,
      }));

      await registrarConsulta(pacienteId, consulta, diagnosticosStr, mList);

      salir("¡Expediente guardado correctamente! Redirigiendo a la lista de pacientes...");
    } catch (e: any) {
      console.error("Error técnico al guardar el expediente en Supabase:", e);
      setIsSubmitting(false);
      setBackendError("No fue posible guardar el expediente. Verifique la información ingresada e intente nuevamente.");
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.skeleton} ${styles.skeletonBlock}`}>
        <span className="sr-only">Cargando información base...</span>
      </div>
    );
  }

  if (loadError || ocupadoPor || savedStep === 3) {
    const finalizado = !loadError && !ocupadoPor;
    return (
      <div className={styles.stackSm}>
        <p className={`notice ${loadError ? "notice-bad" : ocupadoPor ? "notice-warn" : "notice-ok"}`} role="status">
          {finalizado ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <span>
            {loadError
              ? "No fue posible cargar el expediente."
              : ocupadoPor
                ? `Este paciente ya está en consulta con ${ocupadoPor}.`
                : "Este expediente ya está finalizado: no tiene etapas pendientes."}
          </span>
        </p>
        <Link href="/administracion/pacientes" className="btn-ghost btn-sm">
          <ArrowLeft aria-hidden="true" />
          Volver a la lista de pacientes
        </Link>
      </div>
    );
  }

  // paso de una etapa ya guardada: se muestra solo para revisar
  const locked = activeTab <= savedStep;
  const estado = ESTADOS[tomada ? "consulta" : savedStep === 2 ? "preclinica" : "ingresado"];

  return (
    <div className={styles.stack}>
      {pacienteId && (
        <FichaPaciente
          paciente={paciente}
          signos={savedStep >= 2 ? signos : null}
          brigada={brigadas.find((b) => b.id === paciente.brigada_id)?.nombre}
          estado={estado}
        />
      )}

      {/* Tabs navigation */}
      <ol className={styles.steps} aria-label="Pasos del expediente">
        {STEPS.map((t) => {
          const current = activeTab === t.id;
          const done = t.id < activeTab || t.id <= savedStep;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`${styles.step} ${current ? styles.stepCurrent : ""} ${done ? styles.stepDone : ""}`}
                aria-current={current ? "step" : undefined}
                onClick={() => goToTab(t.id)}
                disabled={isSubmitting}
              >
                <span className={styles.stepNum}>{done ? <Check aria-hidden="true" /> : t.id}</span>
                {t.label}
              </button>
            </li>
          );
        })}
      </ol>

      <section className={styles.panel}>
        <div className={`${styles.panelBody} ${styles.stack}`}>
          {locked && (
            <p className="notice">
              <Lock aria-hidden="true" />
              <span>Esta etapa ya fue guardada; se muestra solo para consulta.</span>
            </p>
          )}

          <fieldset className={pac.fieldset} disabled={locked}>
          {/* TAB 1: PACIENTE */}
          {activeTab === 1 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>1. Datos Personales del Paciente</h2>

              <label className="form-field">
                <span className="form-label">
                  Brigada Médica <span className="form-required" aria-hidden="true">*</span>
                </span>
                <select
                  ref={registerRef("brigada_id")}
                  className="form-input"
                  aria-required="true"
                  aria-invalid={!!errors.brigada_id}
                  value={paciente.brigada_id}
                  onChange={(e) => {
                    setPaciente({ ...paciente, brigada_id: e.target.value });
                    if (errors.brigada_id) setErrors((prev) => ({ ...prev, brigada_id: "" }));
                  }}
                >
                  <option value="">-- Seleccionar Brigada --</option>
                  {brigadas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} ({b.departamento})
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.brigada_id} />
              </label>

              <CamposPaciente
                value={paciente}
                setValue={setPaciente}
                errors={errors}
                setErrors={setErrors}
                registerRef={registerRef}
              />
            </div>
          )}

          {/* TAB 2: SIGNOS VITALES */}
          {activeTab === 2 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>2. Signos Vitales del Paciente</h2>
              <CamposSignos
                value={signos}
                setValue={setSignos}
                errors={errors}
                setErrors={setErrors}
                registerRef={registerRef}
              />
            </div>
          )}

          {/* TAB 3: CONSULTA */}
          {activeTab === 3 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>3. Consulta Médica / Odontológica</h2>

              <CamposConsulta
                value={consulta}
                setValue={setConsulta}
                errors={errors}
                setErrors={setErrors}
                registerRef={registerRef}
                medicos={medicos}
                odontologos={odontologos}
              />
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICOS */}
          {activeTab === 4 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>4. Diagnósticos Clínicos</h2>
              <CampoDiagnosticos
                value={diagnosticosStr}
                setValue={setDiagnosticosStr}
                errors={errors}
                setErrors={setErrors}
                registerRef={registerRef}
              />
            </div>
          )}

          {/* TAB 5: MEDICAMENTOS */}
          {activeTab === 5 && (
            <div className={styles.stack}>
              <div className={styles.formSection}>
                <h2 className={styles.formSectionTitle}>5. Receta de Medicamentos</h2>

                {recetaError && (
                  <p className="form-error form-alert" role="alert">
                    <CircleAlert aria-hidden="true" />
                    <span>{recetaError}</span>
                  </p>
                )}

                <h3 className={styles.subTitle}>Añadir Medicamento a la Receta</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="receta-medicamento">
                      Medicamento <span className="form-required" aria-hidden="true">*</span>
                    </label>
                    <Combobox
                      id="receta-medicamento"
                      ref={registerRef("newMedId")}
                      aria-required="true"
                      aria-invalid={!!errors.newMedId}
                      placeholder="Buscar medicamento..."
                      emptyText="Ningún medicamento coincide con la búsqueda."
                      options={medicamentosList.map((m) => ({
                        value: m.medicamento_id || m.id,
                        label: m.nombre,
                        detail: `Stock: ${m.stock_total || 0}`,
                      }))}
                      value={newMedId}
                      onChange={(v) => {
                        setNewMedId(v);
                        setRecetaError("");
                        if (errors.newMedId) setErrors((prev) => ({ ...prev, newMedId: "" }));
                      }}
                    />
                    <FieldError msg={errors.newMedId} />
                  </div>
                  <label className="form-field">
                    <span className="form-label">
                      Cantidad <span className="form-required" aria-hidden="true">*</span>
                    </span>
                    <input
                      ref={registerRef("newMedCantidad")}
                      className="form-input"
                      aria-required="true"
                      aria-invalid={!!errors.newMedCantidad}
                      type="number"
                      min="1"
                      value={newMedCantidad}
                      onChange={(e) => {
                        setNewMedCantidad(e.target.value);
                        if (errors.newMedCantidad) setErrors((prev) => ({ ...prev, newMedCantidad: "" }));
                      }}
                    />
                    <FieldError msg={errors.newMedCantidad} />
                  </label>
                  <label className="form-field form-field-full">
                    <span className="form-label">
                      Indicaciones (Dosis, Frecuencia) <span className="form-required" aria-hidden="true">*</span>
                    </span>
                    <input
                      ref={registerRef("newMedIndicaciones")}
                      className="form-input"
                      aria-required="true"
                      aria-invalid={!!errors.newMedIndicaciones}
                      placeholder="Ej. 1 tableta cada 8 horas por 5 días"
                      value={newMedIndicaciones}
                      onChange={(e) => {
                        setNewMedIndicaciones(e.target.value);
                        if (errors.newMedIndicaciones) setErrors((prev) => ({ ...prev, newMedIndicaciones: "" }));
                      }}
                    />
                    <FieldError msg={errors.newMedIndicaciones} />
                  </label>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={handleAddMed} disabled={isSubmitting}>
                  <Plus aria-hidden="true" />
                  Añadir a Receta
                </button>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.subTitle}>
                  Medicamentos Agregados <span className={styles.count}>{medsRecetados.length}</span>
                </h3>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th className={styles.num}>Cantidad</th>
                        <th>Indicaciones</th>
                        <th className={styles.num}>Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medsRecetados.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyCell}>
                            No hay medicamentos recetados aún.
                          </td>
                        </tr>
                      ) : (
                        medsRecetados.map((m, idx) => (
                          <tr key={idx}>
                            <td className={styles.cellMain}>{m.nombre}</td>
                            <td className={styles.num}>{m.cantidad}</td>
                            <td>{m.indicaciones}</td>
                            <td>
                              <div className={styles.rowActions}>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon-danger"
                                  onClick={() => handleRemoveMed(idx)}
                                  disabled={isSubmitting}
                                  aria-label={`Quitar ${m.nombre} de la receta`}
                                  title="Quitar"
                                >
                                  <Trash2 aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </fieldset>

          {backendError && (
            <p className="form-error form-alert" role="alert">
              <CircleAlert aria-hidden="true" />
              <span>{backendError}</span>
            </p>
          )}

          {successMsg && (
            <p className="notice notice-ok" role="status">
              <CircleCheck aria-hidden="true" />
              <span>{successMsg}</span>
            </p>
          )}
        </div>

        {/* key: los botones se montan de nuevo en cada paso, como antes; así un Enter repetido no avanza ni guarda de más */}
        <div key={activeTab} className={styles.panelFooter}>
          {activeTab > 1 && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => goToTab(activeTab - 1)}
              disabled={isSubmitting}
            >
              <ArrowLeft aria-hidden="true" />
              Atrás
            </button>
          )}
          <div className={`${styles.row} ${pac.next}`}>
            {/* cierra la etapa y deja el expediente listo para que otro usuario lo continúe */}
            {activeTab <= 2 && !locked && (
              <button type="button" className="btn-ghost btn-sm" onClick={guardarYSalir} disabled={isSubmitting}>
                <LogOut aria-hidden="true" />
                Guardar y salir
              </button>
            )}
            {activeTab >= 3 && tomada && (
              <button type="button" className="btn-ghost btn-sm" onClick={liberar} disabled={isSubmitting}>
                <UserX aria-hidden="true" />
                Liberar paciente
              </button>
            )}
            {activeTab < STEPS.length ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => goToTab(activeTab + 1)}
                disabled={isSubmitting}
              >
                {STEPS[activeTab - 1].next}
                {isSubmitting ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {isSubmitting ? "Guardando expediente..." : "Guardar Expediente"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
