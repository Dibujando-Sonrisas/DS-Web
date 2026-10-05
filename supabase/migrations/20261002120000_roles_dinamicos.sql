-- =========================================================================
-- ROLES DINÁMICOS Y PERMISOS EN LA BASE
-- Antes: perfiles.rol era un enum fijo (user_role) y las políticas RLS
-- comparaban nombres de rol ("admin", "coordinador"...).
-- Ahora:
--   * public.roles: roles editables desde Usuarios → Roles.
--   * public.rol_permisos: claves "modulo.accion" del catálogo en código
--     (src/lib/auth/permissions.ts).
--   * perfiles.rol_id → roles.id.
--   * Toda política RLS pregunta por permisos con tiene_permiso().
--
-- Endurecimiento incluido (ya existía el problema antes de este cambio):
--   * Nadie puede cambiarse su propio rol ni reactivarse (trigger en perfiles).
--   * Se quitan las políticas "todo permitido" a cualquier usuario logueado.
--   * Se quitan las escrituras anónimas en brigada_imagenes y en el bucket brigadas.
--   * Las vistas respetan RLS (security_invoker) y ya no se leen sin sesión.
--
-- Reglas de los roles:
--   * es_superadmin (Administrador): todos los permisos, también los futuros;
--     no se elimina ni se le editan permisos.
--   * es_predeterminado: rol de los usuarios nuevos; no se elimina.
--   * "perfil.read" lo tiene cualquier usuario activo (entrar al panel).
--   * Solo se otorgan permisos que uno mismo tiene, y nadie edita su propio rol.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. TABLAS
-- -------------------------------------------------------------------------

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 2 AND 60),
  descripcion text CHECK (descripcion IS NULL OR length(descripcion) <= 240),
  -- tono del badge (mismos nombres que las clases badge* del panel)
  color text NOT NULL DEFAULT 'neutral'
    CHECK (color IN ('brand', 'info', 'success', 'warning', 'danger', 'neutral')),
  es_superadmin boolean NOT NULL DEFAULT false,
  es_predeterminado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX roles_nombre_key ON public.roles (lower(btrim(nombre)));
-- un solo superadmin y un solo rol predeterminado
CREATE UNIQUE INDEX roles_un_superadmin ON public.roles (es_superadmin) WHERE es_superadmin;
CREATE UNIQUE INDEX roles_un_predeterminado ON public.roles (es_predeterminado) WHERE es_predeterminado;

