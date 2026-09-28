-- =========================================================================
-- Vistas de los reportes sintetizados (Reportes y Estadísticas).
-- Estaban en migraciones anteriores que no se incluyeron en init.sql;
-- se recrean igual, sobre las mismas columnas del esquema actual.
-- security_invoker: cada consulta respeta el RLS de las tablas base.
-- =========================================================================

-- Medicamentos, ropa y juguetes entregados por brigada (Resumen de Insumos)
CREATE OR REPLACE VIEW public.v_reporte_insumos_brigada WITH (security_invoker = true) AS
SELECT
  b.id AS brigada_id,
  b.nombre AS brigada_nombre,
  b.fecha_brigada AS fecha,
  b.lugar AS comunidad,
  COALESCE(med.total_medicamentos, 0)::BIGINT AS total_medicamentos,
  COALESCE(rop.total_ropa, 0)::BIGINT AS total_ropa,
  COALESCE(jug.total_juguetes, 0)::BIGINT AS total_juguetes,
  (COALESCE(med.total_medicamentos, 0) + COALESCE(rop.total_ropa, 0) + COALESCE(jug.total_juguetes, 0))::BIGINT AS total_general
FROM public.brigadas b
LEFT JOIN (
  SELECT c.brigada_id, SUM(ef.cantidad) AS total_medicamentos
  FROM public.entregas_farmacia ef
  JOIN public.consultas c ON ef.consulta_id = c.id
  GROUP BY c.brigada_id
) med ON med.brigada_id = b.id
LEFT JOIN (
  SELECT er.brigada_id, SUM(er.cantidad_prendas) AS total_ropa
  FROM public.entregas_ropa er
  GROUP BY er.brigada_id
) rop ON rop.brigada_id = b.id
LEFT JOIN (
  SELECT ai.brigada_id, SUM(ai.cantidad_regalos) AS total_juguetes
  FROM public.actividades_infantiles ai
  GROUP BY ai.brigada_id
) jug ON jug.brigada_id = b.id;

-- Ventas y donaciones por mes (Resumen Financiero)
CREATE OR REPLACE VIEW public.v_resumen_financiero_mensual WITH (security_invoker = true) AS
WITH periodos AS (
  SELECT DISTINCT
    EXTRACT(YEAR FROM fecha::date)::INT AS anio,
    EXTRACT(MONTH FROM fecha::date)::INT AS mes
  FROM public.ventas
  WHERE fecha IS NOT NULL
  UNION
  SELECT DISTINCT
    EXTRACT(YEAR FROM fecha_donacion::date)::INT AS anio,
    EXTRACT(MONTH FROM fecha_donacion::date)::INT AS mes
  FROM public.donaciones_ropa
  WHERE fecha_donacion IS NOT NULL
),
ventas_agg AS (
  SELECT
    EXTRACT(YEAR FROM fecha::date)::INT AS anio,
    EXTRACT(MONTH FROM fecha::date)::INT AS mes,
    COUNT(id)::BIGINT AS cantidad_ventas,
    COALESCE(SUM(total), 0)::NUMERIC AS total_ventas
  FROM public.ventas
  WHERE fecha IS NOT NULL
  GROUP BY 1, 2
),
donaciones_agg AS (
  SELECT
    EXTRACT(YEAR FROM fecha_donacion::date)::INT AS anio,
    EXTRACT(MONTH FROM fecha_donacion::date)::INT AS mes,
    COUNT(id)::BIGINT AS cantidad_donaciones,
    -- valoración estimada: 100 lempiras por prenda donada
    COALESCE(SUM(cantidad_prendas * 100), 0)::NUMERIC AS total_donaciones
  FROM public.donaciones_ropa
  WHERE fecha_donacion IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  p.anio,
  p.mes,
  COALESCE(v.total_ventas, 0)::NUMERIC AS total_ventas,
  COALESCE(d.total_donaciones, 0)::NUMERIC AS total_donaciones,
  COALESCE(v.cantidad_ventas, 0)::BIGINT AS cantidad_ventas,
  COALESCE(d.cantidad_donaciones, 0)::BIGINT AS cantidad_donaciones,
  (COALESCE(v.total_ventas, 0) + COALESCE(d.total_donaciones, 0))::NUMERIC AS total_general
FROM periodos p
LEFT JOIN ventas_agg v ON p.anio = v.anio AND p.mes = v.mes
LEFT JOIN donaciones_agg d ON p.anio = d.anio AND p.mes = d.mes;

-- Brigadas, comunidades y pacientes por año (Resumen de Brigadas)
CREATE OR REPLACE VIEW public.v_resumen_brigadas_anual WITH (security_invoker = true) AS
WITH brigadas_anual AS (
  SELECT
    EXTRACT(YEAR FROM fecha_brigada::date)::INT AS anio,
    COUNT(DISTINCT id)::BIGINT AS cantidad_brigadas,
    COUNT(DISTINCT COALESCE(NULLIF(TRIM(municipio), ''), NULLIF(TRIM(lugar), ''), 'Sin Comunidad'))::BIGINT AS cantidad_comunidades
  FROM public.brigadas
  WHERE fecha_brigada IS NOT NULL
  GROUP BY 1
),
pacientes_anual AS (
  SELECT
    EXTRACT(YEAR FROM b.fecha_brigada::date)::INT AS anio,
    COUNT(p.id)::BIGINT AS cantidad_pacientes
  FROM public.pacientes p
  JOIN public.brigadas b ON p.brigada_id = b.id
  WHERE b.fecha_brigada IS NOT NULL
  GROUP BY 1
)
SELECT
  ba.anio,
  COALESCE(ba.cantidad_brigadas, 0)::BIGINT AS total_brigadas,
  COALESCE(ba.cantidad_comunidades, 0)::BIGINT AS comunidades_atendidas,
  COALESCE(pa.cantidad_pacientes, 0)::BIGINT AS total_pacientes,
  CASE
    WHEN COALESCE(ba.cantidad_brigadas, 0) > 0 THEN
      ROUND((COALESCE(pa.cantidad_pacientes, 0)::NUMERIC / ba.cantidad_brigadas::NUMERIC), 1)
    ELSE 0
  END::NUMERIC AS promedio_pacientes_por_brigada
FROM brigadas_anual ba
LEFT JOIN pacientes_anual pa ON ba.anio = pa.anio;

-- Solo el panel administrativo (usuarios con sesión) consulta estos reportes
REVOKE ALL ON public.v_reporte_insumos_brigada, public.v_resumen_financiero_mensual, public.v_resumen_brigadas_anual FROM anon;
GRANT SELECT ON public.v_reporte_insumos_brigada, public.v_resumen_financiero_mensual, public.v_resumen_brigadas_anual TO authenticated;
