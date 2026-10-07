-- =========================================================================
-- NOTIFICACIONES DEL PANEL (la campana del encabezado)
--   * public.notificaciones: eventos (llegó un mensaje de contacto, se
--     registró un usuario, cambió una brigada...). Cada una dice qué permiso
--     hace falta para verla; quien causó el evento no la ve.
--   * public.notificar(): la única forma de crearlas. La llaman los
--     triggers (SECURITY DEFINER), así funciona aunque el evento lo cause un
--     visitante sin sesión y nadie puede fabricar notificaciones desde la API.
--   * public.notificaciones_vistas: hasta cuándo vio cada usuario su campana
--     (lo más nuevo cuenta en el globito).
--
-- Para notificar algo nuevo: un trigger que llame a public.notificar() y el
-- ícono del tipo en NotificacionesBtn.tsx. Las alertas que dependen del
-- estado actual (stock mínimo) no se guardan aquí: se calculan al consultar
-- (src/app/administracion/notificaciones/actions.ts).
-- =========================================================================

CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo ~ '^[a-z_]+$'),
  titulo text NOT NULL CHECK (length(titulo) <= 200),
  detalle text CHECK (detalle IS NULL OR length(detalle) <= 300),
  enlace text CHECK (enlace IS NULL OR enlace LIKE '/administracion%'),
  -- permiso para verla: mismas claves que src/lib/auth/permissions.ts
  permiso text NOT NULL CHECK (permiso ~ '^[a-z_]+\.[a-z_]+$'),
  -- quién la causó (null: un visitante o el sistema); no se la ve a sí mismo
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_created_at ON public.notificaciones (created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notificaciones FROM anon;

-- solo lectura desde la app; se escriben con public.notificar()
CREATE POLICY "notificaciones: leer" ON public.notificaciones FOR SELECT TO authenticated
  USING (public.tiene_permiso(permiso) AND actor_id IS DISTINCT FROM (SELECT auth.uid()));

-- la campana escucha los INSERT en vivo (useCambiosEnVivo); Realtime aplica la RLS de arriba
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;


CREATE TABLE public.notificaciones_vistas (
  perfil_id uuid PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
  vistas_hasta timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones_vistas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notificaciones_vistas FROM anon;

CREATE POLICY "notificaciones_vistas: leer la propia" ON public.notificaciones_vistas FOR SELECT TO authenticated
  USING (perfil_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.marcar_notificaciones_vistas() RETURNS void
  LANGUAGE sql SECURITY DEFINER
  SET search_path = ''
  AS $$
  INSERT INTO public.notificaciones_vistas (perfil_id, vistas_hasta)
  VALUES ((SELECT auth.uid()), now())
  ON CONFLICT (perfil_id) DO UPDATE SET vistas_hasta = excluded.vistas_hasta;
$$;

REVOKE ALL ON FUNCTION public.marcar_notificaciones_vistas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_notificaciones_vistas() TO authenticated;


DROP FUNCTION IF EXISTS public.notificar(text, text, text, text, text);

-- Notificador agnóstico del panel:
-- Puede ser invocado desde triggers de Postgres, funciones internas,
-- o Server Actions / RPC de Supabase por usuarios autenticados.
-- Guarda 60 días: la campana es un aviso activo, no un historial permanente.
CREATE OR REPLACE FUNCTION public.notificar(
  p_tipo text,
  p_titulo text,
  p_detalle text DEFAULT NULL,
  p_enlace text DEFAULT NULL,
  p_permiso text DEFAULT 'perfil.read',
  p_actor_id uuid DEFAULT NULL,
  p_para_todos boolean DEFAULT false
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_enlace text := NULLIF(trim(p_enlace), '');
  v_permiso text := COALESCE(NULLIF(trim(p_permiso), ''), 'perfil.read');
  v_tipo text := lower(regexp_replace(trim(p_tipo), '[^a-z0-9_]+', '_', 'gi'));
  v_actor uuid := CASE
    WHEN p_para_todos THEN NULL
    WHEN p_actor_id IS NOT NULL THEN p_actor_id
    ELSE (SELECT auth.uid())
  END;
BEGIN
  IF v_tipo = '' THEN
    v_tipo := 'general';
  END IF;

  -- Normalizar enlace hacia el panel administrativo si se especificó
  IF v_enlace IS NOT NULL AND NOT (v_enlace LIKE '/administracion%') THEN
    v_enlace := '/administracion' || CASE WHEN v_enlace LIKE '/%' THEN v_enlace ELSE '/' || v_enlace END;
  END IF;

  -- Limpiar notificaciones antiguas
  DELETE FROM public.notificaciones WHERE created_at < now() - interval '60 days';

  INSERT INTO public.notificaciones (tipo, titulo, detalle, enlace, permiso, actor_id)
  VALUES (
    v_tipo,
    left(trim(p_titulo), 200),
    NULLIF(left(trim(p_detalle), 300), ''),
    v_enlace,
    v_permiso,
    v_actor
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notificar(text, text, text, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar(text, text, text, text, text, uuid, boolean) TO authenticated, service_role;


-- -------------------------------------------------------------------------
-- EVENTOS
-- -------------------------------------------------------------------------

-- mensaje del formulario de contacto del sitio. Lo envía un visitante aunque
-- tenga sesión abierta (p. ej. un admin probándolo): sin actor, lo ven todos.
CREATE OR REPLACE FUNCTION public.trg_notificar_contacto() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  PERFORM public.notificar(
    'contacto_nuevo',
    'Nuevo mensaje de ' || NEW.nombre || ' ' || NEW.apellido,
    NEW.asunto,
    '/administracion/contacto?mensaje=' || NEW.id,
    'contacto.read',
    p_para_todos => true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contacto_notificar
  AFTER INSERT ON public.contacto
  FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_contacto();

-- usuario nuevo: entra con el rol predeterminado y hay que revisarle el acceso
CREATE OR REPLACE FUNCTION public.trg_notificar_usuario_nuevo() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  PERFORM public.notificar(
    'usuario_nuevo',
    'Nuevo usuario: ' || NEW.nombre_completo,
    'Revisa su rol y acceso al panel.',
    '/administracion/usuarios',
    'usuarios.update'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfiles_notificar
  AFTER INSERT ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_usuario_nuevo();

-- brigada: solo los cambios que le importan a quien participa
CREATE OR REPLACE FUNCTION public.trg_notificar_brigada() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_cambios text[] := ARRAY[]::text[];
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    v_cambios := v_cambios || ('estado: ' || CASE NEW.estado::text
      WHEN 'planificacion' THEN 'en planificación'
      WHEN 'inscripciones_abiertas' THEN 'inscripciones abiertas'
      WHEN 'inscripciones_cerradas' THEN 'inscripciones cerradas'
      WHEN 'en_preparacion' THEN 'en preparación'
      WHEN 'finalizada' THEN 'finalizada'
      WHEN 'cancelada' THEN 'cancelada'
      ELSE NEW.estado::text
    END);
  END IF;
  IF NEW.fecha_brigada IS DISTINCT FROM OLD.fecha_brigada THEN
    v_cambios := v_cambios || ('fecha: ' || to_char(NEW.fecha_brigada, 'DD/MM/YYYY'));
  END IF;
  IF (NEW.lugar, NEW.municipio, NEW.departamento) IS DISTINCT FROM (OLD.lugar, OLD.municipio, OLD.departamento) THEN
    v_cambios := v_cambios || ('lugar: ' || NEW.lugar || ', ' || NEW.municipio);
  END IF;

  IF cardinality(v_cambios) > 0 THEN
    PERFORM public.notificar(
      'brigada_actualizada',
      'Brigada actualizada: ' || NEW.nombre,
      'Cambió ' || array_to_string(v_cambios, ' · '),
      '/administracion/brigadas?brigada=' || NEW.id,
      'brigadas.read'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brigadas_notificar
  AFTER UPDATE ON public.brigadas
  FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_brigada();
