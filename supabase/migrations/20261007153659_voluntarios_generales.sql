-- =========================================================================
-- VOLUNTARIOS GENERALES
--   * El formulario de /voluntariado ya no inscribe a la brigada activa: deja
--     la solicitud sin brigada (brigada_id NULL) y se gestiona en
--     Voluntarios. La inscripción a una brigada sigue siendo el modal del
--     anuncio de la brigada.
--   * Las generales también las acepta o rechaza quien tiene voluntariado.update.
--   * Aviso en la campana para las dos: a qué brigada se inscribió o que es
--     una solicitud general.
-- =========================================================================

ALTER TABLE public.inscripciones_voluntarios ALTER COLUMN brigada_id DROP NOT NULL;

DROP POLICY "inscripciones_voluntarios: editar" ON public.inscripciones_voluntarios;
CREATE POLICY "inscripciones_voluntarios: editar" ON public.inscripciones_voluntarios FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update'))
    OR (brigada_id IS NULL AND (SELECT public.tiene_permiso('voluntariado.update'))))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update'))
    OR (brigada_id IS NULL AND (SELECT public.tiene_permiso('voluntariado.update'))));

-- formularios públicos: quien se inscribe es un visitante, sin actor
CREATE OR REPLACE FUNCTION public.trg_notificar_inscripcion_voluntario() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF NEW.brigada_id IS NULL THEN
    PERFORM public.notificar(
      'voluntario_nuevo',
      'Voluntariado general: ' || NEW.nombre_completo,
      'Área de interés: ' || NEW.area_interes,
      '/administracion/voluntarios',
      'voluntariado.read',
      p_para_todos => true
    );
  ELSE
    PERFORM public.notificar(
      'voluntario_brigada',
      'Inscripción a la brigada ' || b.nombre || ': ' || NEW.nombre_completo,
      'Área de interés: ' || NEW.area_interes,
      '/administracion/brigadas?brigada=' || NEW.brigada_id,
      'brigadas.read',
      p_para_todos => true
    )
    FROM public.brigadas b
    WHERE b.id = NEW.brigada_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inscripciones_notificar
  AFTER INSERT ON public.inscripciones_voluntarios
  FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_inscripcion_voluntario();