CREATE TRIGGER trg_roles_updated
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.rol_permisos (
  rol_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  -- la lista válida vive en código; aquí solo se exige el formato
  permiso text NOT NULL CHECK (permiso ~ '^[a-z_]+\.[a-z_]+$'),
  PRIMARY KEY (rol_id, permiso)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roles, public.rol_permisos FROM anon;


-- -------------------------------------------------------------------------
-- 2. SEMILLA: los 6 roles de la app con los permisos que tenían en código.
-- reportes.* queda solo en Administrador: antes el código bloqueaba Reportes
-- a los demás aunque la matriz se los diera.
-- -------------------------------------------------------------------------

INSERT INTO public.roles (nombre, descripcion, color, es_superadmin, es_predeterminado) VALUES
  ('Administrador', 'Control total del sistema, incluidos los permisos que se agreguen en el futuro.', 'brand', true, false),
  ('Coordinador', 'Coordina voluntariado, donaciones, actividades y ventas.', 'info', false, false),
  ('Atención de Pacientes', 'Médicos y odontólogos: expedientes, consultas y entrega de recetas.', 'success', false, false),
  ('Encargado de Farmacia', 'Despacho de recetas y control de farmacia.', 'warning', false, false),
  ('Encargado de Bodega', 'Inventario médico: medicamentos, insumos y lotes.', 'neutral', false, false),
  ('Voluntario', 'Rol de los usuarios nuevos: solo su perfil y el panel principal.', 'neutral', false, true);

INSERT INTO public.rol_permisos (rol_id, permiso)
SELECT r.id, p.permiso
FROM public.roles r
JOIN (VALUES
  ('Coordinador', ARRAY[
    'dashboard.resumen',
    'perfil.read', 'perfil.update',
    'inventario.read', 'farmacia.read', 'pacientes.read',
    'voluntariado.read', 'voluntariado.create', 'voluntariado.update', 'voluntariado.delete',
    'donaciones.read', 'donaciones.create', 'donaciones.update', 'donaciones.delete',
    'actividades.read', 'actividades.create', 'actividades.update', 'actividades.delete',
    'ventas.read', 'ventas.create', 'ventas.update', 'ventas.delete',
    'contacto.read', 'contacto.update'
  ]),
  ('Atención de Pacientes', ARRAY[
    'perfil.read', 'perfil.update',
    'farmacia.read', 'farmacia.process',
    'pacientes.read', 'pacientes.create', 'pacientes.update', 'pacientes.delete',
    'voluntariado.read',
    'donaciones.read', 'donaciones.create', 'donaciones.update', 'donaciones.delete',
    'actividades.read', 'actividades.create', 'actividades.update', 'actividades.delete'
  ]),
  ('Encargado de Farmacia', ARRAY[
    'perfil.read', 'perfil.update',
    'inventario.read',
    'farmacia.read', 'farmacia.create', 'farmacia.update', 'farmacia.delete', 'farmacia.process',
    'pacientes.read',
    'donaciones.read', 'donaciones.create', 'donaciones.update', 'donaciones.delete',
    'actividades.read', 'actividades.create', 'actividades.update', 'actividades.delete'
  ]),
  ('Encargado de Bodega', ARRAY[
    'perfil.read', 'perfil.update',
    'inventario.read', 'inventario.create', 'inventario.update', 'inventario.delete',
    'farmacia.read',
    'donaciones.read', 'donaciones.create', 'donaciones.update', 'donaciones.delete',
    'actividades.read', 'actividades.create', 'actividades.update', 'actividades.delete'
  ]),
  ('Voluntario', ARRAY['perfil.read', 'perfil.update'])
) AS s(nombre, permisos) ON s.nombre = r.nombre
CROSS JOIN LATERAL unnest(s.permisos) AS p(permiso);


-- -------------------------------------------------------------------------
-- 3. MÉDICOS Y ODONTÓLOGOS: dejan de ser roles y pasan a la especialidad.
-- Las listas de "quién atendió" del expediente salen de tipo_consulta.
-- -------------------------------------------------------------------------

ALTER TABLE public.especialidades
  ADD COLUMN IF NOT EXISTS tipo_consulta text
  CHECK (tipo_consulta IN ('Medica', 'Odontologica'));

UPDATE public.especialidades SET tipo_consulta = 'Medica'
  WHERE nombre = 'Médico General' AND tipo_consulta IS NULL;
UPDATE public.especialidades SET tipo_consulta = 'Odontologica'
  WHERE nombre = 'Odontólogo' AND tipo_consulta IS NULL;

INSERT INTO public.especialidades (codigo, nombre, descripcion, tipo_consulta)
VALUES
  ('MED-GENERAL', 'Médico General', 'Atiende consultas médicas generales.', 'Medica'),
  ('ODONTOLOGO', 'Odontólogo', 'Atiende consultas odontológicas.', 'Odontologica')
ON CONFLICT DO NOTHING;

-- los usuarios con los roles viejos medico/odontologo conservan su profesión
UPDATE public.perfiles p
SET especialidad_id = e.id
FROM public.especialidades e
WHERE p.especialidad_id IS NULL
  AND ((p.rol::text = 'medico' AND e.nombre = 'Médico General')
    OR (p.rol::text = 'odontologo' AND e.nombre = 'Odontólogo'));


-- -------------------------------------------------------------------------
-- 4. perfiles.rol_id (con los valores viejos del enum mapeados)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rol_predeterminado_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT id FROM public.roles WHERE es_predeterminado LIMIT 1;
$$;

ALTER TABLE public.perfiles
  ADD COLUMN rol_id uuid REFERENCES public.roles(id) ON DELETE RESTRICT;

UPDATE public.perfiles p
SET rol_id = r.id
FROM public.roles r
WHERE r.nombre = CASE p.rol::text
  WHEN 'admin' THEN 'Administrador'
  WHEN 'coordinador' THEN 'Coordinador'
  WHEN 'atencion_pacientes' THEN 'Atención de Pacientes'
  WHEN 'medico' THEN 'Atención de Pacientes'
  WHEN 'odontologo' THEN 'Atención de Pacientes'
  WHEN 'enfermero' THEN 'Atención de Pacientes'
  WHEN 'encargado_farmacia' THEN 'Encargado de Farmacia'
  WHEN 'farmacia' THEN 'Encargado de Farmacia'
  WHEN 'encargado_bodega' THEN 'Encargado de Bodega'
  WHEN 'inventario' THEN 'Encargado de Bodega'
  -- voluntario, donaciones, actividades, ventas y cualquier otro valor
  ELSE 'Voluntario'
END;

ALTER TABLE public.perfiles
  ALTER COLUMN rol_id SET DEFAULT public.rol_predeterminado_id(),
  ALTER COLUMN rol_id SET NOT NULL;

CREATE INDEX idx_perfiles_rol_id ON public.perfiles USING btree (rol_id);


-- -------------------------------------------------------------------------
-- 5. FUNCIONES DE PERMISOS (las usan todas las políticas)
-- Se llaman como (SELECT public.tiene_permiso('x')) para que Postgres las
-- evalúe una vez por consulta y no por fila.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_permiso text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles pf
    JOIN public.roles r ON r.id = pf.rol_id
    WHERE pf.id = (SELECT auth.uid())
      AND pf.activo
      AND (
        r.es_superadmin
        OR p_permiso = 'perfil.read'
        OR EXISTS (
          SELECT 1 FROM public.rol_permisos rp
          WHERE rp.rol_id = r.id AND rp.permiso = p_permiso
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.tiene_algun_permiso(p_permisos text[]) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles pf
    JOIN public.roles r ON r.id = pf.rol_id
    WHERE pf.id = (SELECT auth.uid())
      AND pf.activo
      AND (
        r.es_superadmin
        OR 'perfil.read' = ANY (p_permisos)
        OR EXISTS (
          SELECT 1 FROM public.rol_permisos rp
          WHERE rp.rol_id = r.id AND rp.permiso = ANY (p_permisos)
        )
      )
  );
$$;

-- usuario del panel: tiene algún permiso además de su propio perfil
-- (reemplaza a is_panel_user; sirve para leer nombres de otros perfiles)
CREATE OR REPLACE FUNCTION public.es_usuario_panel() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles pf
    JOIN public.roles r ON r.id = pf.rol_id
    WHERE pf.id = (SELECT auth.uid())
      AND pf.activo
      AND (
        r.es_superadmin
        OR EXISTS (
          SELECT 1 FROM public.rol_permisos rp
          WHERE rp.rol_id = r.id AND rp.permiso NOT LIKE 'perfil.%'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.es_superadmin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles pf
    JOIN public.roles r ON r.id = pf.rol_id
    WHERE pf.id = (SELECT auth.uid()) AND pf.activo AND r.es_superadmin
  );
$$;


-- -------------------------------------------------------------------------
-- 6. GUARDAS CONTRA ESCALADA DE PRIVILEGIOS
-- Con auth.uid() nulo (migraciones, SQL editor, service role) no aplican.
-- -------------------------------------------------------------------------

-- perfiles: el rol y el acceso solo los cambia quien tiene usuarios.update,
-- nunca sobre sí mismo; el rol de superadmin solo lo da o quita otro superadmin
CREATE OR REPLACE FUNCTION public.trg_perfiles_proteger_rol() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- el registro propio entra siempre con el rol predeterminado y activo
    IF NOT public.tiene_permiso('usuarios.create') THEN
      NEW.rol_id := public.rol_predeterminado_id();
      NEW.activo := true;
    ELSIF (SELECT es_superadmin FROM public.roles WHERE id = NEW.rol_id) AND NOT public.es_superadmin() THEN
      RAISE EXCEPTION 'Solo un administrador puede asignar el rol de administrador.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No se puede cambiar el identificador del perfil.' USING ERRCODE = '42501';
  END IF;

  IF NEW.rol_id IS DISTINCT FROM OLD.rol_id OR NEW.activo IS DISTINCT FROM OLD.activo THEN
    IF OLD.id = v_uid THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol ni tu acceso.' USING ERRCODE = '42501';
    END IF;
    IF NOT public.tiene_permiso('usuarios.update') THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el rol o el acceso de un usuario.' USING ERRCODE = '42501';
    END IF;
    IF NEW.rol_id IS DISTINCT FROM OLD.rol_id
      AND EXISTS (SELECT 1 FROM public.roles WHERE id IN (OLD.rol_id, NEW.rol_id) AND es_superadmin)
      AND NOT public.es_superadmin() THEN
      RAISE EXCEPTION 'Solo un administrador puede asignar o quitar el rol de administrador.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfiles_proteger_rol
  BEFORE INSERT OR UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_perfiles_proteger_rol();

-- roles: el superadmin y el predeterminado no se eliminan; los indicadores
-- es_superadmin no se tocan desde la app
CREATE OR REPLACE FUNCTION public.trg_roles_proteger() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.es_superadmin THEN
      RAISE EXCEPTION 'El rol de administrador no se puede eliminar.' USING ERRCODE = '42501';
    END IF;
    IF OLD.es_predeterminado THEN
      RAISE EXCEPTION 'El rol predeterminado no se puede eliminar; marca otro como predeterminado primero.' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.es_superadmin THEN
      RAISE EXCEPTION 'No se puede crear otro rol de administrador.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.es_superadmin IS DISTINCT FROM OLD.es_superadmin THEN
    RAISE EXCEPTION 'No se puede cambiar el rol de administrador.' USING ERRCODE = '42501';
  END IF;
  IF OLD.es_superadmin AND NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo un administrador puede editar el rol de administrador.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roles_proteger
  BEFORE INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_roles_proteger();

-- rol_permisos: nadie edita los permisos de su propio rol ni otorga lo que no tiene;
-- el superadmin no lleva filas (tiene todo)
CREATE OR REPLACE FUNCTION public.trg_rol_permisos_proteger() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_rol uuid := COALESCE(NEW.rol_id, OLD.rol_id);
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- borrado en cascada al eliminar el rol: lo controla la política de roles
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.roles WHERE id = OLD.rol_id) THEN
    RETURN OLD;
  END IF;

  IF EXISTS (SELECT 1 FROM public.roles WHERE id = v_rol AND es_superadmin) THEN
    RAISE EXCEPTION 'El rol de administrador siempre tiene todos los permisos.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.es_superadmin()
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = v_uid AND rol_id = v_rol) THEN
    RAISE EXCEPTION 'No puedes editar los permisos de tu propio rol.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NOT public.tiene_permiso(NEW.permiso) THEN
    RAISE EXCEPTION 'No puedes otorgar un permiso que no tienes (%).', NEW.permiso USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_rol_permisos_proteger
  BEFORE INSERT OR UPDATE OR DELETE ON public.rol_permisos
  FOR EACH ROW EXECUTE FUNCTION public.trg_rol_permisos_proteger();


-- -------------------------------------------------------------------------
-- 7. OPERACIONES DE ROLES EN UNA SOLA TRANSACCIÓN
-- SECURITY INVOKER: aplican las políticas y guardas de arriba.
-- -------------------------------------------------------------------------

-- crea (p_id nulo) o actualiza un rol y deja sus permisos exactamente en p_permisos
CREATE OR REPLACE FUNCTION public.guardar_rol(
  p_id uuid,
  p_nombre text,
  p_descripcion text,
  p_color text,
  p_predeterminado boolean,
  p_permisos text[]
) RETURNS uuid
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
DECLARE
  v_id uuid := p_id;
  v_superadmin boolean := false;
  v_era_predeterminado boolean := false;
BEGIN
  IF v_id IS NULL THEN
    IF NOT public.tiene_permiso('roles.create') THEN
      RAISE EXCEPTION 'No tienes permiso para crear roles.' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.roles (nombre, descripcion, color)
    VALUES (btrim(p_nombre), NULLIF(btrim(p_descripcion), ''), p_color)
    RETURNING id INTO v_id;
  ELSE
    IF NOT public.tiene_permiso('roles.update') THEN
      RAISE EXCEPTION 'No tienes permiso para editar roles.' USING ERRCODE = '42501';
    END IF;
    SELECT es_superadmin, es_predeterminado INTO v_superadmin, v_era_predeterminado
    FROM public.roles WHERE id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El rol ya no existe.' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.roles
    SET nombre = btrim(p_nombre), descripcion = NULLIF(btrim(p_descripcion), ''), color = p_color
    WHERE id = v_id;
  END IF;

  -- el predeterminado se cambia marcando otro, nunca dejando ninguno
  IF p_predeterminado AND NOT v_era_predeterminado THEN
    IF v_superadmin THEN
      RAISE EXCEPTION 'El rol de administrador no puede ser el predeterminado.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.roles SET es_predeterminado = false WHERE es_predeterminado AND id <> v_id;
    UPDATE public.roles SET es_predeterminado = true WHERE id = v_id;
  ELSIF NOT p_predeterminado AND v_era_predeterminado THEN
    RAISE EXCEPTION 'Debe haber un rol predeterminado: marca otro rol como predeterminado.' USING ERRCODE = '22023';
  END IF;

  IF NOT v_superadmin THEN
    DELETE FROM public.rol_permisos
    WHERE rol_id = v_id AND NOT (permiso = ANY (COALESCE(p_permisos, '{}')));

    -- solo los nuevos: el trigger exige tener cada permiso que se otorga
    INSERT INTO public.rol_permisos (rol_id, permiso)
    SELECT DISTINCT v_id, p FROM unnest(COALESCE(p_permisos, '{}')) AS p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rol_permisos rp WHERE rp.rol_id = v_id AND rp.permiso = p
    );
  END IF;

  RETURN v_id;
