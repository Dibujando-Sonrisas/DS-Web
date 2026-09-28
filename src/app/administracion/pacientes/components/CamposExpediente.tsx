"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import { CircleAlert } from "lucide-react";
import type { Datos, Errores } from "@/lib/validation/expediente";

// Campos de cada etapa del expediente: los usan el asistente de nuevo expediente y la edición del expediente.

type CamposProps<T = Datos> = {
  value: T;
  setValue: (value: T) => void;
  errors: Errores;
  setErrors: Dispatch<SetStateAction<Errores>>;
  registerRef: (name: string) => (el: HTMLElement | null) => void;
};

/** Mensaje de error bajo un campo. */
export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className="form-error">
      <CircleAlert size={14} aria-hidden="true" />
      {msg}
    </span>
  );
}

/** Refs de los campos para llevar el foco al primer error. */
export function useFieldFocus() {
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const registerRef = (name: string) => (el: HTMLElement | null) => {
    fieldRefs.current[name] = el;
  };

  const focusFirstError = (errs: Errores, fieldOrder: string[]) => {
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

  return { registerRef, focusFirstError };
}

/** Datos personales (la brigada se elige aparte: solo al ingresar al paciente). */
export function CamposPaciente({ value, setValue, errors, setErrors, registerRef }: CamposProps) {
  // menor de 18 años: el responsable pasa a ser obligatorio
  const esMenor = value.edad !== "" && !isNaN(Number(value.edad)) && Number(value.edad) < 18;

  return (
    <>
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
            value={value.nombres}
            onChange={(e) => {
              setValue({ ...value, nombres: e.target.value });
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
            value={value.apellidos}
            onChange={(e) => {
              setValue({ ...value, apellidos: e.target.value });
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
            value={value.sexo}
            onChange={(e) => {
              setValue({ ...value, sexo: e.target.value });
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
            value={value.edad}
            onChange={(e) => {
              const val = e.target.value;
              setValue({ ...value, edad: val });
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
            value={value.telefono}
            onChange={(e) => {
              setValue({ ...value, telefono: e.target.value });
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
          value={value.comunidad}
          onChange={(e) => {
            setValue({ ...value, comunidad: e.target.value });
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
          value={value.responsable}
          onChange={(e) => {
            setValue({ ...value, responsable: e.target.value });
            if (errors.responsable) setErrors((prev) => ({ ...prev, responsable: "" }));
          }}
        />
        <FieldError msg={errors.responsable} />
      </label>
    </>
  );
}

export function CamposSignos({ value, setValue, errors, setErrors, registerRef }: CamposProps) {
  return (
    <>
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
            value={value.peso}
            onChange={(e) => {
              setValue({ ...value, peso: e.target.value });
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
            value={value.talla}
            onChange={(e) => {
              setValue({ ...value, talla: e.target.value });
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
            value={value.temperatura}
            onChange={(e) => {
              setValue({ ...value, temperatura: e.target.value });
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
            value={value.frecuencia_cardiaca}
            onChange={(e) => {
              setValue({ ...value, frecuencia_cardiaca: e.target.value });
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
            value={value.frecuencia_respiratoria}
            onChange={(e) => {
              setValue({ ...value, frecuencia_respiratoria: e.target.value });
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
            value={value.presion_arterial}
            onChange={(e) => {
              setValue({ ...value, presion_arterial: e.target.value });
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
            value={value.saturacion}
            onChange={(e) => {
              setValue({ ...value, saturacion: e.target.value });
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
            value={value.glucosa}
            onChange={(e) => {
              setValue({ ...value, glucosa: e.target.value });
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
          value={value.observaciones}
          onChange={(e) => {
            setValue({ ...value, observaciones: e.target.value });
            if (errors.observaciones) setErrors((prev) => ({ ...prev, observaciones: "" }));
          }}
        />
        <FieldError msg={errors.observaciones} />
      </label>
    </>
  );
}

export function CamposConsulta({
  value,
  setValue,
  errors,
  setErrors,
  registerRef,
  medicos,
  odontologos,
}: CamposProps & { medicos: Datos[]; odontologos: Datos[] }) {
  // la consulta médica la atiende un médico; la odontológica, un odontólogo
  const esMedica = value.tipo_consulta === "Medica";
  const profesionales = esMedica ? medicos : odontologos;

  return (
    <>
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
            value={value.tipo_consulta}
            onChange={(e) => {
              // el profesional depende del tipo de consulta: se vuelve a elegir
              setValue({ ...value, tipo_consulta: e.target.value, medico_id: "" });
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
            value={value.medico_id}
            disabled={profesionales.length === 0}
            onChange={(e) => {
              setValue({ ...value, medico_id: e.target.value });
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
          value={value.motivo_consulta}
          onChange={(e) => {
            setValue({ ...value, motivo_consulta: e.target.value });
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
          value={value.enfermedad_actual}
          onChange={(e) => {
            setValue({ ...value, enfermedad_actual: e.target.value });
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
          value={value.tratamiento}
          onChange={(e) => {
            setValue({ ...value, tratamiento: e.target.value });
            if (errors.tratamiento) setErrors((prev) => ({ ...prev, tratamiento: "" }));
          }}
        />
        <FieldError msg={errors.tratamiento} />
      </label>

      <label className="form-check">
        <input
          type="checkbox"
          checked={value.requiere_postclinica}
          onChange={(e) => setValue({ ...value, requiere_postclinica: e.target.checked })}
        />
        Requiere Postclínica
      </label>
    </>
  );
}

export function CampoDiagnosticos({ value, setValue, errors, setErrors, registerRef }: CamposProps<string>) {
  return (
    <>
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
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (errors.diagnosticosStr) setErrors((prev) => ({ ...prev, diagnosticosStr: "" }));
          }}
        />
        <FieldError msg={errors.diagnosticosStr} />
      </label>
    </>
  );
}
