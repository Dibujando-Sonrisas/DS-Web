-- =========================================================================
-- ELIMINACIÓN DE SOLICITUDES DE VOLUNTARIOS GENERALES
--   * Permite eliminar solicitudes de voluntariado general (brigada_id IS NULL)
--     a usuarios con el permiso 'voluntariado.delete'.
--   * Mantiene el permiso 'brigadas.delete' para solicitudes de brigadas.
-- =========================================================================

DROP POLICY IF EXISTS "inscripciones_voluntarios: eliminar" ON public.inscripciones_voluntarios;
CREATE POLICY "inscripciones_voluntarios: eliminar" ON public.inscripciones_voluntarios FOR DELETE TO authenticated
  USING (
    (SELECT public.tiene_permiso('brigadas.delete'))
    OR (brigada_id IS NULL AND (SELECT public.tiene_permiso('voluntariado.delete')))
  );