END;
$$;

-- elimina un rol moviendo antes a sus usuarios a p_destino
CREATE OR REPLACE FUNCTION public.eliminar_rol(p_id uuid, p_destino uuid) RETURNS void
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
BEGIN
  IF NOT public.tiene_permiso('roles.delete') THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar roles.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.perfiles WHERE rol_id = p_id) THEN
    IF p_destino IS NULL OR p_destino = p_id THEN
      RAISE EXCEPTION 'Elige a qué rol pasan los usuarios de este rol.' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_destino) THEN
      RAISE EXCEPTION 'El rol de destino ya no existe.' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.perfiles SET rol_id = p_destino, updated_at = now() WHERE rol_id = p_id;
  END IF;

  DELETE FROM public.roles WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo eliminar el rol.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_rol(uuid, text, text, text, boolean, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eliminar_rol(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_rol(uuid, text, text, text, boolean, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_rol(uuid, uuid) TO authenticated;

-- cupos ocupados de una brigada para el sitio público (las inscripciones no se leen sin sesión)
CREATE OR REPLACE FUNCTION public.cupos_ocupados(p_brigada uuid) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT count(*)::integer
  FROM public.inscripciones_voluntarios
  WHERE brigada_id = p_brigada AND estado::text <> 'rechazado';
$$;

GRANT EXECUTE ON FUNCTION public.cupos_ocupados(uuid) TO anon, authenticated;


-- -------------------------------------------------------------------------
-- 8. TRIGGERS DE STOCK COMO DEFINER
-- Descuentan stock en tablas de otro módulo (entregar una receta descuenta
-- lotes y medicamentos). Así basta con el permiso de la tabla que se escribe.
-- -------------------------------------------------------------------------

ALTER FUNCTION public.actualizar_stock() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.recalcular_stock_medicamento() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.trg_entrega_farmacia_after_insert() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.trg_decrease_stock() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.trg_update_venta_total() SECURITY DEFINER SET search_path = public;


-- -------------------------------------------------------------------------
-- 9. POLÍTICAS: se reemplazan todas las de public por un juego por permisos.
-- Convención: "<tabla>: leer|crear|editar|eliminar".
-- -------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- roles y rol_permisos: cualquier usuario logueado los lee (nombre y badge del rol)
CREATE POLICY "roles: leer" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles: crear" ON public.roles FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('roles.create')));
CREATE POLICY "roles: editar" ON public.roles FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('roles.update')))
  WITH CHECK ((SELECT public.tiene_permiso('roles.update')));
CREATE POLICY "roles: eliminar" ON public.roles FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('roles.delete')));

