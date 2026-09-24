-- =========================================================================
-- Expediente por etapas: el paciente aparece en el listado desde que se
-- ingresa, con su estado según lo que ya se registró:
--   ingresado  → datos del paciente
--   preclinica → signos vitales
--   consulta   → consulta, diagnósticos y receta
-- =========================================================================

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
    WHEN c.id IS NOT NULL THEN 'consulta'
    WHEN EXISTS (SELECT 1 FROM public.signos_vitales s WHERE s.paciente_id = p.id) THEN 'preclinica'
    ELSE 'ingresado'
  END AS estado
FROM public.pacientes p
LEFT JOIN public.consultas c ON c.paciente_id = p.id
LEFT JOIN public.perfiles per ON per.id = c.medico_id
JOIN public.brigadas b ON b.id = p.brigada_id;

CREATE INDEX IF NOT EXISTS idx_signos_paciente ON public.signos_vitales USING btree (paciente_id);

-- Solo el panel administrativo (usuarios con sesión) consulta el listado
REVOKE ALL ON public.v_pacientes_atendidos FROM anon;
