-- =========================================================================
-- CATEGORÍAS DE INVENTARIO POR TIPO DE RECURSO
--   Cada categoría pertenece a un tipo de recurso (medicamento, insumo médico
--   o material de brigada) y el formulario de recursos solo ofrece las del
--   tipo elegido. Se administran desde Inventario > Categorías.
--   Las que ya existen toman el tipo que más usan sus recursos; sin recursos,
--   quedan como medicamento.
--   stock_actual ahora trae el código y la categoría del recurso, para que al
--   editarlo no se pierdan.
-- =========================================================================

ALTER TABLE public.categorias_inventario ADD COLUMN tipo_recurso varchar(30);

UPDATE public.categorias_inventario c
SET tipo_recurso = coalesce(
  (
    SELECT m.tipo_recurso
    FROM public.medicamentos m
    WHERE m.categoria_id = c.id
    GROUP BY m.tipo_recurso
    ORDER BY count(*) DESC, m.tipo_recurso
    LIMIT 1
  ),
  'medicamento'
);

ALTER TABLE public.categorias_inventario
  ALTER COLUMN tipo_recurso SET NOT NULL,
  ADD CONSTRAINT chk_categorias_inventario_tipo_recurso
    CHECK (tipo_recurso IN ('medicamento', 'insumo_medico', 'material_brigada'));

-- el mismo nombre puede repetirse entre tipos, no dentro de uno;
-- la app traduce el error (uq_categorias_inventario_nombre) en src/lib/db/inventario.ts
CREATE UNIQUE INDEX uq_categorias_inventario_nombre
  ON public.categorias_inventario (tipo_recurso, lower(nombre));

-- columnas nuevas al final: CREATE OR REPLACE no deja cambiar las que ya hay
CREATE OR REPLACE VIEW public.stock_actual WITH (security_invoker = true) AS
SELECT
  m.id AS medicamento_id,
  m.nombre,
  m.descripcion,
  m.unidad_medida,
  m.stock_minimo,
  m.tipo_recurso,
  COALESCE(sum(l.cantidad_actual), 0::bigint) AS stock_total,
  CASE
    WHEN COALESCE(sum(l.cantidad_actual), 0::bigint) = 0 THEN 'Sin Existencias'::text
    WHEN COALESCE(sum(l.cantidad_actual), 0::bigint) <= m.stock_minimo THEN 'Stock Crítico'::text
    ELSE 'Normal'::text
  END AS estado_stock,
  m.codigo,
  m.categoria_id
FROM public.medicamentos m
LEFT JOIN public.lotes_medicamentos l ON l.medicamento_id = m.id
GROUP BY m.id;