CREATE POLICY "rol_permisos: leer" ON public.rol_permisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "rol_permisos: crear" ON public.rol_permisos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_algun_permiso(ARRAY['roles.create', 'roles.update'])));
CREATE POLICY "rol_permisos: eliminar" ON public.rol_permisos FOR DELETE TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['roles.update', 'roles.delete'])));

-- perfiles: el propio siempre; los demás, quien usa el panel (nombres en listas y reportes)
CREATE POLICY "perfiles: leer" ON public.perfiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.es_usuario_panel()));
-- el propio perfil al registrarse (el trigger le fuerza el rol predeterminado)
CREATE POLICY "perfiles: crear" ON public.perfiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.tiene_permiso('usuarios.create')));
CREATE POLICY "perfiles: editar" ON public.perfiles FOR UPDATE TO authenticated
  USING ((id = (SELECT auth.uid()) AND (SELECT public.tiene_permiso('perfil.update')))
    OR (SELECT public.tiene_permiso('usuarios.update')))
  WITH CHECK ((id = (SELECT auth.uid()) AND (SELECT public.tiene_permiso('perfil.update')))
    OR (SELECT public.tiene_permiso('usuarios.update')));
CREATE POLICY "perfiles: eliminar" ON public.perfiles FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('usuarios.delete')) AND id <> (SELECT auth.uid()));

