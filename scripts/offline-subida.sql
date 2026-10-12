-- =========================================================================
-- Subida del modo offline. scripts/offline.mjs lo carga en la base EN LÍNEA
-- dentro de la misma transacción en que lo usa: las funciones van en pg_temp
-- y desaparecen al cerrar la conexión, en línea no queda nada instalado.
--
-- Recibe de offline.datos_subida() cada registro tocado offline con su
-- versión original (base) y la de la brigada (mia), y la compara con la de
-- línea, que queda bloqueada hasta terminar:
--   * en línea nadie lo tocó         → queda el de la brigada
--   * en línea cambiaron otros campos → se combinan
--   * cantidades de inventario        → se suman las dos diferencias
--   * el mismo campo, o borrado de un lado y cambiado del otro
--                                     → gana la brigada y lo de línea queda
--                                       en registros_offline.conflicto
-- Los triggers se apagan (stock, lotes y movimientos ya vienen calculados);
-- las llaves foráneas no, por eso se escribe de padres a hijos.
-- =========================================================================

-- llave primaria, columnas y condición por llave de una tabla de public
CREATE FUNCTION pg_temp.estructura_offline(p_tabla text, OUT pk text[], OUT cols text, OUT sets text, OUT cond text)
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  SELECT array_agg(a.attname::text ORDER BY array_position(i.indkey::int2[], a.attnum)) INTO pk
  FROM pg_catalog.pg_index i
  JOIN pg_catalog.pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
  WHERE i.indrelid = format('public.%I', p_tabla)::regclass AND i.indisprimary;
  IF pk IS NULL THEN
    RAISE EXCEPTION 'La tabla % no tiene llave primaria: no se puede subir.', p_tabla;
  END IF;

  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum),
         string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
           FILTER (WHERE a.attname::text <> ALL (pk))
    INTO cols, sets
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = format('public.%I', p_tabla)::regclass
    AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '';

  SELECT string_agg(format('x.%1$I = r.%1$I', p), ' AND ') INTO cond FROM unnest(pk) p;
END;
$$;

-- en UTC, como offline.datos_subida(): las versiones se comparan como JSON
CREATE FUNCTION pg_temp.subir_offline(p_datos jsonb, p_sesion uuid, p_preparada timestamptz) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE
  -- se suman en vez de pisarse: la brigada entregó 3 y en línea 5 → bajan 8
  c_contadores constant jsonb :=
    '{"lotes_medicamentos": ["cantidad_actual"], "medicamentos": ["stock_actual"], "productos": ["stock"]}';
  d record;
  e record;
  v_tabla text;
  v_linea jsonb;
  v_final jsonb;
  v_campos jsonb;
  v_conflicto jsonb;
  v_combinado boolean;
  v_suma numeric;
  c text;
  m jsonb;
  t jsonb;
  b jsonb;
  v_resumen jsonb;
