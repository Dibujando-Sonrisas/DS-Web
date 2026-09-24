"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import { getMedicamentosAction as getMedicamentos } from "@/app/administracion/inventario/actions";
import { supabase } from "@/lib/supabase";
import { createExpedienteCompletoAction as createExpedienteCompleto } from "../actions";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
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

/** Mensaje de error bajo un campo. */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className="form-error">
      <CircleAlert size={14} aria-hidden="true" />
      {msg}
    </span>
  );
}

export function NuevoExpedienteClient() {
  const router = useRouter();

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

  // Refs for element focus
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerRef = (name: string) => (el: HTMLElement | null) => {
    fieldRefs.current[name] = el;
  };

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
        const [bRes, mRes, pRes] = await Promise.all([
          getBrigadas(),
          getMedicamentos(),
          supabase
            .from("perfiles")
            .select("*, especialidades:especialidad_id(id, nombre)")
            .order("nombre_completo", { ascending: true }),
        ]);
        if (mounted) {
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
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Helper focus function
  const focusFirstError = (errs: Record<string, string>, fieldOrder: string[]) => {
    for (const name of fieldOrder) {
      if (errs[name]) {
        const el = fieldRefs.current[name];
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        break;
      }
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Brigada
    if (!paciente.brigada_id) {
      newErrors.brigada_id = "Debe seleccionar una brigada activa obligatoriamente.";
    }

    // Nombres
    const cleanedNombres = paciente.nombres.replace(/\s+/g, " ").trim();
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!cleanedNombres) {
      newErrors.nombres = "El nombre es obligatorio.";
    } else if (cleanedNombres.length < 3 || cleanedNombres.length > 100) {
      newErrors.nombres = "Los nombres deben tener entre 3 y 100 caracteres.";
    } else if (!nameRegex.test(cleanedNombres)) {
      newErrors.nombres = "Los nombres solo deben contener letras, espacios y acentos.";
    }

    // Apellidos
    const cleanedApellidos = paciente.apellidos.replace(/\s+/g, " ").trim();
    if (!cleanedApellidos) {
      newErrors.apellidos = "Los apellidos son obligatorios.";
    } else if (cleanedApellidos.length < 3 || cleanedApellidos.length > 100) {
      newErrors.apellidos = "Los apellidos deben tener entre 3 y 100 caracteres.";
    } else if (!nameRegex.test(cleanedApellidos)) {
      newErrors.apellidos = "Los apellidos solo deben contener letras, espacios y acentos.";
    }

    // Sexo
    if (!paciente.sexo) {
      newErrors.sexo = "El sexo es obligatorio.";
    }

    // Edad
    if (paciente.edad === "" || paciente.edad === null || paciente.edad === undefined) {
      newErrors.edad = "La edad es obligatoria.";
    } else {
      const numEdad = Number(paciente.edad);
      if (isNaN(numEdad) || !Number.isInteger(numEdad) || numEdad < 0 || numEdad > 120) {
        newErrors.edad = "La edad debe ser un número entero entre 0 y 120.";
      }
    }

    // Teléfono (Opcional, 8 dígitos si se ingresa)
    if (paciente.telefono) {
      const phoneClean = paciente.telefono.trim();
      if (!/^\d{8}$/.test(phoneClean)) {
        newErrors.telefono = "El teléfono debe contener exactamente 8 números (formato Honduras).";
      }
    }

    // Comunidad (Opcional, mínimo 3 caracteres)
    if (paciente.comunidad) {
      const comClean = paciente.comunidad.replace(/\s+/g, " ").trim();
      if (comClean.length < 3) {
        newErrors.comunidad = "La comunidad debe contener al menos 3 caracteres.";
      }
    }

    // Responsable (Obligatorio si edad < 18)
    const numEdad = Number(paciente.edad);
    if (paciente.edad !== "" && !isNaN(numEdad) && numEdad < 18) {
      const respClean = (paciente.responsable || "").replace(/\s+/g, " ").trim();
      if (!respClean) {
        newErrors.responsable = "El responsable es obligatorio para pacientes menores de 18 años.";
      } else if (respClean.length < 3) {
        newErrors.responsable = "El nombre del responsable debe tener al menos 3 caracteres.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors, [
        "brigada_id",
        "nombres",
        "apellidos",
        "sexo",
        "edad",
        "telefono",
        "comunidad",
        "responsable",
      ]);
      return false;
    }

    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Peso: 0.5 - 400 kg
    if (signos.peso !== "" && signos.peso !== null && signos.peso !== undefined) {
      const val = Number(signos.peso);
      if (isNaN(val) || val < 0.5 || val > 400) {
        newErrors.peso = "El peso debe estar entre 0.5 y 400 kg.";
      }
    }

    // Talla: 30 - 250 cm
    if (signos.talla !== "" && signos.talla !== null && signos.talla !== undefined) {
      const val = Number(signos.talla);
      if (isNaN(val) || val < 30 || val > 250) {
        newErrors.talla = "La talla debe estar entre 30 y 250 cm.";
      }
    }

    // Temperatura: 30 - 45 °C
    if (signos.temperatura !== "" && signos.temperatura !== null && signos.temperatura !== undefined) {
      const val = Number(signos.temperatura);
      if (isNaN(val) || val < 30 || val > 45) {
        newErrors.temperatura = "La temperatura debe estar entre 30 y 45 °C.";
      }
    }

    // Frecuencia cardíaca: 20 - 250 lpm
    if (signos.frecuencia_cardiaca !== "" && signos.frecuencia_cardiaca !== null && signos.frecuencia_cardiaca !== undefined) {
      const val = Number(signos.frecuencia_cardiaca);
      if (isNaN(val) || !Number.isInteger(val) || val < 20 || val > 250) {
        newErrors.frecuencia_cardiaca = "La frecuencia cardíaca debe ser un número entero entre 20 y 250 lpm.";
      }
    }

    // Frecuencia respiratoria: 5 - 80 rpm
    if (signos.frecuencia_respiratoria !== "" && signos.frecuencia_respiratoria !== null && signos.frecuencia_respiratoria !== undefined) {
      const val = Number(signos.frecuencia_respiratoria);
      if (isNaN(val) || !Number.isInteger(val) || val < 5 || val > 80) {
        newErrors.frecuencia_respiratoria = "La frecuencia respiratoria debe ser un número entero entre 5 y 80 rpm.";
      }
    }

    // Presión arterial: 120/80 format
    if (signos.presion_arterial) {
      const paClean = signos.presion_arterial.trim();
      if (!/^\d{2,3}\/\d{2,3}$/.test(paClean)) {
        newErrors.presion_arterial = "La presión arterial debe tener el formato Sistólica/Diastólica (ej. 120/80).";
      }
    }

    // Saturación: 0 - 100 %
    if (signos.saturacion !== "" && signos.saturacion !== null && signos.saturacion !== undefined) {
      const val = Number(signos.saturacion);
      if (isNaN(val) || val < 0 || val > 100) {
        newErrors.saturacion = "La saturación debe estar entre 0 y 100 %.";
      }
    }

    // Glucosa: 20 - 700 mg/dL
    if (signos.glucosa !== "" && signos.glucosa !== null && signos.glucosa !== undefined) {
      const val = Number(signos.glucosa);
      if (isNaN(val) || val < 20 || val > 700) {
        newErrors.glucosa = "La glucosa debe estar entre 20 y 700 mg/dL.";
      }
    }

    // Observaciones: Max 1000 caracteres
    if (signos.observaciones && signos.observaciones.length > 1000) {
      newErrors.observaciones = "Las observaciones no deben exceder 1000 caracteres.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors, [
        "peso",
        "talla",
        "temperatura",
        "frecuencia_cardiaca",
        "frecuencia_respiratoria",
        "presion_arterial",
        "saturacion",
        "glucosa",
        "observaciones",
      ]);
      return false;
    }

    return true;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!consulta.tipo_consulta) {
      newErrors.tipo_consulta = "El tipo de consulta es obligatorio.";
    }

    if (!consulta.medico_id) {
      newErrors.medico_id = "Debe seleccionar un médico u odontólogo obligatoriamente.";
    }

    const motivoClean = (consulta.motivo_consulta || "").trim();
    if (!motivoClean) {
      newErrors.motivo_consulta = "El motivo de consulta es obligatorio.";
    } else if (motivoClean.length < 10 || motivoClean.length > 1000) {
      newErrors.motivo_consulta = "El motivo de consulta debe tener entre 10 y 1000 caracteres.";
    }

    const enfClean = (consulta.enfermedad_actual || "").trim();
    if (!enfClean) {
      newErrors.enfermedad_actual = "La enfermedad actual es obligatoria.";
    } else if (enfClean.length < 10 || enfClean.length > 1000) {
      newErrors.enfermedad_actual = "La enfermedad actual debe tener entre 10 y 1000 caracteres.";
    }

    const tratClean = (consulta.tratamiento || "").trim();
    if (!tratClean) {
      newErrors.tratamiento = "El plan de tratamiento es obligatorio.";
    } else if (tratClean.length < 10 || tratClean.length > 1000) {
      newErrors.tratamiento = "El plan de tratamiento debe tener entre 10 y 1000 caracteres.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors, [
        "tipo_consulta",
        "medico_id",
        "motivo_consulta",
        "enfermedad_actual",
        "tratamiento",
      ]);
      return false;
    }

    return true;
  };

  // Step 4 Validation
  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {};

    const rawStr = diagnosticosStr.trim();
    if (!rawStr) {
      newErrors.diagnosticosStr = "Debe ingresar al menos un diagnóstico.";
    } else {
      const cleanOnlyLetters = rawStr.replace(/,/g, "").trim();
      if (!cleanOnlyLetters) {
        newErrors.diagnosticosStr = "No se permiten únicamente comas o espacios.";
      } else {
        const items = rawStr
          .split(",")
          .map((d) => d.replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (items.length === 0) {
          newErrors.diagnosticosStr = "Debe ingresar al menos un diagnóstico válido.";
        } else {
          const invalidItem = items.find((d) => d.length < 3);
          if (invalidItem) {
            newErrors.diagnosticosStr = `Cada diagnóstico debe contener al menos 3 caracteres (ej. "${invalidItem}" es muy corto).`;
          }
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors, ["diagnosticosStr"]);
      return false;
    }

    return true;
  };

  // Tab Navigation Rule: validates before switching forward
  const goToTab = (targetTab: number) => {
    if (targetTab === activeTab) return;

    if (targetTab < activeTab) {
      setErrors({});
      setActiveTab(targetTab);
      return;
    }

    if (activeTab === 1 && !validateStep1()) return;
    if (activeTab === 2 && !validateStep2()) return;
    if (activeTab === 3 && !validateStep3()) return;
    if (activeTab === 4 && !validateStep4()) return;

    if (targetTab > activeTab + 1) {
      if (!validateStep1()) {
        setActiveTab(1);
        return;
      }
      if (!validateStep2()) {
        setActiveTab(2);
        return;
      }
      if (!validateStep3()) {
        setActiveTab(3);
        return;
      }
      if (!validateStep4()) {
        setActiveTab(4);
        return;
      }
    }

    setErrors({});
    setActiveTab(targetTab);
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

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setBackendError("");
    setSuccessMsg("");

    if (!validateStep1()) {
      setActiveTab(1);
      return;
    }
    if (!validateStep2()) {
      setActiveTab(2);
      return;
    }
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

      const p = { ...paciente };
      p.nombres = (p.nombres || "").replace(/\s+/g, " ").trim();
      p.apellidos = (p.apellidos || "").replace(/\s+/g, " ").trim();
      p.codigo = "TEMP-CODE";
      if (p.edad !== "" && p.edad !== null && p.edad !== undefined) {
        p.edad = Number(p.edad);
      } else {
        delete p.edad;
      }

      // Explicitly send NULL for optional date fields if empty (never send "")
      if (!p.fecha_nacimiento || typeof p.fecha_nacimiento !== "string" || !p.fecha_nacimiento.trim()) {
        p.fecha_nacimiento = null;
      } else {
        p.fecha_nacimiento = p.fecha_nacimiento.trim();
      }

      if (p.telefono && p.telefono.trim()) p.telefono = p.telefono.trim();
      else p.telefono = null;

      if (p.comunidad && p.comunidad.trim()) p.comunidad = p.comunidad.replace(/\s+/g, " ").trim();
      else p.comunidad = null;

      if (p.responsable && p.responsable.trim()) p.responsable = p.responsable.replace(/\s+/g, " ").trim();
      else p.responsable = null;

      const s = { ...signos };
      ["peso", "talla", "temperatura", "frecuencia_cardiaca", "frecuencia_respiratoria", "saturacion", "glucosa"].forEach(
        (k) => {
          if (s[k] !== "" && s[k] !== null && s[k] !== undefined) {
            const num = Number(s[k]);
            if (!isNaN(num)) s[k] = num;
            else delete s[k];
          } else {
            delete s[k];
          }
        }
      );
      if (!s.presion_arterial || !s.presion_arterial.trim()) delete s.presion_arterial;
      else s.presion_arterial = s.presion_arterial.trim();
      if (!s.observaciones || !s.observaciones.trim()) delete s.observaciones;
      else s.observaciones = s.observaciones.trim();

      const c = { ...consulta, brigada_id: p.brigada_id };
      c.motivo_consulta = (c.motivo_consulta || "").trim();
      c.enfermedad_actual = (c.enfermedad_actual || "").trim();
      c.tratamiento = (c.tratamiento || "").trim();

      if (!c.fecha_consulta || typeof c.fecha_consulta !== "string" || !c.fecha_consulta.trim()) {
        delete c.fecha_consulta;
      }

      const dList = diagnosticosStr
        .split(",")
        .map((d) => d.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      const mList = medsRecetados.map((m) => ({
        medicamento_id: m.medicamento_id,
        cantidad: m.cantidad,
        indicaciones: m.indicaciones,
      }));

      await createExpedienteCompleto(p, s, c, dList, mList);

      setSuccessMsg("¡Expediente guardado correctamente! Redirigiendo a la lista de pacientes...");
      setTimeout(() => {
        router.push("/administracion/pacientes");
      }, 1500);
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

  // menor de 18 años: el responsable pasa a ser obligatorio
  const esMenor = paciente.edad !== "" && !isNaN(Number(paciente.edad)) && Number(paciente.edad) < 18;

  // la consulta médica la atiende un médico; la odontológica, un odontólogo
  const esMedica = consulta.tipo_consulta === "Medica";
  const profesionales = esMedica ? medicos : odontologos;

  return (
    <div className={styles.stack}>
      {/* Tabs navigation */}
      <ol className={styles.steps} aria-label="Pasos del expediente">
        {STEPS.map((t) => {
          const current = activeTab === t.id;
          const done = t.id < activeTab;
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
        <div className={styles.panelBody}>
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

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-label">
                    Nombres <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    ref={registerRef("nombres")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.nombres}
                    placeholder="Ej. Juan Carlos"
                    value={paciente.nombres}
                    onChange={(e) => {
                      setPaciente({ ...paciente, nombres: e.target.value });
                      if (errors.nombres) setErrors((prev) => ({ ...prev, nombres: "" }));
                    }}
                  />
                  <FieldError msg={errors.nombres} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Apellidos <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    ref={registerRef("apellidos")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.apellidos}
                    placeholder="Ej. Pérez Rodríguez"
                    value={paciente.apellidos}
                    onChange={(e) => {
                      setPaciente({ ...paciente, apellidos: e.target.value });
                      if (errors.apellidos) setErrors((prev) => ({ ...prev, apellidos: "" }));
                    }}
                  />
                  <FieldError msg={errors.apellidos} />
                </label>
              </div>

              <div className="form-grid-3">
                <label className="form-field">
                  <span className="form-label">
                    Sexo <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    ref={registerRef("sexo")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.sexo}
                    value={paciente.sexo}
                    onChange={(e) => {
                      setPaciente({ ...paciente, sexo: e.target.value });
                      if (errors.sexo) setErrors((prev) => ({ ...prev, sexo: "" }));
                    }}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <FieldError msg={errors.sexo} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Edad (Años) <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    ref={registerRef("edad")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.edad}
                    type="number"
                    min="0"
                    max="120"
                    placeholder="Ej. 25"
                    value={paciente.edad}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaciente({ ...paciente, edad: val });
                      if (errors.edad) setErrors((prev) => ({ ...prev, edad: "" }));
                      if (errors.responsable && Number(val) >= 18) {
                        setErrors((prev) => ({ ...prev, responsable: "" }));
                      }
                    }}
                  />
                  <FieldError msg={errors.edad} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Teléfono <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("telefono")}
                    className="form-input"
                    aria-invalid={!!errors.telefono}
                    placeholder="Ej. 99887766 (8 dígitos)"
                    value={paciente.telefono}
                    onChange={(e) => {
                      setPaciente({ ...paciente, telefono: e.target.value });
                      if (errors.telefono) setErrors((prev) => ({ ...prev, telefono: "" }));
                    }}
                  />
                  <FieldError msg={errors.telefono} />
                </label>
              </div>

              <label className="form-field">
                <span className="form-label">
                  Comunidad <span className="form-optional">(Opcional)</span>
                </span>
                <input
                  ref={registerRef("comunidad")}
                  className="form-input"
                  aria-invalid={!!errors.comunidad}
                  placeholder="Ej. Aldea El Cacao"
                  value={paciente.comunidad}
                  onChange={(e) => {
                    setPaciente({ ...paciente, comunidad: e.target.value });
                    if (errors.comunidad) setErrors((prev) => ({ ...prev, comunidad: "" }));
                  }}
                />
                <FieldError msg={errors.comunidad} />
              </label>

              <label className="form-field">
                <span className="form-label">
                  Responsable (Padre/Tutor){" "}
                  {esMenor ? (
                    <span className="form-required" aria-hidden="true">*</span>
                  ) : (
                    <span className="form-optional">(Opcional)</span>
                  )}
                </span>
                <input
                  ref={registerRef("responsable")}
                  className="form-input"
                  aria-required={esMenor}
                  aria-invalid={!!errors.responsable}
                  placeholder={
                    esMenor
                      ? "Obligatorio para menores de 18 años"
                      : "Nombre del padre, madre o tutor legal"
                  }
                  value={paciente.responsable}
                  onChange={(e) => {
                    setPaciente({ ...paciente, responsable: e.target.value });
                    if (errors.responsable) setErrors((prev) => ({ ...prev, responsable: "" }));
                  }}
                />
                <FieldError msg={errors.responsable} />
              </label>
            </div>
          )}

          {/* TAB 2: SIGNOS VITALES */}
          {activeTab === 2 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>2. Signos Vitales del Paciente</h2>
              <p className="form-hint">
                Todos los campos son opcionales. Si ingresas datos, se verificarán sus rangos normales.
              </p>

              <div className="form-grid-3">
                <label className="form-field">
                  <span className="form-label">
                    Peso (kg) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("peso")}
                    className="form-input"
                    aria-invalid={!!errors.peso}
                    type="number"
                    step="0.01"
                    placeholder="0.5 - 400"
                    value={signos.peso}
                    onChange={(e) => {
                      setSignos({ ...signos, peso: e.target.value });
                      if (errors.peso) setErrors((prev) => ({ ...prev, peso: "" }));
                    }}
                  />
                  <FieldError msg={errors.peso} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Talla (cm) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("talla")}
                    className="form-input"
                    aria-invalid={!!errors.talla}
                    type="number"
                    step="0.01"
                    placeholder="30 - 250"
                    value={signos.talla}
                    onChange={(e) => {
                      setSignos({ ...signos, talla: e.target.value });
                      if (errors.talla) setErrors((prev) => ({ ...prev, talla: "" }));
                    }}
                  />
                  <FieldError msg={errors.talla} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Temperatura (°C) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("temperatura")}
                    className="form-input"
                    aria-invalid={!!errors.temperatura}
                    type="number"
                    step="0.1"
                    placeholder="30 - 45"
                    value={signos.temperatura}
                    onChange={(e) => {
                      setSignos({ ...signos, temperatura: e.target.value });
                      if (errors.temperatura) setErrors((prev) => ({ ...prev, temperatura: "" }));
                    }}
                  />
                  <FieldError msg={errors.temperatura} />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-label">
                    Frecuencia Cardíaca (lpm) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("frecuencia_cardiaca")}
                    className="form-input"
                    aria-invalid={!!errors.frecuencia_cardiaca}
                    type="number"
                    placeholder="20 - 250"
                    value={signos.frecuencia_cardiaca}
                    onChange={(e) => {
                      setSignos({ ...signos, frecuencia_cardiaca: e.target.value });
                      if (errors.frecuencia_cardiaca) setErrors((prev) => ({ ...prev, frecuencia_cardiaca: "" }));
                    }}
                  />
                  <FieldError msg={errors.frecuencia_cardiaca} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Frecuencia Respiratoria (rpm) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("frecuencia_respiratoria")}
                    className="form-input"
                    aria-invalid={!!errors.frecuencia_respiratoria}
                    type="number"
                    placeholder="5 - 80"
                    value={signos.frecuencia_respiratoria}
                    onChange={(e) => {
                      setSignos({ ...signos, frecuencia_respiratoria: e.target.value });
                      if (errors.frecuencia_respiratoria) setErrors((prev) => ({ ...prev, frecuencia_respiratoria: "" }));
                    }}
                  />
                  <FieldError msg={errors.frecuencia_respiratoria} />
                </label>
              </div>

              <div className="form-grid-3">
                <label className="form-field">
                  <span className="form-label">
                    Presión Arterial <span className="form-optional">(Opcional, ej. 120/80)</span>
                  </span>
                  <input
                    ref={registerRef("presion_arterial")}
                    className="form-input"
                    aria-invalid={!!errors.presion_arterial}
                    placeholder="120/80"
                    value={signos.presion_arterial}
                    onChange={(e) => {
                      setSignos({ ...signos, presion_arterial: e.target.value });
                      if (errors.presion_arterial) setErrors((prev) => ({ ...prev, presion_arterial: "" }));
                    }}
                  />
                  <FieldError msg={errors.presion_arterial} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Saturación O2 (%) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("saturacion")}
                    className="form-input"
                    aria-invalid={!!errors.saturacion}
                    type="number"
                    placeholder="0 - 100"
                    value={signos.saturacion}
                    onChange={(e) => {
                      setSignos({ ...signos, saturacion: e.target.value });
                      if (errors.saturacion) setErrors((prev) => ({ ...prev, saturacion: "" }));
                    }}
                  />
                  <FieldError msg={errors.saturacion} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Glucosa (mg/dL) <span className="form-optional">(Opcional)</span>
                  </span>
                  <input
                    ref={registerRef("glucosa")}
                    className="form-input"
                    aria-invalid={!!errors.glucosa}
                    type="number"
                    step="0.01"
                    placeholder="20 - 700"
                    value={signos.glucosa}
                    onChange={(e) => {
                      setSignos({ ...signos, glucosa: e.target.value });
                      if (errors.glucosa) setErrors((prev) => ({ ...prev, glucosa: "" }));
                    }}
                  />
                  <FieldError msg={errors.glucosa} />
                </label>
              </div>

              <label className="form-field">
                <span className="form-label">
                  Observaciones de Preclínica <span className="form-optional">(Opcional, máx. 1000 caracteres)</span>
                </span>
                <textarea
                  ref={registerRef("observaciones")}
                  className="form-input"
                  aria-invalid={!!errors.observaciones}
                  rows={3}
                  placeholder="Ej. Paciente llega con acompañante, refiere alergias a penicilina..."
                  value={signos.observaciones}
                  onChange={(e) => {
                    setSignos({ ...signos, observaciones: e.target.value });
                    if (errors.observaciones) setErrors((prev) => ({ ...prev, observaciones: "" }));
                  }}
                />
                <FieldError msg={errors.observaciones} />
              </label>
            </div>
          )}

          {/* TAB 3: CONSULTA */}
          {activeTab === 3 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>3. Consulta Médica / Odontológica</h2>

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-label">
                    Tipo de Consulta <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    ref={registerRef("tipo_consulta")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.tipo_consulta}
                    value={consulta.tipo_consulta}
                    onChange={(e) => {
                      // el profesional depende del tipo de consulta: se vuelve a elegir
                      setConsulta({ ...consulta, tipo_consulta: e.target.value, medico_id: "" });
                      if (errors.tipo_consulta) setErrors((prev) => ({ ...prev, tipo_consulta: "" }));
                    }}
                  >
                    <option value="Medica">Médica</option>
                    <option value="Odontologica">Odontológica</option>
                  </select>
                  <FieldError msg={errors.tipo_consulta} />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Médico / Odontólogo que atendió <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    ref={registerRef("medico_id")}
                    className="form-input"
                    aria-required="true"
                    aria-invalid={!!errors.medico_id}
                    value={consulta.medico_id}
                    disabled={profesionales.length === 0 || isSubmitting}
                    onChange={(e) => {
                      setConsulta({ ...consulta, medico_id: e.target.value });
                      if (errors.medico_id) setErrors((prev) => ({ ...prev, medico_id: "" }));
                    }}
                  >
                    {profesionales.length === 0 ? (
                      <option value="">
                        No hay {esMedica ? "médicos" : "odontólogos"} disponibles
                      </option>
                    ) : (
                      <>
                        <option value="">-- Seleccionar --</option>
                        {profesionales.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre_completo || "Sin Nombre"}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <FieldError msg={errors.medico_id} />
                </label>
              </div>

              <label className="form-field">
                <span className="form-label">
                  Motivo de Consulta <span className="form-required" aria-hidden="true">*</span>
                </span>
                <textarea
                  ref={registerRef("motivo_consulta")}
                  className="form-input"
                  aria-required="true"
                  aria-invalid={!!errors.motivo_consulta}
                  rows={2}
                  placeholder="Mínimo 10 caracteres. Ej. Dolor de cabeza frecuente y fiebre desde hace 2 días."
                  value={consulta.motivo_consulta}
                  onChange={(e) => {
                    setConsulta({ ...consulta, motivo_consulta: e.target.value });
                    if (errors.motivo_consulta) setErrors((prev) => ({ ...prev, motivo_consulta: "" }));
                  }}
                />
                <FieldError msg={errors.motivo_consulta} />
              </label>

              <label className="form-field">
                <span className="form-label">
                  Enfermedad Actual <span className="form-required" aria-hidden="true">*</span>
                </span>
                <textarea
                  ref={registerRef("enfermedad_actual")}
                  className="form-input"
                  aria-required="true"
                  aria-invalid={!!errors.enfermedad_actual}
                  rows={2}
                  placeholder="Mínimo 10 caracteres. Ej. Paciente refiere síntomas de inicio súbito..."
                  value={consulta.enfermedad_actual}
                  onChange={(e) => {
                    setConsulta({ ...consulta, enfermedad_actual: e.target.value });
                    if (errors.enfermedad_actual) setErrors((prev) => ({ ...prev, enfermedad_actual: "" }));
                  }}
                />
                <FieldError msg={errors.enfermedad_actual} />
              </label>

              <label className="form-field">
                <span className="form-label">
                  Plan de Tratamiento <span className="form-required" aria-hidden="true">*</span>
                </span>
                <textarea
                  ref={registerRef("tratamiento")}
                  className="form-input"
                  aria-required="true"
                  aria-invalid={!!errors.tratamiento}
                  rows={3}
                  placeholder="Mínimo 10 caracteres. Ej. Hidratación oral, reposo y administración de analgésicos."
                  value={consulta.tratamiento}
                  onChange={(e) => {
                    setConsulta({ ...consulta, tratamiento: e.target.value });
                    if (errors.tratamiento) setErrors((prev) => ({ ...prev, tratamiento: "" }));
                  }}
                />
                <FieldError msg={errors.tratamiento} />
              </label>

              <label className="form-check">
                <input
                  type="checkbox"
                  checked={consulta.requiere_postclinica}
                  onChange={(e) => setConsulta({ ...consulta, requiere_postclinica: e.target.checked })}
                />
                Requiere Postclínica
              </label>
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICOS */}
          {activeTab === 4 && (
            <div className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>4. Diagnósticos Clínicos</h2>
              <p className="form-hint">
                Ingresa los diagnósticos separados por coma (,). Cada diagnóstico debe tener al menos 3 caracteres.
              </p>

              <label className="form-field">
                <span className="form-label">
                  Diagnósticos <span className="form-required" aria-hidden="true">*</span>
                </span>
                <textarea
                  ref={registerRef("diagnosticosStr")}
                  className="form-input"
                  aria-required="true"
                  aria-invalid={!!errors.diagnosticosStr}
                  rows={4}
                  placeholder="Ej. Faringitis Aguda, Anemia, Cefalea Tensional"
                  value={diagnosticosStr}
                  onChange={(e) => {
                    setDiagnosticosStr(e.target.value);
                    if (errors.diagnosticosStr) setErrors((prev) => ({ ...prev, diagnosticosStr: "" }));
                  }}
                />
                <FieldError msg={errors.diagnosticosStr} />
              </label>
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
                  <label className="form-field">
                    <span className="form-label">
                      Medicamento <span className="form-required" aria-hidden="true">*</span>
                    </span>
                    <select
                      ref={registerRef("newMedId")}
                      className="form-input"
                      aria-required="true"
                      aria-invalid={!!errors.newMedId}
                      value={newMedId}
                      onChange={(e) => {
                        setNewMedId(e.target.value);
                        setRecetaError("");
                        if (errors.newMedId) setErrors((prev) => ({ ...prev, newMedId: "" }));
                      }}
                    >
                      <option value="">-- Seleccionar --</option>
                      {medicamentosList.map((m) => (
                        <option key={m.medicamento_id || m.id} value={m.medicamento_id || m.id}>
                          {m.nombre} (Stock: {m.stock_total || 0})
                        </option>
                      ))}
                    </select>
                    <FieldError msg={errors.newMedId} />
                  </label>
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
          {activeTab < STEPS.length ? (
            <button
              type="button"
              className={`btn-primary btn-sm ${pac.next}`}
              onClick={() => goToTab(activeTab + 1)}
              disabled={isSubmitting}
            >
              {STEPS[activeTab - 1].next}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className={`btn-primary btn-sm ${pac.next}`}
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
      </section>
    </div>
  );
}