-- user_roles (tabla heredada, sin uso en la app)
CREATE POLICY "user_roles: leer" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.tiene_permiso('usuarios.read')));
CREATE POLICY "user_roles: crear" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('usuarios.update')));
CREATE POLICY "user_roles: editar" ON public.user_roles FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('usuarios.update')))
  WITH CHECK ((SELECT public.tiene_permiso('usuarios.update')));
CREATE POLICY "user_roles: eliminar" ON public.user_roles FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('usuarios.delete')));

-- especialidades: catálogo público (formulario de voluntariado)
CREATE POLICY "especialidades: leer" ON public.especialidades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "especialidades: crear" ON public.especialidades FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_algun_permiso(ARRAY['voluntariado.create', 'voluntariado.update'])));
CREATE POLICY "especialidades: editar" ON public.especialidades FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('voluntariado.update')))
  WITH CHECK ((SELECT public.tiene_permiso('voluntariado.update')));
CREATE POLICY "especialidades: eliminar" ON public.especialidades FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('voluntariado.delete')));

-- brigadas: lectura pública (sitio web); escritura del módulo de brigadas
CREATE POLICY "brigadas: leer" ON public.brigadas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "brigadas: crear" ON public.brigadas FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.create')));
CREATE POLICY "brigadas: editar" ON public.brigadas FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "brigadas: eliminar" ON public.brigadas FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.delete')));

CREATE POLICY "brigada_imagenes: leer" ON public.brigada_imagenes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "brigada_imagenes: crear" ON public.brigada_imagenes FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "brigada_imagenes: editar" ON public.brigada_imagenes FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "brigada_imagenes: eliminar" ON public.brigada_imagenes FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')));

CREATE POLICY "presupuestos_brigada: leer" ON public.presupuestos_brigada FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['brigadas.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "presupuestos_brigada: crear" ON public.presupuestos_brigada FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_algun_permiso(ARRAY['brigadas.create', 'brigadas.update'])));
CREATE POLICY "presupuestos_brigada: editar" ON public.presupuestos_brigada FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "presupuestos_brigada: eliminar" ON public.presupuestos_brigada FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.delete')));

CREATE POLICY "gastos_brigada: leer" ON public.gastos_brigada FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['brigadas.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "gastos_brigada: crear" ON public.gastos_brigada FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "gastos_brigada: editar" ON public.gastos_brigada FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "gastos_brigada: eliminar" ON public.gastos_brigada FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')));

-- inscripciones: el formulario público inserta; la gestión es del módulo de brigadas
CREATE POLICY "inscripciones_voluntarios: crear" ON public.inscripciones_voluntarios FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "inscripciones_voluntarios: leer" ON public.inscripciones_voluntarios FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['brigadas.read', 'voluntariado.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "inscripciones_voluntarios: editar" ON public.inscripciones_voluntarios FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "inscripciones_voluntarios: eliminar" ON public.inscripciones_voluntarios FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.delete')));

