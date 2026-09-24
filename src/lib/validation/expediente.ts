// Reglas y limpieza de los datos del expediente. Las comparten el asistente de nuevo
// expediente, la edición desde la vista del expediente y las acciones del servidor.

// los formularios guardan lo que escribe el usuario (texto) o lo que vino de la base
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Datos = Record<string, any>;
export type Errores = Record<string, string>;

const vacio = (v: unknown) => v === "" || v === null || v === undefined;
const texto = (v: unknown) => String(v ?? "").trim();
const sinEspaciosDobles = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const NOMBRE = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

/** Fila de la base al estado de un formulario: los null pasan a "" para los inputs controlados. */
export const sinNulos = (row: Datos): Datos =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ""]));

// orden de los campos en pantalla: el foco va al primer error
export const CAMPOS_PACIENTE = ["nombres", "apellidos", "sexo", "edad", "telefono", "comunidad", "responsable"];
export const CAMPOS_SIGNOS = [
  "peso",
  "talla",
  "temperatura",
  "frecuencia_cardiaca",
  "frecuencia_respiratoria",
  "presion_arterial",
  "saturacion",
  "glucosa",
  "observaciones",
];
export const CAMPOS_CONSULTA = ["tipo_consulta", "medico_id", "motivo_consulta", "enfermedad_actual", "tratamiento"];

const esMenorDeEdad = (edad: unknown) => !vacio(edad) && !isNaN(Number(edad)) && Number(edad) < 18;

export function validarPaciente(p: Datos): Errores {
  const e: Errores = {};

  const nombres = sinEspaciosDobles(p.nombres);
  if (!nombres) e.nombres = "El nombre es obligatorio.";
  else if (nombres.length < 3 || nombres.length > 100) e.nombres = "Los nombres deben tener entre 3 y 100 caracteres.";
  else if (!NOMBRE.test(nombres)) e.nombres = "Los nombres solo deben contener letras, espacios y acentos.";

  const apellidos = sinEspaciosDobles(p.apellidos);
  if (!apellidos) e.apellidos = "Los apellidos son obligatorios.";
  else if (apellidos.length < 3 || apellidos.length > 100)
    e.apellidos = "Los apellidos deben tener entre 3 y 100 caracteres.";
  else if (!NOMBRE.test(apellidos)) e.apellidos = "Los apellidos solo deben contener letras, espacios y acentos.";

  if (!p.sexo) e.sexo = "El sexo es obligatorio.";

  if (vacio(p.edad)) {
    e.edad = "La edad es obligatoria.";
  } else {
    const edad = Number(p.edad);
    if (isNaN(edad) || !Number.isInteger(edad) || edad < 0 || edad > 120)
      e.edad = "La edad debe ser un número entero entre 0 y 120.";
  }

  // teléfono y comunidad son opcionales; si se ingresan, se verifican
  if (p.telefono && !/^\d{8}$/.test(texto(p.telefono)))
    e.telefono = "El teléfono debe contener exactamente 8 números (formato Honduras).";

  if (p.comunidad && sinEspaciosDobles(p.comunidad).length < 3)
    e.comunidad = "La comunidad debe contener al menos 3 caracteres.";

  // menor de 18 años: el responsable pasa a ser obligatorio
  if (esMenorDeEdad(p.edad)) {
    const responsable = sinEspaciosDobles(p.responsable);
    if (!responsable) e.responsable = "El responsable es obligatorio para pacientes menores de 18 años.";
    else if (responsable.length < 3) e.responsable = "El nombre del responsable debe tener al menos 3 caracteres.";
  }

  return e;
}

// rangos de los signos vitales; todos son opcionales
const RANGOS: { campo: string; min: number; max: number; entero?: boolean; msg: string }[] = [
  { campo: "peso", min: 0.5, max: 400, msg: "El peso debe estar entre 0.5 y 400 kg." },
  { campo: "talla", min: 30, max: 250, msg: "La talla debe estar entre 30 y 250 cm." },
  { campo: "temperatura", min: 30, max: 45, msg: "La temperatura debe estar entre 30 y 45 °C." },
  {
    campo: "frecuencia_cardiaca",
    min: 20,
    max: 250,
    entero: true,
    msg: "La frecuencia cardíaca debe ser un número entero entre 20 y 250 lpm.",
  },
  {
    campo: "frecuencia_respiratoria",
    min: 5,
    max: 80,
    entero: true,
    msg: "La frecuencia respiratoria debe ser un número entero entre 5 y 80 rpm.",
  },
  { campo: "saturacion", min: 0, max: 100, msg: "La saturación debe estar entre 0 y 100 %." },
  { campo: "glucosa", min: 20, max: 700, msg: "La glucosa debe estar entre 20 y 700 mg/dL." },
];

