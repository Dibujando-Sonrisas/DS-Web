import { z } from "zod";
import { validateHondurasDNI } from "../coding/codingUtils";

export const REGEX_PATTERNS = {
  HONDURAS_PHONE: /^[2389]\d{7}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  ONLY_ALPHA: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  ALPHANUMERIC_CODE: /^[A-Z0-9-]+$/,
};

export const phoneHondurasSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => {
      if (!val || val === "") return true;
      const clean = val.replace(/[^0-9]/g, "");
      return REGEX_PATTERNS.HONDURAS_PHONE.test(clean);
    },
    {
      message:
        "Prueba de sintaxis: El teléfono de Honduras debe tener exactamente 8 dígitos y comenzar con 2, 3, 8 o 9.",
    }
  );

export const dniHondurasSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => {
      if (!val || val === "") return true;
      const result = validateHondurasDNI(val);
      return result.isValid;
    },
    {
      message:
        "Prueba de sintaxis y rango: DNI de Honduras inválido. Debe tener 13 dígitos numéricos y departamento (01-18) válido.",
    }
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Prueba de presencia: El correo electrónico es obligatorio.")
  .refine((val) => REGEX_PATTERNS.EMAIL.test(val), {
    message: "Prueba de sintaxis: Ingrese una dirección de correo electrónico válida (ej. usuario@dominio.com).",
  });

export function sanitizeNumberInput(val: unknown, fallback: number = 0): number {
  if (val === "" || val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}