-- asignaciones y participaciones: cada voluntario ve las suyas (panel principal)
CREATE POLICY "asignaciones_voluntarios: leer" ON public.asignaciones_voluntarios FOR SELECT TO authenticated
  USING (perfil_id = (SELECT auth.uid())
    OR (SELECT public.tiene_algun_permiso(ARRAY['brigadas.read', 'voluntariado.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "asignaciones_voluntarios: crear" ON public.asignaciones_voluntarios FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "asignaciones_voluntarios: editar" ON public.asignaciones_voluntarios FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "asignaciones_voluntarios: eliminar" ON public.asignaciones_voluntarios FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')));

CREATE POLICY "participaciones_voluntarios: leer" ON public.participaciones_voluntarios FOR SELECT TO authenticated
  USING (perfil_id = (SELECT auth.uid())
    OR (SELECT public.tiene_algun_permiso(ARRAY['brigadas.read', 'voluntariado.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "participaciones_voluntarios: crear" ON public.participaciones_voluntarios FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "participaciones_voluntarios: editar" ON public.participaciones_voluntarios FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "participaciones_voluntarios: eliminar" ON public.participaciones_voluntarios FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('brigadas.delete')));

-- voluntarios (formulario público heredado)
CREATE POLICY "voluntarios: crear" ON public.voluntarios FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "voluntarios: leer" ON public.voluntarios FOR SELECT TO authenticated
  USING ((SELECT public.tiene_permiso('voluntariado.read')));
CREATE POLICY "voluntarios: editar" ON public.voluntarios FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('voluntariado.update')))
  WITH CHECK ((SELECT public.tiene_permiso('voluntariado.update')));
CREATE POLICY "voluntarios: eliminar" ON public.voluntarios FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('voluntariado.delete')));

-- pacientes: datos de contacto; también los usan farmacia (recetas) y donaciones (entrega de ropa)
CREATE POLICY "pacientes: leer" ON public.pacientes FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.read', 'farmacia.read', 'donaciones.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "pacientes: crear" ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.create')));
CREATE POLICY "pacientes: editar" ON public.pacientes FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "pacientes: eliminar" ON public.pacientes FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.delete')));

-- datos clínicos: preclínica y consulta se registran con pacientes.update (etapas del expediente)
CREATE POLICY "signos_vitales: leer" ON public.signos_vitales FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "signos_vitales: crear" ON public.signos_vitales FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "signos_vitales: editar" ON public.signos_vitales FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "signos_vitales: eliminar" ON public.signos_vitales FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.delete')));

CREATE POLICY "consultas: leer" ON public.consultas FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.read', 'farmacia.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "consultas: crear" ON public.consultas FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "consultas: editar" ON public.consultas FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "consultas: eliminar" ON public.consultas FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.delete')));

-- al corregir diagnósticos se borran los anteriores con pacientes.update
CREATE POLICY "diagnosticos_consulta: leer" ON public.diagnosticos_consulta FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "diagnosticos_consulta: crear" ON public.diagnosticos_consulta FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "diagnosticos_consulta: editar" ON public.diagnosticos_consulta FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "diagnosticos_consulta: eliminar" ON public.diagnosticos_consulta FOR DELETE TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.update', 'pacientes.delete'])));

CREATE POLICY "medicamentos_consulta: leer" ON public.medicamentos_consulta FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.read', 'farmacia.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "medicamentos_consulta: crear" ON public.medicamentos_consulta FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "medicamentos_consulta: editar" ON public.medicamentos_consulta FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "medicamentos_consulta: eliminar" ON public.medicamentos_consulta FOR DELETE TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['pacientes.update', 'pacientes.delete'])));

-- atenciones_pacientes (tabla heredada, sin uso en la app)
CREATE POLICY "atenciones_pacientes: leer" ON public.atenciones_pacientes FOR SELECT TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.read')));
CREATE POLICY "atenciones_pacientes: crear" ON public.atenciones_pacientes FOR INSERT TO authenticated
  WITH CHECK (atendido_por = (SELECT auth.uid()) AND (SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "atenciones_pacientes: editar" ON public.atenciones_pacientes FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.update')))
  WITH CHECK ((SELECT public.tiene_permiso('pacientes.update')));
CREATE POLICY "atenciones_pacientes: eliminar" ON public.atenciones_pacientes FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('pacientes.delete')));

-- inventario: farmacia lee medicamentos y lotes (FEFO); quien receta lee medicamentos
CREATE POLICY "categorias_inventario: leer" ON public.categorias_inventario FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['inventario.read', 'farmacia.read'])));
CREATE POLICY "categorias_inventario: crear" ON public.categorias_inventario FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('inventario.create')));
CREATE POLICY "categorias_inventario: editar" ON public.categorias_inventario FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.update')))
  WITH CHECK ((SELECT public.tiene_permiso('inventario.update')));
CREATE POLICY "categorias_inventario: eliminar" ON public.categorias_inventario FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.delete')));

CREATE POLICY "medicamentos: leer" ON public.medicamentos FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['inventario.read', 'farmacia.read', 'pacientes.update', 'reportes.read', 'reportes.process'])));
CREATE POLICY "medicamentos: crear" ON public.medicamentos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('inventario.create')));
CREATE POLICY "medicamentos: editar" ON public.medicamentos FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.update')))
  WITH CHECK ((SELECT public.tiene_permiso('inventario.update')));