export function validarSignos(s: Datos): Errores {
  const e: Errores = {};

  for (const r of RANGOS) {
    if (vacio(s[r.campo])) continue;
    const val = Number(s[r.campo]);
    if (isNaN(val) || (r.entero && !Number.isInteger(val)) || val < r.min || val > r.max) e[r.campo] = r.msg;
  }

  if (s.presion_arterial && !/^\d{2,3}\/\d{2,3}$/.test(texto(s.presion_arterial)))
    e.presion_arterial = "La presión arterial debe tener el formato Sistólica/Diastólica (ej. 120/80).";

  if (s.observaciones && String(s.observaciones).length > 1000)
    e.observaciones = "Las observaciones no deben exceder 1000 caracteres.";

  return e;
}

export function validarConsulta(c: Datos): Errores {
  const e: Errores = {};

  if (!c.tipo_consulta) e.tipo_consulta = "El tipo de consulta es obligatorio.";
  if (!c.medico_id) e.medico_id = "Debe seleccionar un médico u odontólogo obligatoriamente.";

  const textos: [string, string, string][] = [
    ["motivo_consulta", "El motivo de consulta es obligatorio.", "El motivo de consulta"],
    ["enfermedad_actual", "La enfermedad actual es obligatoria.", "La enfermedad actual"],
    ["tratamiento", "El plan de tratamiento es obligatorio.", "El plan de tratamiento"],
  ];
  for (const [campo, obligatorio, nombre] of textos) {
    const val = texto(c[campo]);
    if (!val) e[campo] = obligatorio;
    else if (val.length < 10 || val.length > 1000) e[campo] = `${nombre} debe tener entre 10 y 1000 caracteres.`;
  }

  return e;
}

/** Los diagnósticos se escriben separados por coma. */
export function listaDiagnosticos(str: string): string[] {
  return str
    .split(",")
    .map((d) => d.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function validarDiagnosticos(str: string): Errores {
  const raw = str.trim();
  if (!raw) return { diagnosticosStr: "Debe ingresar al menos un diagnóstico." };
  if (!raw.replace(/,/g, "").trim()) return { diagnosticosStr: "No se permiten únicamente comas o espacios." };

  const items = listaDiagnosticos(raw);
  if (items.length === 0) return { diagnosticosStr: "Debe ingresar al menos un diagnóstico válido." };

  const corto = items.find((d) => d.length < 3);
  if (corto)
    return {
      diagnosticosStr: `Cada diagnóstico debe contener al menos 3 caracteres (ej. "${corto}" es muy corto).`,
    };

  return {};
}

// Limpieza antes de guardar: solo los campos editables, sin espacios de más y con null en lo vacío

export function limpiarPaciente(p: Datos) {
  return {
    nombres: sinEspaciosDobles(p.nombres),
    apellidos: sinEspaciosDobles(p.apellidos),
    sexo: String(p.sexo),
    edad: Number(p.edad),
    telefono: texto(p.telefono) || null,
    comunidad: sinEspaciosDobles(p.comunidad) || null,
    responsable: sinEspaciosDobles(p.responsable) || null,
  };
}

export function limpiarSignos(s: Datos) {
  const numero = (v: unknown) => (vacio(v) || isNaN(Number(v)) ? null : Number(v));
  return {
    peso: numero(s.peso),
    talla: numero(s.talla),
    temperatura: numero(s.temperatura),
    frecuencia_cardiaca: numero(s.frecuencia_cardiaca),
    frecuencia_respiratoria: numero(s.frecuencia_respiratoria),
    presion_arterial: texto(s.presion_arterial) || null,
    saturacion: numero(s.saturacion),
    glucosa: numero(s.glucosa),
    observaciones: texto(s.observaciones) || null,
  };
}

export function limpiarConsulta(c: Datos) {
  return {
    tipo_consulta: String(c.tipo_consulta),
    medico_id: String(c.medico_id),
    motivo_consulta: texto(c.motivo_consulta),
    enfermedad_actual: texto(c.enfermedad_actual),
    tratamiento: texto(c.tratamiento),
    requiere_postclinica: !!c.requiere_postclinica,
  };
}

/** Para las acciones del servidor: rechaza con el primer error encontrado. */
export function assertValido(errores: Errores) {
  const msg = Object.values(errores)[0];
  if (msg) throw new Error(msg);
}
