-- =========================================================================
-- Estados del expediente:
--   ingresado  → datos del paciente
--   preclinica → signos vitales
--   consulta   → un usuario abrió la consulta y tomó al paciente;
--                nadie más puede atenderlo mientras la tenga
--   finalizada → consulta, diagnósticos y receta guardados
-- =========================================================================

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS consulta_tomada_por uuid REFERENCES public.perfiles(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.v_pacientes_atendidos AS
SELECT
  p.id,
  p.codigo,
  concat(p.nombres, ' ', p.apellidos) AS paciente,
  b.nombre AS brigada,
  c.tipo_consulta,
  per.nombre_completo AS medico,
  p.created_at,
  p.brigada_id,
  CASE
    WHEN c.id IS NOT NULL THEN 'finalizada'
    WHEN p.consulta_tomada_por IS NOT NULL THEN 'consulta'
    WHEN EXISTS (SELECT 1 FROM public.signos_vitales s WHERE s.paciente_id = p.id) THEN 'preclinica'
    ELSE 'ingresado'
  END AS estado,
  tom.nombre_completo AS tomado_por,
  -- el listado muestra "Continuar consulta" solo a quien tomó al paciente
  (p.consulta_tomada_por = auth.uid()) AS tomado_por_mi
FROM public.pacientes p
LEFT JOIN public.consultas c ON c.paciente_id = p.id
LEFT JOIN public.perfiles per ON per.id = c.medico_id
LEFT JOIN public.perfiles tom ON tom.id = p.consulta_tomada_por
JOIN public.brigadas b ON b.id = p.brigada_id;
