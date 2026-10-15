/**
 * Utilidades de Codificación de Datos y Generación de Claves (Capítulo 11 - Kendall & Kendall)
 *
 * Reglas de Codificación:
 * 1. Códigos Mnemónicos y Subconjuntos de Dígitos Significativos.
 * 2. Eliminación estricta de caracteres confusos/ambiguos (O vs 0, I vs 1, Z vs 2).
 * 3. Fechas estandarizadas en formato ordenable AAAA-MM-DD.
 * 4. Algoritmos de autovalidación para documentos de identidad (DNI de Honduras).
 */

import { errorInfo, getLogger } from "@/lib/logger";

const logger = getLogger("coding");

// Alfabeto Base32 Crockford limpio sin caracteres ambiguos (Excluye I, L, O, U)
const CLEAN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Genera un código de negocio conciso, único y estable.
 * @param prefix Prefijo mnemónico del recurso (ej. 'MED', 'PAC', 'VTA', 'DON')
 * @param sequence Número o secuencial numérico a formatear
 * @param length Longitud deseada de la secuencia de relleno
 */
export function generateCleanCode(
  prefix: string,
  sequence: number | string,
  length: number = 4
): string {
  const cleanPrefix = prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  const seqStr = String(sequence).padStart(length, "0");
  return `${cleanPrefix}-${seqStr}`;
}

/**
 * Genera un token/clave aleatoria limpia sin caracteres confusos/ambiguos (evita 0/O, 1/I, 2/Z).
 * @param length Longitud del token
 */
export function generateCleanToken(length: number = 8): string {
  let result = "";
  const chars = "3456789ABCDEFGHJKMNPQRSTVWXYZ"; // Alfabeto ultra-limpio sin 0, 1, 2, I, O, Z
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Formatea una fecha o cadena ISO a formato ordenable estandarizado AAAA-MM-DD.
 */
export function formatSortableDate(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.debug("Date formatting failed", errorInfo(error));
    return "";
  }
}

/**
 * Códigos oficiales de los 18 Departamentos de Honduras para validación de DNI.
 */
export const DEPARTAMENTOS_HONDURAS_CODES: Record<string, string> = {
  "01": "Atlántida",
  "02": "Colón",
  "03": "Comayagua",
  "04": "Copán",
  "05": "Cortés",
  "06": "Choluteca",
  "07": "El Paraíso",
  "08": "Francisco Morazán",
  "09": "Gracias a Dios",
  "10": "Intibucá",
  "11": "Islas de la Bahía",
  "12": "La Paz",
  "13": "Lempira",
  "14": "Ocotepeque",
  "15": "Olancho",
  "16": "Santa Bárbara",
  "17": "Valle",
  "18": "Yoro",
};

/**
 * Validación semántica y sintáctica de Cédula de Identidad / DNI de Honduras (Capítulo 15).
 * Estructura: DDPP-AAAA-NNNNN (13 dígitos sin guiones)
 * - DD: Código de departamento (01 a 18)
 * - PP: Código de municipio
 * - AAAA: Año de inscripción o nacimiento (rango sensato 1900 a año actual)
 * - NNNNN: Correlativo numérico de 5 dígitos
 */
export function validateHondurasDNI(dni: string): {
  isValid: boolean;
  message?: string;
} {
  if (!dni) {
    return { isValid: true }; // Si es opcional
  }

  const cleanDNI = dni.replace(/[^0-9]/g, "");

  // 1. Prueba de longitud exacta (13 dígitos)
  if (cleanDNI.length !== 13) {
    return {
      isValid: false,
      message: `Prueba de longitud: El DNI debe tener exactamente 13 dígitos numéricos (actualmente tiene ${cleanDNI.length}).`,
    };
  }

  // 2. Prueba de composición / sintaxis (solo dígitos)
  if (!/^\d{13}$/.test(cleanDNI)) {
    return {
      isValid: false,
      message:
        "Prueba de composición: El DNI solo debe contener caracteres numéricos.",
    };
  }

  // 3. Prueba de rango y semántica en código de departamento
  const deptCode = cleanDNI.substring(0, 2);
  if (!DEPARTAMENTOS_HONDURAS_CODES[deptCode]) {
    return {
      isValid: false,
      message: `Prueba de valores válidos: El código de departamento '${deptCode}' no pertenece a los 18 departamentos oficiales de Honduras (01-18).`,
    };
  }

  // 4. Prueba de rango y sensatez en año (posiciones 5 a 8)
  const yearStr = cleanDNI.substring(4, 8);
  const year = parseInt(yearStr, 10);
  const currentYear = new Date().getFullYear();

  if (year < 1900 || year > currentYear) {
    return {
      isValid: false,
      message: `Prueba de sensatez: El año registrado en el DNI (${year}) está fuera del rango coherente (1900-${currentYear}).`,
    };
  }

  return { isValid: true };
}
