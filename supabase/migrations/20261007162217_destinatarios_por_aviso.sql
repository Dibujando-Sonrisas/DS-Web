-- =========================================================================
-- AJUSTES → CORREOS: UNA LISTA DE DESTINATARIOS POR AVISO
--   * public.destinatarios_correo (antes destinatarios_contacto): quién
--     recibe cada aviso por correo. `aviso` es la clave del catálogo
--     src/lib/avisosCorreo.ts ('contacto', 'voluntario_inscripcion',
--     'usuario_nuevo'...); un aviso nuevo no necesita migración.
--   * public.correos_aviso(aviso): los correos de una lista, para el
--     servidor. Ahora lo llama con la clave secreta (SUPABASE_SECRET_KEY),
--     que ya usa para crear cuentas, así que la clave propia en Vault
--     (correos_contacto_clave / CORREOS_CONTACTO_CLAVE) deja de usarse.
-- =========================================================================

ALTER TABLE public.destinatarios_contacto RENAME TO destinatarios_correo;

-- los que ya estaban reciben los mensajes de contacto
ALTER TABLE public.destinatarios_correo
  ADD COLUMN aviso text NOT NULL DEFAULT 'contacto' CHECK (aviso ~ '^[a-z_]+$');
ALTER TABLE public.destinatarios_correo ALTER COLUMN aviso DROP DEFAULT;

ALTER TABLE public.destinatarios_correo DROP CONSTRAINT destinatarios_contacto_pkey;
ALTER TABLE public.destinatarios_correo ADD PRIMARY KEY (aviso, perfil_id);
ALTER TABLE public.destinatarios_correo
  RENAME CONSTRAINT destinatarios_contacto_perfil_id_fkey TO destinatarios_correo_perfil_id_fkey;
-- para el ON DELETE CASCADE desde perfiles
CREATE INDEX idx_destinatarios_correo_perfil ON public.destinatarios_correo (perfil_id);

ALTER POLICY "destinatarios_contacto: leer" ON public.destinatarios_correo RENAME TO "destinatarios_correo: leer";
ALTER POLICY "destinatarios_contacto: crear" ON public.destinatarios_correo RENAME TO "destinatarios_correo: crear";
ALTER POLICY "destinatarios_contacto: eliminar" ON public.destinatarios_correo RENAME TO "destinatarios_correo: eliminar";


DROP FUNCTION public.correos_contacto(text);

-- los usuarios desactivados dejan de recibir
CREATE OR REPLACE FUNCTION public.correos_aviso(p_aviso text)
  RETURNS SETOF text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT u.email::text
  FROM public.destinatarios_correo d
  JOIN public.perfiles p ON p.id = d.perfil_id AND p.activo
  JOIN auth.users u ON u.id = d.perfil_id
  WHERE d.aviso = p_aviso AND u.email IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.correos_aviso(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correos_aviso(text) TO service_role;