CREATE POLICY "medicamentos: eliminar" ON public.medicamentos FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.delete')));

CREATE POLICY "lotes_medicamentos: leer" ON public.lotes_medicamentos FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['inventario.read', 'farmacia.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "lotes_medicamentos: crear" ON public.lotes_medicamentos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('inventario.create')));
CREATE POLICY "lotes_medicamentos: editar" ON public.lotes_medicamentos FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.update')))
  WITH CHECK ((SELECT public.tiene_permiso('inventario.update')));
CREATE POLICY "lotes_medicamentos: eliminar" ON public.lotes_medicamentos FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.delete')));

-- los movimientos de una entrega de farmacia los inserta el trigger (definer)
CREATE POLICY "movimientos_inventario: leer" ON public.movimientos_inventario FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['inventario.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "movimientos_inventario: crear" ON public.movimientos_inventario FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('inventario.create')));
CREATE POLICY "movimientos_inventario: eliminar" ON public.movimientos_inventario FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('inventario.delete')));

-- farmacia
CREATE POLICY "entregas_farmacia: leer" ON public.entregas_farmacia FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['farmacia.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "entregas_farmacia: crear" ON public.entregas_farmacia FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('farmacia.process')));
CREATE POLICY "entregas_farmacia: editar" ON public.entregas_farmacia FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('farmacia.update')))
  WITH CHECK ((SELECT public.tiene_permiso('farmacia.update')));
CREATE POLICY "entregas_farmacia: eliminar" ON public.entregas_farmacia FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('farmacia.delete')));

-- donaciones de ropa
CREATE POLICY "donaciones_ropa: leer" ON public.donaciones_ropa FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['donaciones.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "donaciones_ropa: crear" ON public.donaciones_ropa FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('donaciones.create')));
CREATE POLICY "donaciones_ropa: editar" ON public.donaciones_ropa FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('donaciones.update')))
  WITH CHECK ((SELECT public.tiene_permiso('donaciones.update')));
CREATE POLICY "donaciones_ropa: eliminar" ON public.donaciones_ropa FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('donaciones.delete')));

CREATE POLICY "entregas_ropa: leer" ON public.entregas_ropa FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['donaciones.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "entregas_ropa: crear" ON public.entregas_ropa FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('donaciones.create')));
CREATE POLICY "entregas_ropa: editar" ON public.entregas_ropa FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('donaciones.update')))
  WITH CHECK ((SELECT public.tiene_permiso('donaciones.update')));
CREATE POLICY "entregas_ropa: eliminar" ON public.entregas_ropa FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('donaciones.delete')));

-- actividades infantiles: registrar niños en una actividad es actividades.update
CREATE POLICY "actividades_infantiles: leer" ON public.actividades_infantiles FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['actividades.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "actividades_infantiles: crear" ON public.actividades_infantiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('actividades.create')));
CREATE POLICY "actividades_infantiles: editar" ON public.actividades_infantiles FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('actividades.update')))
  WITH CHECK ((SELECT public.tiene_permiso('actividades.update')));
CREATE POLICY "actividades_infantiles: eliminar" ON public.actividades_infantiles FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('actividades.delete')));

CREATE POLICY "participantes_actividad: leer" ON public.participantes_actividad FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['actividades.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "participantes_actividad: crear" ON public.participantes_actividad FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_algun_permiso(ARRAY['actividades.create', 'actividades.update'])));
CREATE POLICY "participantes_actividad: editar" ON public.participantes_actividad FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('actividades.update')))
  WITH CHECK ((SELECT public.tiene_permiso('actividades.update')));
CREATE POLICY "participantes_actividad: eliminar" ON public.participantes_actividad FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('actividades.delete')));

-- ventas de apoyo: el total y el stock los actualizan triggers (definer)
CREATE POLICY "categorias_productos: leer" ON public.categorias_productos FOR SELECT TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.read')));
CREATE POLICY "categorias_productos: crear" ON public.categorias_productos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('ventas.create')));
CREATE POLICY "categorias_productos: editar" ON public.categorias_productos FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('ventas.update')));
CREATE POLICY "categorias_productos: eliminar" ON public.categorias_productos FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.delete')));

CREATE POLICY "productos: leer" ON public.productos FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['ventas.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "productos: crear" ON public.productos FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('ventas.create')));
CREATE POLICY "productos: editar" ON public.productos FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('ventas.update')));
CREATE POLICY "productos: eliminar" ON public.productos FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.delete')));

CREATE POLICY "ventas: leer" ON public.ventas FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['ventas.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "ventas: crear" ON public.ventas FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('ventas.create')));
CREATE POLICY "ventas: editar" ON public.ventas FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('ventas.update')));
-- quien registra una venta puede deshacer la suya si falla el detalle
CREATE POLICY "ventas: eliminar" ON public.ventas FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.delete'))
    OR (vendedor_id = (SELECT auth.uid()) AND (SELECT public.tiene_permiso('ventas.create'))));

CREATE POLICY "detalle_ventas: leer" ON public.detalle_ventas FOR SELECT TO authenticated
  USING ((SELECT public.tiene_algun_permiso(ARRAY['ventas.read', 'reportes.read', 'reportes.process'])));
