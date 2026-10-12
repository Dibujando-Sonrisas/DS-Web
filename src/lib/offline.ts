/** true en la versión que corre en el equipo servidor de la brigada (npm run offline). */
export const MODO_OFFLINE = process.env.NEXT_PUBLIC_MODO_OFFLINE === "1";

/** Lo que scripts/offline.mjs escribe en .offline/estado.json en cada paso. */
export type EstadoPaso = "pendiente" | "en_curso" | "listo" | "error" | "omitido";

export type PasoOffline = {
  id: string;
  titulo: string;
  estado: EstadoPaso;
  detalle?: string;
  inicio?: string;
  fin?: string;
};

/** Lo que se puede lanzar desde Ajustes → Modo offline (npm run offline:<accion>). */
export type AccionOffline = "sincronizar" | "subir";

export type EstadoOffline = {
  /** iniciar: npm run offline · subir: subir y descargar si en línea cambió algo · sincronizar: subir y descargar todo */
  accion: "iniciar" | AccionOffline;
  corriendo: boolean;
  pid?: number;
  inicio: string;
  fin: string | null;
  error: string | null;
  pasos: PasoOffline[];
  /** desde cuándo la base local está al día con la de línea (descarga o última subida) */
  sesion?: { id: string; preparadaEn: string };
  /** direcciones con las que las otras computadoras abren el sistema */
  urls?: string[];
  build?: string;
};
