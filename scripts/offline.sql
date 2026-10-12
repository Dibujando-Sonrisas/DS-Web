-- =========================================================================
-- Registro de cambios del modo offline. Solo existe en la base local del
-- equipo servidor de la brigada (lo instala scripts/offline.mjs después de
-- descargar los datos); la base en línea no lo tiene.
-- =========================================================================

SET client_min_messages = warning; -- sin un aviso por cada trigger que todavía no existía

CREATE SCHEMA IF NOT EXISTS offline;

-- todo lo que se escribe en public mientras se trabaja offline, en orden
CREATE TABLE IF NOT EXISTS offline.cambios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabla text NOT NULL,
  operacion text NOT NULL,
  -- la fila completa: la nueva en INSERT/UPDATE, la borrada en DELETE
  fila jsonb NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now()
);
-- la fila como era antes del cambio (UPDATE/DELETE): al subir, la del primer
-- cambio es la versión descargada y se compara con la de línea
ALTER TABLE offline.cambios ADD COLUMN IF NOT EXISTS antes jsonb;

-- la descarga vigente: cuándo se hizo y la huella de cada tabla en línea en
-- ese momento (al subir se compara para saber si allá cambió algo)
CREATE TABLE IF NOT EXISTS offline.sesion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preparada_en timestamptz NOT NULL DEFAULT now(),
  huellas jsonb NOT NULL
);
-- la subida en curso (su id en registros_offline.sesion_id) y el último cambio
-- que incluye: si se corta después de guardar en línea, al repetirla se sabe
-- qué parte del registro ya subió
ALTER TABLE offline.sesion ADD COLUMN IF NOT EXISTS subiendo_id uuid;
ALTER TABLE offline.sesion ADD COLUMN IF NOT EXISTS subiendo_hasta bigint;

-- security definer: anota aunque quien escribe (authenticated) no tenga acceso a offline
-- en UTC: las fechas se escriben igual aquí y en línea, y al subir se comparan como texto
CREATE OR REPLACE FUNCTION offline.registrar_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
BEGIN
  INSERT INTO offline.cambios (tabla, operacion, fila, antes)
  VALUES (TG_TABLE_NAME, TG_OP,
          to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END),
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END);
  RETURN NULL;
END;
$$;

-- un trigger en cada tabla de public, también en las que agreguen migraciones nuevas.
-- Menos notificaciones_vistas: es hasta dónde vio cada quien su campana, no vale la
-- pena subirlo y, como cambia con solo abrir el panel, detenía las sincronizaciones
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS offline_cambios ON public.%I', t);
    CONTINUE WHEN t = 'notificaciones_vistas';
    EXECUTE format(
      'CREATE TRIGGER offline_cambios AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION offline.registrar_cambio()', t);
  END LOOP;
END;
$$;

-- la versión anterior armaba la subida aquí; ahora se decide en línea (scripts/offline-subida.sql)
DROP FUNCTION IF EXISTS offline.sql_subida();

-- Lo que se manda a la base en línea al subir (npm run offline:subir): cada
-- registro tocado offline, una vez, con
--   base: cómo era al descargar (null si se creó aquí)
--   mia:  cómo está ahora aquí (null si se borró)
--   nivel: el de su tabla según las llaves foráneas, para escribir de padres a hijos
-- scripts/offline-subida.sql lo compara con la versión en línea y decide qué queda.
-- shortcut: no sigue cambios de llave primaria (la app no los hace); si alguno
-- los hiciera, el registro de la llave vieja quedaría en línea.
CREATE OR REPLACE FUNCTION offline.datos_subida() RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE
  t record;
  k record;
  v_pk text[];
  v_cond text;
  v_mia jsonb;
  v_datos jsonb := '[]';
BEGIN
  -- tablas tocadas; nivel = la cadena más larga de llaves foráneas hasta ella
  FOR t IN
    WITH RECURSIVE fk AS (
      SELECT DISTINCT p.relname::text AS padre, h.relname::text AS hijo
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class h ON h.oid = c.conrelid
      JOIN pg_catalog.pg_class p ON p.oid = c.confrelid
      WHERE c.contype = 'f' AND c.conrelid <> c.confrelid
        AND h.relnamespace = 'public'::regnamespace AND p.relnamespace = 'public'::regnamespace
    ), nivel AS (
      SELECT tablename::text AS tabla, 0 AS n FROM pg_catalog.pg_tables WHERE schemaname = 'public'
      UNION ALL
      SELECT fk.hijo, nivel.n + 1 FROM nivel JOIN fk ON fk.padre = nivel.tabla WHERE nivel.n < 50
    )
    SELECT s.tabla, s.n
    FROM (SELECT nivel.tabla, max(nivel.n) AS n FROM nivel GROUP BY nivel.tabla) s
    WHERE s.tabla IN (SELECT c.tabla FROM offline.cambios c)
  LOOP
    SELECT array_agg(a.attname::text ORDER BY array_position(i.indkey::int2[], a.attnum)) INTO v_pk
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = format('public.%I', t.tabla)::regclass AND i.indisprimary;
    IF v_pk IS NULL THEN
      RAISE EXCEPTION 'La tabla % no tiene llave primaria: no se puede subir.', t.tabla;
    END IF;
    SELECT string_agg(format('x.%1$I = r.%1$I', p), ' AND ') INTO v_cond FROM unnest(v_pk) p;

    FOR k IN
      SELECT s.clave, min(s.id) AS n, max(s.fecha) AS fecha,
             (array_agg(s.operacion ORDER BY s.id))[1] AS primera,
             (array_agg(s.antes ORDER BY s.id))[1] AS base
      FROM (
        SELECT c.id, c.operacion, c.antes, c.fecha, (SELECT jsonb_object_agg(p, c.fila -> p) FROM unnest(v_pk) p) AS clave
        FROM offline.cambios c
        WHERE c.tabla = t.tabla
      ) s
      GROUP BY s.clave
    LOOP
      EXECUTE format('SELECT to_jsonb(x) FROM public.%I x, jsonb_populate_record(NULL::public.%I, $1) r WHERE %s',
                     t.tabla, t.tabla, v_cond)
        INTO v_mia USING k.clave;
      v_datos := v_datos || jsonb_build_object(
        'n', k.n, 'tabla', t.tabla, 'nivel', t.n, 'clave', k.clave, 'mia', v_mia,
        'primera', k.primera, 'fecha', k.fecha, 'base', k.base,
        -- creado aquí: en línea no había nada. Sin "antes" (registro de una versión anterior): no se sabe
        'base_conocida', k.primera = 'INSERT' OR k.base IS NOT NULL);
    END LOOP;
  END LOOP;
  RETURN v_datos;
END;
$$;

-- cambios sin subir por tabla, para Ajustes → Modo offline; solo con la clave secreta (servidor de Next)
CREATE OR REPLACE FUNCTION public.offline_pendientes() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_object_agg(tabla, n), '{}')
  FROM (SELECT tabla, count(*) AS n FROM offline.cambios GROUP BY tabla) s;
$$;
REVOKE EXECUTE ON FUNCTION public.offline_pendientes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offline_pendientes() TO service_role;

-- que la API vea la función nueva sin reiniciar
NOTIFY pgrst, 'reload schema';