CREATE POLICY "detalle_ventas: crear" ON public.detalle_ventas FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.tiene_permiso('ventas.create')));
CREATE POLICY "detalle_ventas: editar" ON public.detalle_ventas FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.update')))
  WITH CHECK ((SELECT public.tiene_permiso('ventas.update')));
CREATE POLICY "detalle_ventas: eliminar" ON public.detalle_ventas FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('ventas.delete')));

-- contacto: el formulario público inserta; la bandeja es del panel
CREATE POLICY "contacto: crear" ON public.contacto FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "contacto: leer" ON public.contacto FOR SELECT TO authenticated
  USING ((SELECT public.tiene_permiso('contacto.read')));
CREATE POLICY "contacto: editar" ON public.contacto FOR UPDATE TO authenticated
  USING ((SELECT public.tiene_permiso('contacto.update')))
  WITH CHECK ((SELECT public.tiene_permiso('contacto.update')));
CREATE POLICY "contacto: eliminar" ON public.contacto FOR DELETE TO authenticated
  USING ((SELECT public.tiene_permiso('contacto.delete')));

-- storage: las fotos de brigadas son públicas para ver; subir y borrar es del módulo
DROP POLICY IF EXISTS "Permitir eliminar de brigadas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de brigadas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida a brigadas" ON storage.objects;

CREATE POLICY "brigadas: ver fotos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'brigadas');
CREATE POLICY "brigadas: subir fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brigadas' AND (SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "brigadas: editar fotos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brigadas' AND (SELECT public.tiene_permiso('brigadas.update')))
  WITH CHECK (bucket_id = 'brigadas' AND (SELECT public.tiene_permiso('brigadas.update')));
CREATE POLICY "brigadas: borrar fotos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brigadas' AND (SELECT public.tiene_permiso('brigadas.update')));


-- -------------------------------------------------------------------------
-- 10. VISTAS: dejan de filtrar por el enum y respetan RLS
-- "Voluntario" en los paneles = usuario con el rol predeterminado.
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.dashboard_voluntarios AS
 SELECT count(*) AS total_inscritos,
    count(*) FILTER (WHERE EXTRACT(year FROM p.created_at) = EXTRACT(year FROM CURRENT_DATE)) AS nuevos_este_ano,
    count(*) FILTER (WHERE (p.especialidad_id IN ( SELECT especialidades.id
           FROM public.especialidades
          WHERE especialidades.nombre::text = ANY (ARRAY['Médico General'::text, 'Odontólogo'::text, 'Enfermería'::text, 'Farmacia'::text, 'Psicología'::text, 'Nutrición'::text])))) AS profesionales_salud,
    count(*) FILTER (WHERE (p.especialidad_id IN ( SELECT especialidades.id
           FROM public.especialidades
          WHERE especialidades.nombre::text = ANY (ARRAY['Logística'::text, 'Registro'::text])))) AS logistica
   FROM public.perfiles p
   JOIN public.roles r ON r.id = p.rol_id
  WHERE r.es_predeterminado;

CREATE OR REPLACE VIEW public.v_actividad_reciente AS
 SELECT 'Brigada Creada'::text AS tipo,
    brigadas.nombre AS descripcion,
    brigadas.created_at
   FROM public.brigadas
UNION ALL
 SELECT 'Venta Registrada'::text AS tipo,
    'Total: $'::text || ventas.total::text AS descripcion,
    ventas.created_at
   FROM public.ventas
UNION ALL
 SELECT 'Donación Ropa'::text AS tipo,
    donaciones_ropa.cantidad_prendas::text || ' prendas'::text AS descripcion,
    donaciones_ropa.created_at
   FROM public.donaciones_ropa
UNION ALL
 SELECT 'Nuevo Paciente'::text AS tipo,
    (pacientes.nombres::text || ' '::text) || pacientes.apellidos::text AS descripcion,
    pacientes.created_at
   FROM public.pacientes
UNION ALL
 SELECT 'Nuevo Voluntario'::text AS tipo,
    perfiles.nombre_completo AS descripcion,
    perfiles.created_at
   FROM public.perfiles
   JOIN public.roles ON roles.id = perfiles.rol_id
  WHERE roles.es_predeterminado
  ORDER BY 3 DESC NULLS LAST
 LIMIT 5;

-- todas las vistas de public consultan con los permisos de quien las lee
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v.relname);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v.relname);
  END LOOP;
END;
$$;


-- -------------------------------------------------------------------------
-- 11. LIMPIEZA: columna, enum y funciones por nombre de rol
-- Sin CASCADE: si algo aún dependiera de ellos, la migración falla aquí.
-- -------------------------------------------------------------------------

ALTER TABLE public.perfiles DROP COLUMN rol;
DROP TYPE public.user_role;

DROP FUNCTION public.is_clinical();
DROP FUNCTION public.is_panel_user();
DROP FUNCTION public.is_admin();
DROP FUNCTION public.has_role(text);
DROP FUNCTION public.has_any_role(text[]);
DROP FUNCTION public.get_user_role();
