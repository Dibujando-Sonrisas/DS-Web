import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { errorInfo, getLogger } from "@/lib/logger";
import type { EstadoOffline } from "@/lib/offline";

/** Carpeta donde scripts/offline.mjs deja su estado (relativa a la raíz del proyecto). */
export const DIR_OFFLINE = join(process.cwd(), ".offline");

// el panel lee el estado cada 2 s: aquí solo trace/debug para no llenar el log
const logger = getLogger("offline", "estado");

/** Lo último que escribió scripts/offline.mjs; null si este equipo nunca se preparó. */
export function leerEstadoOffline(): EstadoOffline | null {
  let estado: EstadoOffline;
  try {
    estado = JSON.parse(readFileSync(join(DIR_OFFLINE, "estado.json"), "utf8"));
  } catch (e) {
    logger.trace("Offline state not readable", errorInfo(e));
    return null;
  }

  // si el script se cortó a la mitad, el archivo sigue diciendo que corre pero su proceso ya no existe
  if (estado.corriendo && !procesoVivo(estado.pid)) {
    logger.debug("Offline run interrupted", {
      action: estado.accion,
      pid: estado.pid,
    });
    estado.corriendo = false;
    estado.error ??= "La preparación se interrumpió antes de terminar.";
    for (const p of estado.pasos) {
      if (p.estado === "en_curso")
        Object.assign(p, { estado: "error", detalle: "Se interrumpió." });
    }
  }
  return estado;
}

function procesoVivo(pid?: number) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    logger.trace("Process not running", { pid, ...errorInfo(e) });
    return false;
  }
}
