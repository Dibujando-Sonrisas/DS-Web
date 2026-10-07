-- =========================================================================
-- AJUSTES: QUIÉN RECIBE LOS MENSAJES DE CONTACTO
--   * public.destinatarios_contacto: usuarios del panel a los que se les
--     avisa por correo cuando alguien escribe desde el formulario de
--     contacto del sitio. Se edita en Ajustes → Correos (permisos
--     ajustes.read / ajustes.update). El correo es el de acceso (auth.users).
--   * public.usuarios_con_correo(): usuarios con su correo para elegirlos
--     en Ajustes → Correos (la app no lee auth.users directo).
--   * public.correos_contacto(clave): el servidor lee los correos al enviar.
--     El visitante no tiene sesión y la lista no debe ser pública, así que
--     la función pide una clave propia que solo abre esta lista
--     (CORREOS_CONTACTO_CLAVE en el servidor = secreto en Vault).
--   * contacto.leido: estado de cada mensaje en Mensajes de Contacto.
--
-- El secreto se crea a mano, fuera del repo (SQL editor):
--   SELECT vault.create_secret('<clave aleatoria>', 'correos_contacto_clave');
-- =========================================================================

CREATE TABLE public.destinatarios_contacto (
  perfil_id uuid PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destinatarios_contacto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.destinatarios_contacto FROM anon;

CREATE POLICY "destinatarios_contacto: leer" ON public.destinatarios_contacto FOR SELECT TO authenticated
  USING ((SELECT public.tiene_permiso('ajustes.read')));
CREATE POLICY "destinatarios_contacto: crear" ON public.destinatarios_contacto FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('ajustes.update')));
CREATE POLICY "destinatarios_contacto: eliminar" ON public.destinatarios_contacto FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('ajustes.update')));


-- sin ajustes.read no devuelve filas
CREATE OR REPLACE FUNCTION public.usuarios_con_correo()
  RETURNS TABLE (id uuid, nombre text, email text, activo boolean)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT p.id, p.nombre_completo, u.email::text, p.activo
  FROM public.perfiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email IS NOT NULL
    AND (SELECT public.tiene_permiso('ajustes.read'))
  ORDER BY p.nombre_completo;
$$;

REVOKE ALL ON FUNCTION public.usuarios_con_correo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuarios_con_correo() TO authenticated;


-- solo lectura y solo de esta lista; sin el secreto en Vault falla cerrado.
-- Los usuarios desactivados dejan de recibir.
CREATE OR REPLACE FUNCTION public.correos_contacto(p_clave text)
  RETURNS SETOF text
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF p_clave IS NULL OR p_clave IS DISTINCT FROM (
    SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'correos_contacto_clave'
  ) THEN
    RAISE EXCEPTION 'Clave de correos de contacto no válida.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT u.email::text
    FROM public.destinatarios_contacto d
    JOIN public.perfiles p ON p.id = d.perfil_id AND p.activo
    JOIN auth.users u ON u.id = d.perfil_id
    WHERE u.email IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.correos_contacto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correos_contacto(text) TO anon, authenticated;


ALTER TABLE public.contacto
  ADD COLUMN IF NOT EXISTS leido boolean NOT NULL DEFAULT false;