BEGIN
  CREATE TEMP TABLE plan (
    n bigint, tabla text, nivel int, clave jsonb, final jsonb,
    operacion text, conflicto jsonb, combinado boolean, fecha timestamptz
  ) ON COMMIT DROP;

  -- 1. decidir qué queda de cada registro
  FOR d IN
    SELECT * FROM jsonb_to_recordset(p_datos) AS x(
      n bigint, tabla text, nivel int, clave jsonb, base jsonb, base_conocida boolean,
      mia jsonb, primera text, fecha timestamptz)
    ORDER BY x.nivel, x.n
  LOOP
    SELECT * INTO e FROM pg_temp.estructura_offline(d.tabla);
    EXECUTE format('SELECT to_jsonb(x) FROM public.%I x, jsonb_populate_record(NULL::public.%I, $1) r WHERE %s FOR UPDATE OF x',
                   d.tabla, d.tabla, e.cond)
      INTO v_linea USING d.clave;

    v_conflicto := NULL;
    v_combinado := false;
    IF d.base_conocida AND v_linea IS NOT DISTINCT FROM d.base THEN
      v_final := d.mia;                                   -- en línea nadie lo tocó
    ELSIF d.mia IS NULL AND v_linea IS NULL THEN
      v_final := NULL;                                    -- borrado en los dos lados
    ELSIF d.mia IS NULL THEN
      v_final := NULL;                                    -- la brigada lo borró: gana
      v_conflicto := jsonb_build_object('motivo', 'Cambiado en línea y borrado en la brigada', 'en_linea', v_linea);
    ELSIF v_linea IS NULL THEN
      v_final := d.mia;                                   -- lo borraron en línea: gana la brigada
      v_conflicto := jsonb_build_object('motivo', 'Borrado en línea y cambiado en la brigada');
    ELSE
      -- los dos existen: campo por campo, sobre la versión en línea
      v_final := v_linea;
      v_campos := '{}';
      FOR c IN SELECT jsonb_object_keys(d.mia) LOOP
        m := d.mia -> c;
        t := v_linea -> c;
        b := d.base -> c;  -- null si no hay base
        IF m IS NOT DISTINCT FROM t THEN
          CONTINUE;
        ELSIF d.base IS NOT NULL AND m IS NOT DISTINCT FROM b THEN
          v_combinado := true;                            -- solo cambió en línea: queda el de línea
        ELSIF d.base IS NOT NULL AND t IS NOT DISTINCT FROM b THEN
          v_final := jsonb_set(v_final, ARRAY[c], m);     -- solo cambió en la brigada
        ELSIF c = 'updated_at' THEN
          v_final := jsonb_set(v_final, ARRAY[c],
                               to_jsonb(greatest((m #>> '{}')::timestamptz, (t #>> '{}')::timestamptz)));
        ELSIF d.base IS NOT NULL AND coalesce((c_contadores -> d.tabla) ? c, false)
              AND jsonb_typeof(m) = 'number' AND jsonb_typeof(t) = 'number' AND jsonb_typeof(b) = 'number' THEN
          v_suma := t::numeric + m::numeric - b::numeric;
          v_final := jsonb_set(v_final, ARRAY[c], to_jsonb(greatest(v_suma, 0)));
          v_combinado := true;
          IF v_suma < 0 THEN
            v_campos := v_campos || jsonb_build_object(c, jsonb_build_object(
              'en_linea', t, 'brigada', m, 'nota', 'Entre los dos lados quedaba negativo; se dejó en 0.'));
          END IF;
        ELSE
          v_final := jsonb_set(v_final, ARRAY[c], m);     -- el mismo campo en los dos lados: gana la brigada
          v_campos := v_campos || jsonb_build_object(c, jsonb_build_object('en_linea', t, 'brigada', m));
        END IF;
      END LOOP;
      IF v_campos <> '{}' THEN
        v_conflicto := jsonb_build_object('motivo', 'Cambiado en los dos lados', 'campos', v_campos);
      END IF;
    END IF;

    INSERT INTO pg_temp.plan VALUES (
      d.n, d.tabla, d.nivel, d.clave, v_final,
      CASE WHEN v_final IS NULL AND v_linea IS NULL THEN 'NADA'
           WHEN v_final IS NULL THEN 'DELETE'
           WHEN d.primera = 'INSERT' THEN 'INSERT'
           ELSE 'UPDATE' END,
      v_conflicto, v_combinado, d.fecha);
  END LOOP;

  -- 2. escribir: triggers apagados, de padres a hijos; se borra de hijos a padres
  FOR v_tabla IN SELECT DISTINCT p.tabla FROM pg_temp.plan p WHERE p.operacion <> 'NADA' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', v_tabla);
  END LOOP;

  FOR d IN SELECT * FROM pg_temp.plan p WHERE p.final IS NOT NULL ORDER BY p.nivel, p.n LOOP
    SELECT * INTO e FROM pg_temp.estructura_offline(d.tabla);
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (%s) DO %s',
                   d.tabla, e.cols, e.cols, d.tabla,
                   (SELECT string_agg(quote_ident(p), ', ') FROM unnest(e.pk) p),
                   coalesce('UPDATE SET ' || e.sets, 'NOTHING'))
      USING d.final;
  END LOOP;

  FOR d IN SELECT * FROM pg_temp.plan p WHERE p.operacion = 'DELETE' ORDER BY p.nivel DESC, p.n DESC LOOP
    SELECT * INTO e FROM pg_temp.estructura_offline(d.tabla);
    EXECUTE format('DELETE FROM public.%I x USING jsonb_populate_record(NULL::public.%I, $1) r WHERE %s',
                   d.tabla, d.tabla, e.cond)
      USING d.clave;
  END LOOP;

  FOR v_tabla IN SELECT DISTINCT p.tabla FROM pg_temp.plan p WHERE p.operacion <> 'NADA' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', v_tabla);
  END LOOP;

  -- 3. la huella permanente
  INSERT INTO public.registros_offline (sesion_id, preparada_en, tabla, registro, operacion, cambiado_en, conflicto)
  SELECT p_sesion, p_preparada, p.tabla, p.clave, p.operacion, p.fecha, p.conflicto
  FROM pg_temp.plan p
  WHERE p.operacion <> 'NADA';

  SELECT jsonb_build_object(
           'subidos', count(*) FILTER (WHERE p.operacion IN ('INSERT', 'UPDATE')),
           'borrados', count(*) FILTER (WHERE p.operacion = 'DELETE'),
           'combinados', count(*) FILTER (WHERE p.combinado AND p.conflicto IS NULL),
           'conflictos', count(*) FILTER (WHERE p.conflicto IS NOT NULL))
    INTO v_resumen
  FROM pg_temp.plan p;
  RETURN v_resumen;
END;
$$;
