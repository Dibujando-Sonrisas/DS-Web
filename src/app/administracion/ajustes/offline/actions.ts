"use server";

import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { errorInfo, getLogger } from "@/lib/logger";
import { type AccionOffline, MODO_OFFLINE } from "@/lib/offline";
import { DIR_OFFLINE, leerEstadoOffline } from "./estado";

type ActionResponse = { error?: string };

const logger = getLogger("offline");

const ACCIONES: AccionOffline[] = ["sincronizar", "subir"];

/**
 * Ajustes → Modo offline: vuelve a descargar los datos en línea o sube lo hecho offline
 * (lo mismo que npm run offline:sincronizar / offline:subir). Corre aparte; el panel sigue su avance.
 */
export async function ejecutarOfflineAction(
  accion: AccionOffline
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.AJUSTES_UPDATE);
    if (!ACCIONES.includes(accion)) throw new Error("Acción no válida.");
    if (!MODO_OFFLINE)
      throw new Error(
        "Solo se puede hacer desde el servidor offline de la brigada."
      );
    if (leerEstadoOffline()?.corriendo)
      throw new Error("Ya hay una sincronización o subida en curso.");

    mkdirSync(DIR_OFFLINE, { recursive: true });
    const log = openSync(join(DIR_OFFLINE, `${accion}.log`), "w");
    const hijo = spawn(
      process.execPath,
      [join(process.cwd(), "scripts", "offline.mjs"), accion],
      {
        detached: true,
        stdio: ["ignore", log, log],
        windowsHide: true,
      }
    );
    hijo.unref();
    closeSync(log);
    logger.info("Offline action launched", { action: accion, pid: hijo.pid });

    // esperar a que el script anote que arrancó, para que el panel ya lo muestre en curso
    for (let i = 0; i < 20 && leerEstadoOffline()?.pid !== hijo.pid; i++) {
      await new Promise((r) => setTimeout(r, 150));
    }
    return {};
  } catch (e) {
    logger.warning("Offline action not launched", {
      action: accion,
      ...errorInfo(e),
    });
    return { error: e instanceof Error ? e.message : "No se pudo iniciar." };
  }
}
