-- =========================================================================
-- INSCRIPCIONES DE VOLUNTARIOS SIN REPETIR
--   Un correo o un teléfono se inscribe una sola vez a la misma brigada, y
--   una sola vez como voluntario general (brigada_id NULL). Puede volver a
--   inscribirse a otra brigada, y si lo rechazaron puede intentarlo de nuevo.
--   El teléfono se compara solo por sus dígitos y sin el código de país de
--   Honduras: "+504 9999-0000" y "99990000" son el mismo.
--   La app traduce el error (uq_inscripciones_correo / _telefono) en
--   src/app/voluntariado/actions.ts.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.normalizar_telefono(p_telefono text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  SET search_path = ''
  AS $$
  SELECT CASE WHEN d ~ '^504[0-9]{8}$' THEN substr(d, 4) ELSE d END
  FROM (SELECT regexp_replace(coalesce(p_telefono, ''), '[^0-9]', '', 'g') AS d) AS s;
$$;

-- si ya hay repetidas se deja una (la aceptada o, si no, la más antigua) y
-- las demás quedan rechazadas; no se borra nada
UPDATE public.inscripciones_voluntarios i
SET estado = 'rechazado'
FROM (
  SELECT id, row_number() OVER (
    PARTITION BY brigada_id, lower(correo)
    ORDER BY (estado = 'aceptado') IS TRUE DESC, created_at
  ) AS n
  FROM public.inscripciones_voluntarios
  WHERE estado IS DISTINCT FROM 'rechazado'
) r
WHERE r.id = i.id AND r.n > 1;

UPDATE public.inscripciones_voluntarios i
SET estado = 'rechazado'
FROM (
  SELECT id, row_number() OVER (
    PARTITION BY brigada_id, public.normalizar_telefono(telefono)
    ORDER BY (estado = 'aceptado') IS TRUE DESC, created_at
  ) AS n
  FROM public.inscripciones_voluntarios
  WHERE estado IS DISTINCT FROM 'rechazado' AND public.normalizar_telefono(telefono) <> ''
) r
WHERE r.id = i.id AND r.n > 1;

-- NULLS NOT DISTINCT: las generales (sin brigada) también cuentan como un grupo
CREATE UNIQUE INDEX uq_inscripciones_correo
  ON public.inscripciones_voluntarios (brigada_id, lower(correo)) NULLS NOT DISTINCT
  WHERE estado IS DISTINCT FROM 'rechazado';

CREATE UNIQUE INDEX uq_inscripciones_telefono
  ON public.inscripciones_voluntarios (brigada_id, public.normalizar_telefono(telefono)) NULLS NOT DISTINCT
  WHERE estado IS DISTINCT FROM 'rechazado' AND public.normalizar_telefono(telefono) <> '';
