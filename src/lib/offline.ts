export const MODO_OFFLINE = process.env.NEXT_PUBLIC_MODO_OFFLINE === "1";

export type EstadoPaso =
  | "pendiente"
  | "en_curso"
  | "listo"
  | "error"
  | "omitido";

export type PasoOffline = {
  id: string;
  titulo: string;
  estado: EstadoPaso;
  detalle?: string;
  inicio?: string;
  fin?: string;
};

export type AccionOffline = "sincronizar" | "subir";

export type EstadoOffline = {
  accion: "iniciar" | AccionOffline;
  corriendo: boolean;
  pid?: number;
  inicio: string;
  fin: string | null;
  error: string | null;
  pasos: PasoOffline[];
  sesion?: { id: string; preparadaEn: string };
  urls?: string[];
  build?: string;
};
