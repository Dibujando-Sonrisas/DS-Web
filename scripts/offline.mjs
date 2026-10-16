// Modo offline: convierte este equipo en el servidor de la brigada.
//
//   npm run offline              prepara (si hace falta), compila y arranca la app en la red local
//   npm run offline:subir        sube lo hecho offline y, si en línea cambió algo, lo descarga
//   npm run offline:sincronizar  sube lo hecho offline y vuelve a descargar todo
//   (subir y sincronizar también se lanzan desde Ajustes → Modo offline)
//
// Preparar solo LEE la base en línea (SUPABASE_DB_URL en .env): copia sus datos a la base
// local (Supabase en Docker) y desde ahí cada cambio queda anotado en offline.cambios.
// Subir compara cada registro tocado con su versión en línea (scripts/offline-subida.sql):
// combina lo que se pueda y, si chocan, gana lo de la brigada y queda anotado.
// Cada paso se imprime en la consola y queda en .offline/estado.json para el panel.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  configureSync,
  getConsoleSink,
  getLogfmtFormatter,
  getLogger,
} from "@logtape/logtape";

// Traza técnica en inglés (logfmt) para soporte; lo que lee el operador sigue saliendo por log().
// Nunca registrar SUPABASE_DB_URL (lleva la contraseña), SQL ni datos de la subida.
configureSync({
  sinks: { console: getConsoleSink({ formatter: getLogfmtFormatter() }) },
  loggers: [
    { category: ["ds-webapp"], lowestLevel: "info", sinks: ["console"] },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
});
const logger = getLogger(["ds-webapp", "offline"]);

// mismo criterio que errorInfo de src/lib/logger.ts, más las cadenas de conexión
const SENSIBLE =
  /postgres(?:ql)?:\/\/\S+|[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+|\d{8,}/g;
function errorInfo(e) {
  return {
    errorName: e?.name,
    errorMessage: String(e?.message ?? e)
      .replace(SENSIBLE, "[redacted]")
      .slice(0, 300),
  };
}

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
process.chdir(RAIZ);
// SUPABASE_DB_URL y las demás variables del proyecto (las que ya tiene el proceso mandan)
if (existsSync(".env")) process.loadEnvFile(".env");

const DIR = join(RAIZ, ".offline");
const ARCHIVO_ESTADO = join(DIR, "estado.json");
const ARCHIVO_DATOS = join(DIR, "datos.sql");
const SUPABASE_CLI = join(
  RAIZ,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js"
);
const NEXT_CLI = join(RAIZ, "node_modules", "next", "dist", "bin", "next");
const PUERTO = "3000";

const PROYECTO = readFileSync("supabase/config.toml", "utf8").match(
  /^project_id = "(.+)"/m
)[1];
const CONTENEDOR_DB = `supabase_db_${PROYECTO}`;
// la base local vista desde su propio contenedor, donde corre psql
const BASE_LOCAL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
// la base en línea: se lee al preparar y al descargar; al subir se escribe en una sola transacción
const NUBE = process.env.SUPABASE_DB_URL;

const PASOS = {
  docker: "Docker en ejecución",
  supabase: "Base de datos local",
  pendientes: "Cambios sin subir",
  esquema: "Versión de la base",
  descarga: "Descarga de los datos en línea",
  carga: "Carga en la base local",
  registro: "Registro de cambios offline",
  compilar: "Compilación de la versión offline",
  servidor: "Servidor en la red local",
  cambios: "Cambios por subir",
  nube: "Cambios en línea",
  subida: "Subida a la base en línea",
};
const PASOS_DATOS = ["pendientes", "esquema", "descarga", "carga", "registro"];
const PASOS_SINCRONIZAR = [
  "cambios",
  "esquema",
  "nube",
  "subida",
  "descarga",
  "carga",
  "registro",
];
const PASOS_POR_ACCION = {
  iniciar: ["docker", "supabase", ...PASOS_DATOS, "compilar", "servidor"],
  subir: ["docker", "supabase", ...PASOS_SINCRONIZAR],
  sincronizar: ["docker", "supabase", ...PASOS_SINCRONIZAR],
};
const FALLO = {
  iniciar: "El modo offline no se pudo iniciar.",
  sincronizar: "La sincronización no terminó.",
  subir: "La subida no terminó.",
};

const accion = PASOS_POR_ACCION[process.argv[2]] ? process.argv[2] : "iniciar";
const ids = PASOS_POR_ACCION[accion];

// ── estado para el panel ──────────────────────────────────────────────

const previo = leerJson(ARCHIVO_ESTADO) ?? {};
if (previo.corriendo && previo.pid !== process.pid && procesoVivo(previo.pid)) {
  logger.warning("Offline run rejected: another run in progress", {
    action: accion,
    runningPid: previo.pid,
  });
  console.error(
    `Ya hay una preparación, sincronización o subida en curso (proceso ${previo.pid}).`
  );
  process.exit(1);
}

const estado = {
  ...previo,
  accion,
  corriendo: true,
  pid: process.pid,
  inicio: ahora(),
  fin: null,
  error: null,
  pasos: ids.map((id) => ({ id, titulo: PASOS[id], estado: "pendiente" })),
};
guardar();
const inicioCorrida = Date.now();
logger.info("Offline run started", { action: accion, pid: process.pid });

function guardar() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(ARCHIVO_ESTADO, JSON.stringify(estado, null, 2));
}

async function paso(id, hacer) {
  const p = estado.pasos.find((x) => x.id === id);
  Object.assign(p, { estado: "en_curso", inicio: ahora() });
  guardar();
  log(`→ ${p.titulo}...`);
  const inicio = Date.now();
  try {
    const detalle = await hacer();
    Object.assign(p, { estado: "listo", detalle, fin: ahora() });
    log(`✓ ${p.titulo}${detalle ? `: ${detalle}` : ""}`);
    logger.info("Step completed", {
      step: id,
      durationMs: Date.now() - inicio,
    });
  } catch (e) {
    Object.assign(p, { estado: "error", detalle: e.message, fin: ahora() });
    log(`✗ ${p.titulo}: ${e.message}`);
    logger.error("Step failed", {
      step: id,
      durationMs: Date.now() - inicio,
      ...errorInfo(e),
    });
    throw e;
  } finally {
    guardar();
  }
}

function omitir(id, detalle) {
  const p = estado.pasos.find((x) => x.id === id);
  Object.assign(p, { estado: "omitido", detalle });
  log(`- ${p.titulo}: ${detalle}`);
  logger.info("Step skipped", { step: id });
  guardar();
}

// ── pasos ─────────────────────────────────────────────────────────────

let entorno; // variables con las que se compila y arranca la versión offline

try {
  await paso("docker", async () => {
    try {
      return `Docker ${await ejecutar("docker", ["info", "--format", "{{.ServerVersion}}"])}`;
    } catch (e) {
      logger.warning("Docker not responding", errorInfo(e));
      throw new Error(
        "Docker no responde: abre Docker Desktop y vuelve a intentarlo."
      );
    }
  });

  await paso("supabase", async () => {
    let yaCorria = true;
    let status = await statusSupabase().catch((e) => {
      logger.debug("Local Supabase status unavailable", errorInfo(e));
      return null;
    });
    if (!status) {
      yaCorria = false;
      logger.info("Local Supabase starting");
      log(
        "  Iniciando Supabase local (la primera vez descarga las imágenes y tarda varios minutos)..."
      );
      await ejecutar(process.execPath, [SUPABASE_CLI, "start"], {
        mostrar: true,
      });
      status = await statusSupabase();
    }
    entorno = {
      NEXT_PUBLIC_MODO_OFFLINE: "1",
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SECRET_KEY: status.SERVICE_ROLE_KEY,
    };
    return `${yaCorria ? "Ya estaba en marcha" : "Iniciada"} en ${status.API_URL}`;
  });

  const preparadaEn = accion === "iniciar" ? await sesionLocal() : null;
  if (accion !== "iniciar") {
    await sincronizarConNube(accion === "sincronizar");
  } else if (preparadaEn) {
    await instalarRegistro(); // al día con esta versión del código
    for (const id of PASOS_DATOS)
      omitir(id, `Datos ya descargados el ${fechaLegible(preparadaEn)}`);
  } else {
    await prepararDatos();
  }

  if (accion === "iniciar") {
    if (preparadaEn && !compilacionVieja())
      omitir("compilar", "Ya estaba compilada con este código");
    else await paso("compilar", compilar);
    await paso("servidor", arrancarServidor);
  }
} catch (e) {
  estado.error = e.message;
  process.exitCode = 1;
  log(FALLO[accion]);
  logger.error("Offline run failed", { action: accion, ...errorInfo(e) });
} finally {
  estado.corriendo = false;
  estado.fin = ahora();
  guardar();
  rmSync(ARCHIVO_DATOS, { force: true }); // trae datos de pacientes y contraseñas cifradas
  logger.info("Offline run finished", {
    action: accion,
    ok: !estado.error,
    durationMs: Date.now() - inicioCorrida,
  });
}

async function prepararDatos() {
  await paso("pendientes", async () => {
    const n = await cambiosPendientes();
    if (n > 0) {
      logger.warning("Download blocked by pending offline changes", {
        pending: n,
      });
      throw new Error(
        `Hay ${n} cambios hechos offline que todavía no se subieron; descargar de nuevo los borraría. Súbelos primero (Subir cambios o npm run offline:subir).`
      );
    }
    return "Ninguno";
  });
  await paso("esquema", verificarEsquema);
  await paso("descarga", descargarDatos);
  await paso("carga", cargarDatos);
  await paso("registro", iniciarRegistro);
}

/**
 * Subir lo hecho offline y traer lo de línea. Cada registro tocado aquí se compara con su
 * versión en línea; lo que solo cambió en línea llega con la descarga, que se salta si allá
 * no cambió nada (salvo `descargarSiempre`).
 */
async function sincronizarConNube(descargarSiempre) {
  let sesion = null;
  let pendientes = 0;
  await paso("cambios", async () => {
    await instalarRegistro(); // por si se preparó con una versión anterior del registro
    const fila = await consultar(
      BASE_LOCAL,
      "select id, to_json(preparada_en) #>> '{}', subiendo_id, subiendo_hasta from offline.sesion limit 1"
    );
    pendientes = await cambiosPendientes();
    if (fila) {
      const [id, preparadaEn, subiendoId, subiendoHasta] = fila.split("|");
      sesion = {
        id,
        preparadaEn,
        subiendoId: subiendoId || null,
        subiendoHasta: Number(subiendoHasta) || 0,
      };
    } else if (pendientes || !descargarSiempre) {
      throw new Error(
        "Este equipo no tiene datos descargados: prepáralo primero con npm run offline."
      );
    }
    const tablas = await consultar(
      BASE_LOCAL,
      "select count(distinct tabla) from offline.cambios"
    );
    return pendientes ? `${pendientes} cambios en ${tablas} tablas` : "Ninguno";
  });

  await paso("esquema", verificarEsquema);

  let cambiadas = [];
  await paso("nube", async () => {
    if (!sesion) return "Sin datos descargados: se descarga todo";
    // una subida anterior que se cortó después de guardar en línea: solo falta limpiar el registro
    if (
      sesion.subiendoId &&
      (await consultar(
        NUBE,
        `select exists (select 1 from public.registros_offline where sesion_id = '${sesion.subiendoId}')`
      )) === "t"
    ) {
      await consultar(
        BASE_LOCAL,
        `delete from offline.cambios where id <= ${sesion.subiendoHasta};
         update offline.sesion set subiendo_id = null, subiendo_hasta = null;`
      );
      pendientes = await cambiosPendientes();
      logger.warning("Interrupted upload found applied online", {
        uploadId: sesion.subiendoId,
        pending: pendientes,
      });
    }
    const guardadas = JSON.parse(
      await consultar(BASE_LOCAL, "select huellas from offline.sesion")
    );
    const actuales = JSON.parse(
      await consultar(NUBE, sqlHuellas(Object.keys(guardadas)))
    );
    cambiadas = Object.keys(guardadas).filter(
      (t) => guardadas[t] !== actuales[t]
    );
    logger.info("Online changes checked", {
      changedTables: cambiadas.length,
      pending: pendientes,
    });
    return cambiadas.length
      ? `Cambiaron ${cambiadas.join(", ")}; se combinan con lo de la brigada`
      : "Ninguno desde la última sincronización";
  });

  const descargar = descargarSiempre || !sesion || cambiadas.length > 0;
  for (let intento = 1; ; intento++) {
    if (pendientes) await paso("subida", () => subir(sesion));
    else if (intento === 1) omitir("subida", "No hay cambios que subir");

    if (!descargar) {
      omitir("descarga", "En línea no cambió nada");
      omitir("carga", "En línea no cambió nada");
      break;
    }
    await paso("descarga", descargarDatos);
    try {
      await paso("carga", cargarDatos);
      break;
    } catch (e) {
      // alguien guardó algo en este servidor mientras se descargaba: se sube y se descarga otra vez
      pendientes = await cambiosPendientes();
      if (!pendientes || intento === 3) throw e;
      logger.warning("Local load retried after concurrent changes", {
        attempt: intento + 1,
        pending: pendientes,
      });
      log(
        `  ${pendientes} cambios nuevos durante la descarga: se suben y se descarga otra vez (intento ${intento + 1} de 3).`
      );
    }
  }
  await paso("registro", iniciarRegistro);
}

/** Sube lo pendiente del registro local en una sola transacción en línea (scripts/offline-subida.sql). */
async function subir(sesion) {
  // una sola foto de la base local: el último cambio incluido y cada registro tocado
  const [ultimo, datos] = (
    await consultar(
      BASE_LOCAL,
      `begin isolation level repeatable read read only;
           select coalesce(max(id), 0) from offline.cambios;
           select offline.datos_subida();
           commit;`
    )
  ).split("\n");
  // cada intento con su id: si se corta después de guardar en línea, al repetir se reconoce
  const subidaId = randomUUID();
  await consultar(
    BASE_LOCAL,
    `update offline.sesion set subiendo_id = '${subidaId}', subiendo_hasta = ${ultimo}`
  );
  logger.info("Upload started", { uploadId: subidaId, sessionId: sesion.id });
  const marca = `$d${subidaId.replaceAll("-", "")}$`;
  const resumen = JSON.parse(
    await psql(
      NUBE,
      ["-q", "-At", "--single-transaction", "-f", "-"],
      [
        "SET lock_timeout = '30s';",
        readFileSync("scripts/offline-subida.sql", "utf8"),
        `SELECT pg_temp.subir_offline(${marca}${datos}${marca}::jsonb, '${subidaId}', '${sesion.preparadaEn}');`,
      ].join("\n")
    )
  );
  // lo registrado durante la subida queda para la próxima
  await consultar(
    BASE_LOCAL,
    `delete from offline.cambios where id <= ${ultimo};
         update offline.sesion set subiendo_id = null, subiendo_hasta = null;`
  );
  logger.info("Upload completed", {
    uploadId: subidaId,
    uploaded: resumen.subidos,
    deleted: resumen.borrados,
    merged: resumen.combinados,
    conflicts: resumen.conflictos,
  });
  return describirSubida(resumen);
}

function describirSubida({ subidos, borrados, combinados, conflictos }) {
  const partes = [`${subidos} registros subidos`, `${borrados} borrados`];
  if (combinados) partes.push(`${combinados} combinados con cambios en línea`);
  if (conflictos)
    partes.push(
      `${conflictos} con conflicto: ganó la brigada y lo de línea quedó anotado en registros_offline`
    );
  return partes.join(", ");
}

async function descargarDatos() {
  mkdirSync(DIR, { recursive: true });
  // solo datos de public y auth (usuarios para iniciar sesión); el archivo empieza apagando los triggers
  await ejecutar(process.execPath, [
    SUPABASE_CLI,
    "db",
    "dump",
    "--db-url",
    NUBE,
    "--data-only",
    "--use-copy",
    "-s",
    "public,auth",
    "-f",
    ARCHIVO_DATOS,
  ]);
  const megas = (statSync(ARCHIVO_DATOS).size / 1024 / 1024).toFixed(1);
  logger.info("Online data downloaded", { sizeMb: Number(megas) });
  return `${megas} MB`;
}

async function cargarDatos() {
  // vaciar y cargar en una sola transacción: si algo falla, la base local queda como estaba.
  // Se vuelve a revisar el registro dentro de la transacción: alguien pudo trabajar durante la descarga
  const vaciar = `DO $$ BEGIN
    IF to_regclass('offline.cambios') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM offline.cambios) THEN
        RAISE EXCEPTION 'Se hicieron cambios offline mientras se descargaba; vuelve a sincronizar para subirlos.';
      END IF;
    END IF;
    EXECUTE (
      SELECT 'TRUNCATE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' CASCADE'
      FROM pg_tables WHERE schemaname IN ('public', 'auth') AND tablename <> 'schema_migrations'
    );
  END $$`;
  await psql(
    BASE_LOCAL,
    ["-q", "--single-transaction", "-c", vaciar, "-f", "-"],
    createReadStream(ARCHIVO_DATOS)
  );
  const [pacientes, medicamentos, usuarios] = (
    await consultar(
      BASE_LOCAL,
      "select (select count(*) from public.pacientes), (select count(*) from public.medicamentos), (select count(*) from auth.users)"
    )
  ).split("|");
  logger.info("Local database loaded", {
    patients: Number(pacientes),
    inventoryItems: Number(medicamentos),
    users: Number(usuarios),
  });
  return `${pacientes} pacientes, ${medicamentos} recursos de inventario, ${usuarios} usuarios`;
}

async function iniciarRegistro() {
  await instalarRegistro();
  return `Activo en ${await nuevaSesion()} tablas`;
}

/** El registro de cambios y lo que arma la subida en la base local (scripts/offline.sql, idempotente). */
function instalarRegistro() {
  return psql(
    BASE_LOCAL,
    ["-q", "-f", "-"],
    readFileSync("scripts/offline.sql")
  );
}

/** Cambios anotados en la base local que todavía no se subieron. */
async function cambiosPendientes() {
  if (
    (await consultar(
      BASE_LOCAL,
      "select to_regclass('offline.cambios') is not null"
    )) !== "t"
  )
    return 0;
  return Number(
    await consultar(BASE_LOCAL, "select count(*) from offline.cambios")
  );
}

/** Las migraciones del código, de la base en línea y de la local tienen que ser las mismas. */
async function verificarEsquema() {
  if (!NUBE) {
    logger.error("SUPABASE_DB_URL is not set");
    throw new Error(
      "Falta SUPABASE_DB_URL en el archivo .env (la cadena de conexión de la base en línea)."
    );
  }
  const enLinea = (
    await consultar(
      NUBE,
      "select version from supabase_migrations.schema_migrations order by 1"
    )
  )
    .split("\n")
    .filter(Boolean);
  const enCodigo = readdirSync("supabase/migrations")
    .map((f) => f.match(/^(\d+)_.*\.sql$/)?.[1])
    .filter(Boolean);
  const faltanAqui = enLinea.filter((v) => !enCodigo.includes(v));
  const faltanEnLinea = enCodigo.filter((v) => !enLinea.includes(v));
  if (faltanAqui.length || faltanEnLinea.length) {
    logger.error("Migration mismatch", {
      missingInCode: faltanAqui.length,
      missingOnline: faltanEnLinea.length,
    });
  }
  if (faltanAqui.length) {
    throw new Error(
      `La base en línea tiene migraciones que este código no tiene (${faltanAqui.join(", ")}): actualiza el código.`
    );
  }
  if (faltanEnLinea.length) {
    throw new Error(
      `Este código tiene migraciones que la base en línea todavía no tiene (${faltanEnLinea.join(", ")}): publícalas antes de usar el modo offline.`
    );
  }
  await ejecutar(process.execPath, [
    SUPABASE_CLI,
    "migration",
    "up",
    "--local",
  ]);
  return `${enCodigo.length} migraciones, igual que en línea`;
}

/**
 * Empieza una sesión offline con la base local igual a la de línea: guarda la huella de cada
 * tabla en línea (al subir se compara para saber si allá cambió algo y hay que descargar).
 */
async function nuevaSesion() {
  const tablas = (
    await consultar(
      BASE_LOCAL,
      "select tablename from pg_tables where schemaname = 'public' order by 1"
    )
  ).split("\n");
  const huellas = await consultar(NUBE, sqlHuellas(tablas));
  const [id, preparadaEn] = (
    await consultar(
      BASE_LOCAL,
      `delete from offline.sesion;
       insert into offline.sesion (huellas) values ($h$${huellas}$h$) returning id, to_json(preparada_en) #>> '{}'`
    )
  ).split("|");
  estado.sesion = { id, preparadaEn };
  return tablas.length;
}

/** Falta la compilación offline, es otra (p. ej. un npm run build) o el código cambió después. */
function compilacionVieja() {
  if (!estado.build || leerTexto(".next/BUILD_ID") !== estado.build)
    return true;
  const compiladaEn = statSync(".next/BUILD_ID").mtimeMs;
  const fuentes = [
    "package.json",
    "next.config.ts",
    ...readdirSync("src", { recursive: true }).map((f) => join("src", f)),
  ];
  return fuentes.some((f) => statSync(f).mtimeMs > compiladaEn);
}

async function compilar() {
  await ejecutar(process.execPath, [NEXT_CLI, "build"], {
    env: entorno,
    mostrar: true,
  });
  estado.build = leerTexto(".next/BUILD_ID");
  return `Versión ${estado.build}`;
}

async function arrancarServidor() {
  const servidor = spawn(
    process.execPath,
    [NEXT_CLI, "start", "-H", "0.0.0.0", "-p", PUERTO],
    {
      env: { ...process.env, ...entorno },
      stdio: "inherit",
    }
  );
  await esperarRespuesta(`http://127.0.0.1:${PUERTO}`, servidor);
  servidor.on("exit", (codigo) => {
    log(`El servidor se detuvo (código ${codigo}).`);
    logger.info("Offline server stopped", { exitCode: codigo });
    process.exit(codigo ?? 0);
  });
  estado.urls = direccionesLan().map((ip) => `http://${ip}:${PUERTO}`);
  logger.info("Offline server listening", {
    port: Number(PUERTO),
    lanAddresses: estado.urls.length,
  });
  log("");
  log(
    "Las otras computadoras de la brigada se conectan a la misma red y abren:"
  );
  for (const url of estado.urls) log(`    ${url}`);
  log("(Ctrl+C detiene el servidor)");
  return estado.urls.join("  ") || `http://localhost:${PUERTO}`;
}

// ── utilidades ────────────────────────────────────────────────────────

/** Fecha de la sesión preparada en la base local, o null si nunca se preparó. */
async function sesionLocal() {
  if (
    (await consultar(
      BASE_LOCAL,
      "select to_regclass('offline.sesion') is not null"
    )) !== "t"
  )
    return null;
  return (
    (await consultar(
      BASE_LOCAL,
      "select to_json(preparada_en) #>> '{}' from offline.sesion limit 1"
    )) || null
  );
}

async function statusSupabase() {
  const salida = await ejecutar(process.execPath, [
    SUPABASE_CLI,
    "status",
    "-o",
    "json",
  ]);
  return JSON.parse(salida.slice(salida.indexOf("{")));
}

/** Una consulta por tabla: md5 de todas sus filas en texto, en UTC para que no dependa de la zona. */
function sqlHuellas(tablas) {
  const porTabla = tablas.map(
    (t) =>
      `select '${t}' as t, md5(coalesce(string_agg(x::text, E'\\n' order by x::text), '')) as h from public."${t}" x`
  );
  return `set timezone = 'UTC'; select json_object_agg(t, h) from (${porTabla.join(" union all ")}) s`;
}

/** psql dentro del contenedor de la base local: no hace falta instalar PostgreSQL en el equipo. */
function psql(url, args, entrada) {
  return ejecutar(
    "docker",
    [
      "exec",
      "-i",
      CONTENEDOR_DB,
      "psql",
      url,
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      ...args,
    ],
    { entrada }
  );
}

// -q: sin "SET", "INSERT 0 1"... en la salida, solo las filas
function consultar(url, sql) {
  return psql(url, ["-q", "-At", "-c", sql]);
}

function ejecutar(comando, args, { entrada, env, mostrar = false } = {}) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(comando, args, {
      env: { ...process.env, ...env },
      stdio: [entrada === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    // mostrar: lo pasa a la consola y además lo guarda para explicar un error
    let salida = "";
    let errores = "";
    hijo.stdout.on("data", (d) => {
      salida += d;
      if (mostrar) process.stdout.write(d);
    });
    hijo.stderr.on("data", (d) => {
      errores += d;
      if (mostrar) process.stderr.write(d);
    });
    hijo.on("error", reject);
    hijo.on("close", (codigo) => {
      if (codigo === 0) return resolve(salida.trim());
      // solo el programa y su subcomando: los demás argumentos pueden llevar la cadena de conexión
      logger.debug("Command failed", {
        command:
          comando === process.execPath
            ? `node ${args[0]?.split(/[\\/]/).at(-1)}`
            : `${comando} ${args[0]}`,
        exitCode: codigo,
      });
      reject(
        new Error(
          ultimoError(errores || salida) ||
            `${comando} terminó con código ${codigo}`
        )
      );
    });
    if (typeof entrada === "string" || Buffer.isBuffer(entrada))
      hijo.stdin.end(entrada);
    else entrada?.pipe(hijo.stdin);
  });
}

/** La última línea útil de la salida de un comando; el CLI de Supabase la da en JSON. */
function ultimoError(texto) {
  const errorPsql = texto.match(/ERROR:\s+(.+)/g)?.at(-1);
  if (errorPsql) return errorPsql.replace(/^ERROR:\s+/, "");
  const linea = texto
    .trim()
    .split("\n")
    .filter(
      (l) => l.trim() && !/new version of supabase|recommend updating/i.test(l)
    )
    .at(-1);
  try {
    return JSON.parse(linea).error.message.split("\n")[0];
  } catch (e) {
    logger.debug("Command error output is not JSON", errorInfo(e));
    return linea;
  }
}

async function esperarRespuesta(url, proceso) {
  for (let i = 0; i < 120; i++) {
    if (proceso.exitCode !== null)
      throw new Error("El servidor se cerró al arrancar.");
    try {
      await fetch(url, { redirect: "manual" });
      return;
    } catch (e) {
      logger.debug("Server not ready", { attempt: i + 1, ...errorInfo(e) });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("El servidor no respondió en 60 segundos.");
}

/** IPv4 de las tarjetas de red reales (sin las virtuales de Docker/WSL). */
function direccionesLan() {
  return Object.entries(networkInterfaces())
    .filter(
      ([nombre]) =>
        !/vethernet|wsl|docker|virtualbox|vmware|loopback/i.test(nombre)
    )
    .flatMap(([, ifaces]) => ifaces ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

function procesoVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    logger.debug("Process not running", { pid, ...errorInfo(e) });
    return false;
  }
}

function leerJson(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    // en la primera corrida el archivo todavía no existe
    logger.debug("State file not readable", errorInfo(e));
    return null;
  }
}

function leerTexto(ruta) {
  return existsSync(ruta) ? readFileSync(ruta, "utf8").trim() : null;
}

function ahora() {
  return new Date().toISOString();
}

function fechaLegible(fecha) {
  return new Date(fecha).toLocaleString("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function log(mensaje) {
  console.log(
    mensaje ? `[${new Date().toLocaleTimeString("es-HN")}] ${mensaje}` : ""
  );
}
