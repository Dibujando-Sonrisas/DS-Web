


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."area_voluntariado" AS ENUM (
    'registro',
    'preclinica',
    'consulta_medica',
    'consulta_odontologica',
    'farmacia',
    'postclinica',
    'ropa',
    'actividades',
    'logistica',
    'coordinacion'
);


ALTER TYPE "public"."area_voluntariado" OWNER TO "postgres";


CREATE TYPE "public"."categoria_gasto" AS ENUM (
    'medicamentos',
    'alimentacion',
    'combustible',
    'material_medico',
    'papeleria',
    'publicidad',
    'otros'
);


ALTER TYPE "public"."categoria_gasto" OWNER TO "postgres";


CREATE TYPE "public"."estado_brigada" AS ENUM (
    'planificacion',
    'inscripciones_abiertas',
    'inscripciones_cerradas',
    'en_preparacion',
    'finalizada',
    'cancelada'
);


ALTER TYPE "public"."estado_brigada" OWNER TO "postgres";


CREATE TYPE "public"."estado_inscripcion" AS ENUM (
    'pendiente',
    'aceptado',
    'rechazado'
);


ALTER TYPE "public"."estado_inscripcion" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'coordinador',
    'medico',
    'odontologo',
    'enfermero',
    'farmacia',
    'inventario',
    'donaciones',
    'actividades',
    'ventas',
    'voluntario',
    'atencion_pacientes',
    'encargado_farmacia',
    'encargado_bodega'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."actualizar_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE

    v_stock INTEGER;

BEGIN

    SELECT stock_actual

    INTO v_stock

    FROM medicamentos

    WHERE id=NEW.medicamento_id;

    IF NEW.tipo='E' THEN

        UPDATE medicamentos

        SET stock_actual=v_stock+NEW.cantidad

        WHERE id=NEW.medicamento_id;

    ELSIF NEW.tipo='S' THEN

        IF v_stock<NEW.cantidad THEN

            RAISE EXCEPTION
            'No existe suficiente inventario.';

        END IF;

        UPDATE medicamentos

        SET stock_actual=v_stock-NEW.cantidad

        WHERE id=NEW.medicamento_id;

    ELSIF NEW.tipo='A' THEN

        UPDATE medicamentos

        SET stock_actual=NEW.cantidad

        WHERE id=NEW.medicamento_id;

    END IF;

    RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."actualizar_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_codigo_brigada"("fecha" "date") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    anio TEXT;
    consecutivo INTEGER;
BEGIN

    anio := TO_CHAR(fecha,'YYYY');

    SELECT COUNT(*) + 1
    INTO consecutivo
    FROM public.brigadas
    WHERE TO_CHAR(fecha_brigada,'YYYY') = anio;

    RETURN
        'BRG-' ||
        anio ||
        '-' ||
        LPAD(consecutivo::TEXT,3,'0');

END;
$$;


ALTER FUNCTION "public"."generar_codigo_brigada"("fecha" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT LOWER(COALESCE(rol::text, 'voluntario')) FROM public.perfiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN

INSERT INTO public.perfiles (
    id,
    nombre_completo
)
VALUES (
    NEW.id,
    COALESCE(
        NEW.raw_user_meta_data->>'nombre_completo',
        NEW.raw_user_meta_data->>'full_name',
        'Nuevo Voluntario'
    )
);

RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("required_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = auth.uid()
      AND LOWER(COALESCE(rol::text, '')) = ANY(
        SELECT LOWER(r) FROM unnest(required_roles) AS r
      )
  );
$$;


ALTER FUNCTION "public"."has_any_role"("required_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = auth.uid()
      AND LOWER(COALESCE(rol::text, '')) = LOWER(COALESCE(required_role, ''))
  );
$$;


ALTER FUNCTION "public"."has_role"("required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_role('admin');
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_clinical"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_any_role(ARRAY['admin', 'atencion_pacientes']);
$$;


ALTER FUNCTION "public"."is_clinical"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_panel_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_any_role(ARRAY[
    'admin',
    'coordinador',
    'atencion_pacientes',
    'encargado_farmacia',
    'encargado_bodega'
  ]);
$$;


ALTER FUNCTION "public"."is_panel_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_medicamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_medicamento UUID;
BEGIN

    IF TG_OP = 'DELETE' THEN
        v_medicamento := OLD.medicamento_id;
    ELSE
        v_medicamento := NEW.medicamento_id;
    END IF;

    UPDATE public.medicamentos
    SET stock_actual = COALESCE(
        (
            SELECT SUM(cantidad_actual)
            FROM public.lotes_medicamentos
            WHERE medicamento_id = v_medicamento
        ),
        0
    )
    WHERE id = v_medicamento;

    RETURN NULL;

END;
$$;


ALTER FUNCTION "public"."recalcular_stock_medicamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sp_confirmar_participacion"("p_brigada" "uuid", "p_perfil" "uuid", "p_hora_llegada" time without time zone, "p_hora_salida" time without time zone, "p_observaciones" "text", "p_registrado_por" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$

DECLARE

    v_id UUID;

BEGIN

    IF NOT EXISTS(

        SELECT 1

        FROM asignaciones_voluntarios

        WHERE brigada_id=p_brigada

        AND perfil_id=p_perfil

    )

    THEN

        RAISE EXCEPTION
        'El voluntario no está asignado a esta brigada';

    END IF;

    INSERT INTO participaciones_voluntarios(

        brigada_id,

        perfil_id,

        asistio,

        hora_llegada,

        hora_salida,

        observaciones,

        registrado_por

    )

    VALUES(

        p_brigada,

        p_perfil,

        TRUE,

        p_hora_llegada,

        p_hora_salida,

        p_observaciones,

        p_registrado_por

    )

    RETURNING id INTO v_id;

    RETURN v_id;

END;

$$;


ALTER FUNCTION "public"."sp_confirmar_participacion"("p_brigada" "uuid", "p_perfil" "uuid", "p_hora_llegada" time without time zone, "p_hora_salida" time without time zone, "p_observaciones" "text", "p_registrado_por" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_decrease_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE productos SET stock = stock - NEW.cantidad WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_decrease_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_entrega_farmacia_after_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_brigada_id UUID;
BEGIN
    SELECT brigada_id INTO v_brigada_id FROM consultas WHERE id = NEW.consulta_id;

    INSERT INTO movimientos_inventario (
        medicamento_id,
        brigada_id,
        cantidad,
        tipo,
        motivo,
        usuario_id,
        observaciones
    ) VALUES (
        NEW.medicamento_id,
        v_brigada_id,
        NEW.cantidad,
        'S',
        'Entrega a paciente (Farmacia)',
        NEW.entregado_por,
        NEW.observaciones
    );

    UPDATE lotes_medicamentos
    SET cantidad_actual = cantidad_actual - NEW.cantidad
    WHERE id = NEW.lote_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_entrega_farmacia_after_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_generar_codigo_brigada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$

BEGIN

    IF NEW.codigo IS NULL OR NEW.codigo = '' THEN

        NEW.codigo := public.generar_codigo_brigada(
            NEW.fecha_brigada
        );

    END IF;

    RETURN NEW;

END;

$$;


ALTER FUNCTION "public"."trg_generar_codigo_brigada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_update_venta_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE ventas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM detalle_ventas WHERE venta_id = NEW.venta_id) WHERE id = NEW.venta_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ventas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM detalle_ventas WHERE venta_id = OLD.venta_id) WHERE id = OLD.venta_id;
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION "public"."trg_update_venta_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."actividades_infantiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "descripcion" "text",
    "cantidad_regalos" integer DEFAULT 0,
    "responsable_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."actividades_infantiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lotes_medicamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medicamento_id" "uuid" NOT NULL,
    "numero_lote" character varying(50) NOT NULL,
    "fabricante" character varying(150),
    "fecha_vencimiento" "date" NOT NULL,
    "cantidad_actual" integer NOT NULL,
    "fecha_ingreso" "date" DEFAULT CURRENT_DATE,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cantidad_inicial" integer,
    CONSTRAINT "cantidad_inicial_check" CHECK (("cantidad_inicial" >= 0)),
    CONSTRAINT "lotes_medicamentos_cantidad_actual_check" CHECK (("cantidad_actual" >= 0))
);


ALTER TABLE "public"."lotes_medicamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medicamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "descripcion" "text",
    "presentacion" character varying(100),
    "unidad_medida" character varying(30),
    "stock_actual" integer DEFAULT 0 NOT NULL,
    "stock_minimo" integer DEFAULT 10,
    "requiere_receta" boolean DEFAULT false,
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_recurso" character varying(30) DEFAULT 'medicamento'::character varying NOT NULL,
    CONSTRAINT "chk_medicamentos_tipo_recurso" CHECK ((("tipo_recurso")::"text" = ANY ((ARRAY['medicamento'::character varying, 'insumo_medico'::character varying, 'material_brigada'::character varying])::"text"[]))),
    CONSTRAINT "medicamentos_stock_actual_check" CHECK (("stock_actual" >= 0)),
    CONSTRAINT "medicamentos_stock_minimo_check" CHECK (("stock_minimo" >= 0))
);


ALTER TABLE "public"."medicamentos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."alertas_vencimiento" AS
 SELECT "l"."id" AS "lote_id",
    "l"."numero_lote",
    "m"."nombre" AS "medicamento_nombre",
    "l"."fecha_vencimiento",
    "l"."cantidad_actual",
    ("l"."fecha_vencimiento" - CURRENT_DATE) AS "dias_restantes",
        CASE
            WHEN ("l"."fecha_vencimiento" < CURRENT_DATE) THEN 'Vencido'::"text"
            WHEN (("l"."fecha_vencimiento" - CURRENT_DATE) <= 30) THEN 'Próximo a Vencer'::"text"
            ELSE 'Normal'::"text"
        END AS "estado_vencimiento"
   FROM ("public"."lotes_medicamentos" "l"
     JOIN "public"."medicamentos" "m" ON (("l"."medicamento_id" = "m"."id")))
  WHERE ("l"."cantidad_actual" > 0);


ALTER VIEW "public"."alertas_vencimiento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asignaciones_voluntarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "perfil_id" "uuid" NOT NULL,
    "area_asignada" "public"."area_voluntariado" NOT NULL,
    "observaciones" "text",
    "asignado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asignaciones_voluntarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atenciones_pacientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "text" NOT NULL,
    "atendido_por" "uuid" NOT NULL,
    "tipo_atencion" "text" NOT NULL,
    "cantidad" integer DEFAULT 1 NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "atenciones_pacientes_cantidad_check" CHECK (("cantidad" > 0)),
    CONSTRAINT "atenciones_pacientes_tipo_atencion_check" CHECK (("tipo_atencion" = ANY (ARRAY['medico'::"text", 'odontologo'::"text"])))
);


ALTER TABLE "public"."atenciones_pacientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brigada_imagenes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "nombre_archivo" character varying(200) NOT NULL,
    "storage_path" "text" NOT NULL,
    "orden" integer DEFAULT 1,
    "portada" boolean DEFAULT false,
    "peso_kb" integer,
    "ancho" integer,
    "alto" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brigada_imagenes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brigadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(15) NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "descripcion" "text",
    "lugar" character varying(150) NOT NULL,
    "municipio" character varying(100) NOT NULL,
    "departamento" character varying(100) NOT NULL,
    "fecha_brigada" "date" NOT NULL,
    "fecha_inicio_inscripcion" "date" NOT NULL,
    "fecha_fin_inscripcion" "date" NOT NULL,
    "estado" "public"."estado_brigada" DEFAULT 'planificacion'::"public"."estado_brigada" NOT NULL,
    "capacidad_voluntarios" integer,
    "imagen_banner" "text",
    "latitud" numeric(9,6),
    "longitud" numeric(9,6),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brigadas_capacidad_voluntarios_check" CHECK (("capacidad_voluntarios" > 0)),
    CONSTRAINT "brigadas_check" CHECK (("fecha_fin_inscripcion" >= "fecha_inicio_inscripcion")),
    CONSTRAINT "brigadas_latitud_check" CHECK ((("latitud" >= ('-90'::integer)::numeric) AND ("latitud" <= (90)::numeric))),
    CONSTRAINT "brigadas_longitud_check" CHECK ((("longitud" >= ('-180'::integer)::numeric) AND ("longitud" <= (180)::numeric))),
    CONSTRAINT "brigadas_nombre_check" CHECK (("char_length"(("nombre")::"text") >= 5))
);


ALTER TABLE "public"."brigadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_inventario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(10) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categorias_inventario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(15) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categorias_productos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid" NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "medico_id" "uuid",
    "tipo_consulta" character varying(20),
    "motivo_consulta" "text",
    "enfermedad_actual" "text",
    "diagnostico" "text",
    "tratamiento" "text",
    "requiere_postclinica" boolean DEFAULT false,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "consultas_tipo_consulta_check" CHECK ((("tipo_consulta")::"text" = ANY ((ARRAY['Medica'::character varying, 'Odontologica'::character varying])::"text"[])))
);


ALTER TABLE "public"."consultas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "apellido" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefono" "text",
    "asunto" "text",
    "mensaje" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contacto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participantes_actividad" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actividad_id" "uuid" NOT NULL,
    "cantidad_ninos" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "participantes_actividad_cantidad_ninos_check" CHECK (("cantidad_ninos" > 0))
);


ALTER TABLE "public"."participantes_actividad" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_actividades" AS
 SELECT "count"(*) AS "actividades",
    COALESCE("sum"("pa"."cantidad_ninos"), (0)::bigint) AS "ninos_beneficiados"
   FROM ("public"."actividades_infantiles" "ai"
     LEFT JOIN "public"."participantes_actividad" "pa" ON (("pa"."actividad_id" = "ai"."id")));


ALTER VIEW "public"."dashboard_actividades" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_brigadas" AS
 SELECT "id",
    "nombre",
    "lugar",
    "fecha_brigada",
    "estado",
    "capacidad_voluntarios",
    ("fecha_brigada" - CURRENT_DATE) AS "dias_faltantes"
   FROM "public"."brigadas"
  WHERE ("estado" <> ALL (ARRAY['cancelada'::"public"."estado_brigada", 'finalizada'::"public"."estado_brigada"]))
  ORDER BY "fecha_brigada"
 LIMIT 1;


ALTER VIEW "public"."dashboard_brigadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entregas_farmacia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consulta_id" "uuid" NOT NULL,
    "medicamento_id" "uuid" NOT NULL,
    "lote_id" "uuid" NOT NULL,
    "cantidad" integer NOT NULL,
    "entregado_por" "uuid",
    "fecha_entrega" timestamp with time zone DEFAULT "now"(),
    "observaciones" "text",
    CONSTRAINT "entregas_farmacia_cantidad_check" CHECK (("cantidad" > 0))
);


ALTER TABLE "public"."entregas_farmacia" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_farmacia" AS
 SELECT "count"(*) AS "total_entregas",
    "sum"("cantidad") AS "total_unidades_entregadas",
    "count"(DISTINCT "consulta_id") AS "pacientes_atendidos"
   FROM "public"."entregas_farmacia";


ALTER VIEW "public"."dashboard_farmacia" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_actual" AS
 SELECT "m"."id" AS "medicamento_id",
    "m"."nombre",
    "m"."descripcion",
    "m"."unidad_medida",
    "m"."stock_minimo",
    "m"."tipo_recurso",
    COALESCE("sum"("l"."cantidad_actual"), (0)::bigint) AS "stock_total",
        CASE
            WHEN (COALESCE("sum"("l"."cantidad_actual"), (0)::bigint) = 0) THEN 'Sin Existencias'::"text"
            WHEN (COALESCE("sum"("l"."cantidad_actual"), (0)::bigint) <= "m"."stock_minimo") THEN 'Stock Crítico'::"text"
            ELSE 'Normal'::"text"
        END AS "estado_stock"
   FROM ("public"."medicamentos" "m"
     LEFT JOIN "public"."lotes_medicamentos" "l" ON (("l"."medicamento_id" = "m"."id")))
  GROUP BY "m"."id", "m"."nombre", "m"."descripcion", "m"."unidad_medida", "m"."stock_minimo", "m"."tipo_recurso";


ALTER VIEW "public"."stock_actual" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_inventario" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."medicamentos") AS "total_medicamentos",
    ( SELECT COALESCE("sum"("lotes_medicamentos"."cantidad_actual"), (0)::bigint) AS "coalesce"
           FROM "public"."lotes_medicamentos") AS "unidades_totales",
    ( SELECT "count"(*) AS "count"
           FROM "public"."stock_actual"
          WHERE ("stock_actual"."estado_stock" = 'Stock Bajo'::"text")) AS "medicamentos_stock_bajo",
    ( SELECT "count"(*) AS "count"
           FROM "public"."alertas_vencimiento"
          WHERE ("alertas_vencimiento"."estado_vencimiento" = 'Próximo a Vencer'::"text")) AS "lotes_proximos_vencer",
    ( SELECT "count"(*) AS "count"
           FROM "public"."alertas_vencimiento"
          WHERE ("alertas_vencimiento"."estado_vencimiento" = 'Vencido'::"text")) AS "lotes_vencidos";


ALTER VIEW "public"."dashboard_inventario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nombres" character varying(120) NOT NULL,
    "apellidos" character varying(120),
    "sexo" character varying(15),
    "fecha_nacimiento" "date",
    "edad" integer,
    "telefono" character varying(25),
    "comunidad" character varying(150),
    "responsable" character varying(150),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pacientes_sexo_check" CHECK ((("sexo")::"text" = ANY ((ARRAY['Masculino'::character varying, 'Femenino'::character varying])::"text"[])))
);


ALTER TABLE "public"."pacientes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_pacientes" AS
 SELECT "count"(*) AS "pacientes",
    "count"(
        CASE
            WHEN (("sexo")::"text" = 'Masculino'::"text") THEN 1
            ELSE NULL::integer
        END) AS "hombres",
    "count"(
        CASE
            WHEN (("sexo")::"text" = 'Femenino'::"text") THEN 1
            ELSE NULL::integer
        END) AS "mujeres"
   FROM "public"."pacientes";


ALTER VIEW "public"."dashboard_pacientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entregas_ropa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid" NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "cantidad_prendas" integer NOT NULL,
    "entregado_por" "uuid",
    "fecha_entrega" timestamp with time zone DEFAULT "now"(),
    "observaciones" "text",
    CONSTRAINT "entregas_ropa_cantidad_prendas_check" CHECK ((("cantidad_prendas" > 0) AND ("cantidad_prendas" <= 2)))
);


ALTER TABLE "public"."entregas_ropa" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_ropa" AS
 SELECT "count"(DISTINCT "paciente_id") AS "pacientes_beneficiados",
    COALESCE("sum"("cantidad_prendas"), (0)::bigint) AS "prendas_entregadas"
   FROM "public"."entregas_ropa";


ALTER VIEW "public"."dashboard_ropa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ventas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "fecha" timestamp with time zone DEFAULT "now"(),
    "vendedor_id" "uuid",
    "brigada_id" "uuid",
    "total" numeric(10,2) DEFAULT 0,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ventas" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_ventas" AS
 SELECT "count"(*) AS "ventas",
    COALESCE("sum"("total"), (0)::numeric) AS "ingresos",
    COALESCE("avg"("total"), (0)::numeric) AS "promedio_venta"
   FROM "public"."ventas";


ALTER VIEW "public"."dashboard_ventas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."especialidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(15) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."especialidades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfiles" (
    "id" "uuid" NOT NULL,
    "nombre_completo" "text" NOT NULL,
    "telefono" "text",
    "rol" "public"."user_role" DEFAULT 'voluntario'::"public"."user_role" NOT NULL,
    "cargo" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_nacimiento" "date",
    "sexo" character(1),
    "especialidad_id" "uuid",
    CONSTRAINT "perfiles_nombre_completo_check" CHECK ((("char_length"("nombre_completo") >= 5) AND ("char_length"("nombre_completo") <= 120))),
    CONSTRAINT "perfiles_sexo_check" CHECK (("sexo" = ANY (ARRAY['M'::"bpchar", 'F'::"bpchar"])))
);


ALTER TABLE "public"."perfiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_voluntarios" AS
 SELECT "count"(*) AS "total_inscritos",
    "count"(*) FILTER (WHERE (EXTRACT(year FROM "created_at") = EXTRACT(year FROM CURRENT_DATE))) AS "nuevos_este_ano",
    "count"(*) FILTER (WHERE ("especialidad_id" IN ( SELECT "especialidades"."id"
           FROM "public"."especialidades"
          WHERE (("especialidades"."nombre")::"text" = ANY ((ARRAY['Médico General'::character varying, 'Odontólogo'::character varying, 'Enfermería'::character varying, 'Farmacia'::character varying, 'Psicología'::character varying, 'Nutrición'::character varying])::"text"[]))))) AS "profesionales_salud",
    "count"(*) FILTER (WHERE ("especialidad_id" IN ( SELECT "especialidades"."id"
           FROM "public"."especialidades"
          WHERE (("especialidades"."nombre")::"text" = ANY ((ARRAY['Logística'::character varying, 'Registro'::character varying])::"text"[]))))) AS "logistica"
   FROM "public"."perfiles" "p"
  WHERE ("rol" = 'voluntario'::"public"."user_role");


ALTER VIEW "public"."dashboard_voluntarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."detalle_ventas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "venta_id" "uuid" NOT NULL,
    "producto_id" "uuid" NOT NULL,
    "cantidad" integer NOT NULL,
    "precio_unitario" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    CONSTRAINT "detalle_ventas_cantidad_check" CHECK (("cantidad" > 0))
);


ALTER TABLE "public"."detalle_ventas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diagnosticos_consulta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consulta_id" "uuid" NOT NULL,
    "diagnostico" "text" NOT NULL
);


ALTER TABLE "public"."diagnosticos_consulta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donaciones_ropa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "fecha_donacion" "date" NOT NULL,
    "nombre_donante" character varying(150),
    "cantidad_prendas" integer NOT NULL,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "donaciones_ropa_cantidad_prendas_check" CHECK (("cantidad_prendas" > 0))
);


ALTER TABLE "public"."donaciones_ropa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movimientos_inventario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medicamento_id" "uuid" NOT NULL,
    "tipo" character(1),
    "cantidad" integer NOT NULL,
    "motivo" character varying(200),
    "brigada_id" "uuid",
    "usuario_id" "uuid",
    "fecha_movimiento" timestamp with time zone DEFAULT "now"(),
    "observaciones" "text",
    CONSTRAINT "movimientos_inventario_cantidad_check" CHECK (("cantidad" > 0)),
    CONSTRAINT "movimientos_inventario_tipo_check" CHECK (("tipo" = ANY (ARRAY['E'::"bpchar", 'S'::"bpchar", 'A'::"bpchar"])))
);


ALTER TABLE "public"."movimientos_inventario" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."estadisticas_inventario" AS
 SELECT EXTRACT(month FROM "fecha_movimiento") AS "mes",
    EXTRACT(year FROM "fecha_movimiento") AS "anio",
    "tipo",
    "sum"("cantidad") AS "total_movimientos"
   FROM "public"."movimientos_inventario"
  GROUP BY (EXTRACT(year FROM "fecha_movimiento")), (EXTRACT(month FROM "fecha_movimiento")), "tipo"
  ORDER BY (EXTRACT(year FROM "fecha_movimiento")) DESC, (EXTRACT(month FROM "fecha_movimiento")) DESC;


ALTER VIEW "public"."estadisticas_inventario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gastos_brigada" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "categoria" "public"."categoria_gasto" NOT NULL,
    "descripcion" "text" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "fecha_gasto" "date" NOT NULL,
    "comprobante_url" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gastos_brigada_monto_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."gastos_brigada" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inscripciones_voluntarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "nombre_completo" character varying(150) NOT NULL,
    "correo" character varying(150) NOT NULL,
    "telefono" character varying(20),
    "profesion" character varying(100),
    "area_interes" character varying(100),
    "comentarios" "text",
    "estado" "public"."estado_inscripcion" DEFAULT 'pendiente'::"public"."estado_inscripcion",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inscripciones_voluntarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medicamentos_consulta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consulta_id" "uuid" NOT NULL,
    "medicamento_id" "uuid" NOT NULL,
    "cantidad" integer NOT NULL,
    "indicaciones" "text"
);


ALTER TABLE "public"."medicamentos_consulta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participaciones_voluntarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "perfil_id" "uuid" NOT NULL,
    "asignacion_id" "uuid",
    "asistio" boolean DEFAULT true NOT NULL,
    "hora_llegada" time without time zone,
    "hora_salida" time without time zone,
    "observaciones" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."participaciones_voluntarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presupuestos_brigada" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brigada_id" "uuid" NOT NULL,
    "presupuesto_estimado" numeric(12,2) NOT NULL,
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "presupuestos_brigada_presupuesto_estimado_check" CHECK (("presupuesto_estimado" >= (0)::numeric))
);


ALTER TABLE "public"."presupuestos_brigada" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "descripcion" "text",
    "precio" numeric(10,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "productos_precio_check" CHECK (("precio" >= (0)::numeric)),
    CONSTRAINT "productos_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signos_vitales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid" NOT NULL,
    "peso" numeric(5,2),
    "talla" numeric(5,2),
    "temperatura" numeric(4,2),
    "frecuencia_cardiaca" integer,
    "frecuencia_respiratoria" integer,
    "presion_arterial" character varying(20),
    "saturacion" integer,
    "glucosa" numeric(5,2),
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signos_vitales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text", 'medico'::"text", 'odontologo'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_actividad_reciente" AS
 SELECT 'Brigada Creada'::"text" AS "tipo",
    "brigadas"."nombre" AS "descripcion",
    "brigadas"."created_at"
   FROM "public"."brigadas"
UNION ALL
 SELECT 'Venta Registrada'::"text" AS "tipo",
    ('Total: $'::"text" || ("ventas"."total")::"text") AS "descripcion",
    "ventas"."created_at"
   FROM "public"."ventas"
UNION ALL
 SELECT 'Donación Ropa'::"text" AS "tipo",
    (("donaciones_ropa"."cantidad_prendas")::"text" || ' prendas'::"text") AS "descripcion",
    "donaciones_ropa"."created_at"
   FROM "public"."donaciones_ropa"
UNION ALL
 SELECT 'Nuevo Paciente'::"text" AS "tipo",
    ((("pacientes"."nombres")::"text" || ' '::"text") || ("pacientes"."apellidos")::"text") AS "descripcion",
    "pacientes"."created_at"
   FROM "public"."pacientes"
UNION ALL
 SELECT 'Nuevo Voluntario'::"text" AS "tipo",
    "perfiles"."nombre_completo" AS "descripcion",
    "perfiles"."created_at"
   FROM "public"."perfiles"
  WHERE ("perfiles"."rol" = 'voluntario'::"public"."user_role")
  ORDER BY 3 DESC NULLS LAST
 LIMIT 5;


ALTER VIEW "public"."v_actividad_reciente" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_alertas_sistema" AS
 SELECT '🔴'::"text" AS "icono",
    ('Vencido: '::"text" || ("m"."nombre")::"text") AS "mensaje",
    ((('Lote '::"text" || ("l"."numero_lote")::"text") || ' venció el '::"text") || "l"."fecha_vencimiento") AS "detalle",
    1 AS "prioridad"
   FROM ("public"."lotes_medicamentos" "l"
     JOIN "public"."medicamentos" "m" ON (("l"."medicamento_id" = "m"."id")))
  WHERE (("l"."fecha_vencimiento" < CURRENT_DATE) AND ("l"."cantidad_actual" > 0))
UNION ALL
 SELECT '🟡'::"text" AS "icono",
    ('Por Vencer: '::"text" || ("m"."nombre")::"text") AS "mensaje",
    ((('Lote '::"text" || ("l"."numero_lote")::"text") || ' vence el '::"text") || "l"."fecha_vencimiento") AS "detalle",
    2 AS "prioridad"
   FROM ("public"."lotes_medicamentos" "l"
     JOIN "public"."medicamentos" "m" ON (("l"."medicamento_id" = "m"."id")))
  WHERE ((("l"."fecha_vencimiento" >= CURRENT_DATE) AND ("l"."fecha_vencimiento" <= (CURRENT_DATE + '6 mons'::interval))) AND ("l"."cantidad_actual" > 0))
UNION ALL
 SELECT '🟡'::"text" AS "icono",
    ('Bajo Stock: '::"text" || ("productos"."nombre")::"text") AS "mensaje",
    (('Quedan '::"text" || "productos"."stock") || ' unidades'::"text") AS "detalle",
    3 AS "prioridad"
   FROM "public"."productos"
  WHERE ("productos"."stock" <= 5)
UNION ALL
 SELECT '🔵'::"text" AS "icono",
    'Inscripciones Abiertas'::"text" AS "mensaje",
    (((("brigadas"."nombre")::"text" || ' ('::"text") || ("brigadas"."lugar")::"text") || ')'::"text") AS "detalle",
    4 AS "prioridad"
   FROM "public"."brigadas"
  WHERE ("brigadas"."estado" = 'inscripciones_abiertas'::"public"."estado_brigada")
  ORDER BY 4
 LIMIT 10;


ALTER VIEW "public"."v_alertas_sistema" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_entregas_farmacia" AS
 SELECT "ef"."id",
    "concat"("p"."nombres", ' ', "p"."apellidos") AS "paciente",
    "m"."nombre" AS "medicamento",
    "ef"."cantidad",
    "l"."numero_lote",
    "l"."fecha_vencimiento",
    "per"."nombre_completo" AS "entregado_por",
    "ef"."fecha_entrega",
    "c"."brigada_id"
   FROM ((((("public"."entregas_farmacia" "ef"
     JOIN "public"."consultas" "c" ON (("c"."id" = "ef"."consulta_id")))
     JOIN "public"."pacientes" "p" ON (("p"."id" = "c"."paciente_id")))
     JOIN "public"."medicamentos" "m" ON (("m"."id" = "ef"."medicamento_id")))
     JOIN "public"."lotes_medicamentos" "l" ON (("l"."id" = "ef"."lote_id")))
     LEFT JOIN "public"."perfiles" "per" ON (("per"."id" = "ef"."entregado_por")));


ALTER VIEW "public"."v_entregas_farmacia" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_medicamentos_disponibles" AS
 SELECT "m"."id",
    "m"."nombre",
    "m"."presentacion",
    "m"."unidad_medida",
    COALESCE("sum"("l"."cantidad_actual"), (0)::bigint) AS "disponible"
   FROM ("public"."medicamentos" "m"
     LEFT JOIN "public"."lotes_medicamentos" "l" ON (("m"."id" = "l"."medicamento_id")))
  WHERE ("m"."activo" = true)
  GROUP BY "m"."id", "m"."nombre", "m"."presentacion", "m"."unidad_medida"
 HAVING (COALESCE("sum"("l"."cantidad_actual"), (0)::bigint) > 0);


ALTER VIEW "public"."v_medicamentos_disponibles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pacientes_atendidos" AS
 SELECT "p"."id",
    "p"."codigo",
    "concat"("p"."nombres", ' ', "p"."apellidos") AS "paciente",
    "b"."nombre" AS "brigada",
    "c"."tipo_consulta",
    "per"."nombre_completo" AS "medico",
    "c"."created_at",
    "p"."brigada_id"
   FROM ((("public"."pacientes" "p"
     JOIN "public"."consultas" "c" ON (("c"."paciente_id" = "p"."id")))
     LEFT JOIN "public"."perfiles" "per" ON (("per"."id" = "c"."medico_id")))
     JOIN "public"."brigadas" "b" ON (("b"."id" = "p"."brigada_id")));


ALTER VIEW "public"."v_pacientes_atendidos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_resumen_ropa" AS
 SELECT ( SELECT COALESCE("sum"("donaciones_ropa"."cantidad_prendas"), (0)::bigint) AS "coalesce"
           FROM "public"."donaciones_ropa") AS "prendas_donadas",
    ( SELECT COALESCE("sum"("entregas_ropa"."cantidad_prendas"), (0)::bigint) AS "coalesce"
           FROM "public"."entregas_ropa") AS "prendas_entregadas";


ALTER VIEW "public"."v_resumen_ropa" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_ventas" AS
 SELECT "v"."id",
    "v"."codigo",
    "v"."fecha",
    "p"."nombre_completo" AS "vendedor",
    "v"."total",
    "v"."brigada_id"
   FROM ("public"."ventas" "v"
     LEFT JOIN "public"."perfiles" "p" ON (("p"."id" = "v"."vendedor_id")));


ALTER VIEW "public"."v_ventas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voluntarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "apellido" "text" NOT NULL,
    "rol" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "mensaje" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voluntarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."actividades_infantiles"
    ADD CONSTRAINT "actividades_infantiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asignaciones_voluntarios"
    ADD CONSTRAINT "asignaciones_voluntarios_brigada_id_perfil_id_key" UNIQUE ("brigada_id", "perfil_id");



ALTER TABLE ONLY "public"."asignaciones_voluntarios"
    ADD CONSTRAINT "asignaciones_voluntarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."atenciones_pacientes"
    ADD CONSTRAINT "atenciones_pacientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brigada_imagenes"
    ADD CONSTRAINT "brigada_imagenes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brigadas"
    ADD CONSTRAINT "brigadas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."brigadas"
    ADD CONSTRAINT "brigadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_inventario"
    ADD CONSTRAINT "categorias_inventario_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."categorias_inventario"
    ADD CONSTRAINT "categorias_inventario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_productos"
    ADD CONSTRAINT "categorias_productos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."categorias_productos"
    ADD CONSTRAINT "categorias_productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultas"
    ADD CONSTRAINT "consultas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacto"
    ADD CONSTRAINT "contacto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."detalle_ventas"
    ADD CONSTRAINT "detalle_ventas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diagnosticos_consulta"
    ADD CONSTRAINT "diagnosticos_consulta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donaciones_ropa"
    ADD CONSTRAINT "donaciones_ropa_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."donaciones_ropa"
    ADD CONSTRAINT "donaciones_ropa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entregas_farmacia"
    ADD CONSTRAINT "entregas_farmacia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entregas_ropa"
    ADD CONSTRAINT "entregas_ropa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."especialidades"
    ADD CONSTRAINT "especialidades_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."especialidades"
    ADD CONSTRAINT "especialidades_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."especialidades"
    ADD CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gastos_brigada"
    ADD CONSTRAINT "gastos_brigada_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inscripciones_voluntarios"
    ADD CONSTRAINT "inscripciones_voluntarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lotes_medicamentos"
    ADD CONSTRAINT "lotes_medicamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medicamentos"
    ADD CONSTRAINT "medicamentos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."medicamentos_consulta"
    ADD CONSTRAINT "medicamentos_consulta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medicamentos"
    ADD CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimientos_inventario"
    ADD CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_brigada_id_perfil_id_key" UNIQUE ("brigada_id", "perfil_id");



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participantes_actividad"
    ADD CONSTRAINT "participantes_actividad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presupuestos_brigada"
    ADD CONSTRAINT "presupuestos_brigada_brigada_id_key" UNIQUE ("brigada_id");



ALTER TABLE ONLY "public"."presupuestos_brigada"
    ADD CONSTRAINT "presupuestos_brigada_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signos_vitales"
    ADD CONSTRAINT "signos_vitales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voluntarios"
    ADD CONSTRAINT "voluntarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_asignacion_area" ON "public"."asignaciones_voluntarios" USING "btree" ("area_asignada");



CREATE INDEX "idx_asignacion_brigada" ON "public"."asignaciones_voluntarios" USING "btree" ("brigada_id");



CREATE INDEX "idx_atenciones_atendido_por" ON "public"."atenciones_pacientes" USING "btree" ("atendido_por");



CREATE INDEX "idx_atenciones_brigada" ON "public"."atenciones_pacientes" USING "btree" ("brigada_id");



CREATE INDEX "idx_brigada_imagenes_brigada" ON "public"."brigada_imagenes" USING "btree" ("brigada_id");



CREATE INDEX "idx_brigadas_codigo" ON "public"."brigadas" USING "btree" ("codigo");



CREATE INDEX "idx_brigadas_departamento" ON "public"."brigadas" USING "btree" ("departamento");



CREATE INDEX "idx_brigadas_estado" ON "public"."brigadas" USING "btree" ("estado");



CREATE INDEX "idx_brigadas_fecha" ON "public"."brigadas" USING "btree" ("fecha_brigada");



CREATE INDEX "idx_consulta_medico" ON "public"."consultas" USING "btree" ("medico_id");



CREATE INDEX "idx_consulta_paciente" ON "public"."consultas" USING "btree" ("paciente_id");



CREATE INDEX "idx_detalle_producto" ON "public"."detalle_ventas" USING "btree" ("producto_id");



CREATE INDEX "idx_detalle_venta" ON "public"."detalle_ventas" USING "btree" ("venta_id");



CREATE INDEX "idx_entrega_consulta" ON "public"."entregas_farmacia" USING "btree" ("consulta_id");



CREATE INDEX "idx_entrega_lote" ON "public"."entregas_farmacia" USING "btree" ("lote_id");



CREATE INDEX "idx_entrega_medicamento" ON "public"."entregas_farmacia" USING "btree" ("medicamento_id");



CREATE INDEX "idx_entrega_ropa_brigada" ON "public"."entregas_ropa" USING "btree" ("brigada_id");



CREATE INDEX "idx_entrega_ropa_paciente" ON "public"."entregas_ropa" USING "btree" ("paciente_id");



CREATE INDEX "idx_especialidades_nombre" ON "public"."especialidades" USING "btree" ("nombre");



CREATE INDEX "idx_gasto_brigada" ON "public"."gastos_brigada" USING "btree" ("brigada_id");



CREATE INDEX "idx_gasto_categoria" ON "public"."gastos_brigada" USING "btree" ("categoria");



CREATE INDEX "idx_inscripcion_brigada" ON "public"."inscripciones_voluntarios" USING "btree" ("brigada_id");



CREATE INDEX "idx_inscripcion_correo" ON "public"."inscripciones_voluntarios" USING "btree" ("correo");



CREATE INDEX "idx_inscripcion_estado" ON "public"."inscripciones_voluntarios" USING "btree" ("estado");



CREATE INDEX "idx_lotes_medicamento" ON "public"."lotes_medicamentos" USING "btree" ("medicamento_id");



CREATE INDEX "idx_lotes_vencimiento" ON "public"."lotes_medicamentos" USING "btree" ("fecha_vencimiento");



CREATE INDEX "idx_medicamentos_categoria" ON "public"."medicamentos" USING "btree" ("categoria_id");



CREATE INDEX "idx_medicamentos_codigo" ON "public"."medicamentos" USING "btree" ("codigo");



CREATE INDEX "idx_medicamentos_consulta" ON "public"."medicamentos_consulta" USING "btree" ("consulta_id");



CREATE INDEX "idx_medicamentos_nombre" ON "public"."medicamentos" USING "btree" ("nombre");



CREATE INDEX "idx_movimientos_brigada" ON "public"."movimientos_inventario" USING "btree" ("brigada_id");



CREATE INDEX "idx_movimientos_fecha" ON "public"."movimientos_inventario" USING "btree" ("fecha_movimiento");



CREATE INDEX "idx_movimientos_medicamento" ON "public"."movimientos_inventario" USING "btree" ("medicamento_id");



CREATE INDEX "idx_paciente_brigada" ON "public"."pacientes" USING "btree" ("brigada_id");



CREATE INDEX "idx_participacion_brigada" ON "public"."participaciones_voluntarios" USING "btree" ("brigada_id");



CREATE INDEX "idx_participacion_perfil" ON "public"."participaciones_voluntarios" USING "btree" ("perfil_id");



CREATE INDEX "idx_perfiles_activo" ON "public"."perfiles" USING "btree" ("activo");



CREATE INDEX "idx_perfiles_rol" ON "public"."perfiles" USING "btree" ("rol");



CREATE INDEX "idx_presupuesto_brigada" ON "public"."presupuestos_brigada" USING "btree" ("brigada_id");



CREATE INDEX "idx_producto_categoria" ON "public"."productos" USING "btree" ("categoria_id");



CREATE INDEX "idx_ventas_fecha" ON "public"."ventas" USING "btree" ("fecha");



CREATE OR REPLACE TRIGGER "decrease_stock_on_venta" AFTER INSERT ON "public"."detalle_ventas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_decrease_stock"();



CREATE OR REPLACE TRIGGER "trg_actualizar_stock" AFTER INSERT ON "public"."movimientos_inventario" FOR EACH ROW EXECUTE FUNCTION "public"."actualizar_stock"();



CREATE OR REPLACE TRIGGER "trg_asignacion_updated" BEFORE UPDATE ON "public"."asignaciones_voluntarios" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_brigadas_updated" BEFORE UPDATE ON "public"."brigadas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_categoria_updated_at" BEFORE UPDATE ON "public"."categorias_inventario" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_entrega_farmacia_after_insert" AFTER INSERT ON "public"."entregas_farmacia" FOR EACH ROW EXECUTE FUNCTION "public"."trg_entrega_farmacia_after_insert"();



CREATE OR REPLACE TRIGGER "trg_especialidades_updated" BEFORE UPDATE ON "public"."especialidades" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_gastos_updated" BEFORE UPDATE ON "public"."gastos_brigada" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_generar_codigo_brigada" BEFORE INSERT ON "public"."brigadas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_generar_codigo_brigada"();



CREATE OR REPLACE TRIGGER "trg_inscripcion_updated" BEFORE UPDATE ON "public"."inscripciones_voluntarios" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lotes_updated_at" BEFORE UPDATE ON "public"."lotes_medicamentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_medicamento_updated_at" BEFORE UPDATE ON "public"."medicamentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_participacion_updated" BEFORE UPDATE ON "public"."participaciones_voluntarios" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_presupuesto_updated" BEFORE UPDATE ON "public"."presupuestos_brigada" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_recalcular_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."lotes_medicamentos" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_stock_medicamento"();



CREATE OR REPLACE TRIGGER "update_venta_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."detalle_ventas" FOR EACH ROW EXECUTE FUNCTION "public"."trg_update_venta_total"();



ALTER TABLE ONLY "public"."actividades_infantiles"
    ADD CONSTRAINT "actividades_infantiles_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."actividades_infantiles"
    ADD CONSTRAINT "actividades_infantiles_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."asignaciones_voluntarios"
    ADD CONSTRAINT "asignaciones_voluntarios_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."asignaciones_voluntarios"
    ADD CONSTRAINT "asignaciones_voluntarios_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asignaciones_voluntarios"
    ADD CONSTRAINT "asignaciones_voluntarios_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."atenciones_pacientes"
    ADD CONSTRAINT "atenciones_pacientes_atendido_por_fkey" FOREIGN KEY ("atendido_por") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brigada_imagenes"
    ADD CONSTRAINT "brigada_imagenes_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brigadas"
    ADD CONSTRAINT "brigadas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."consultas"
    ADD CONSTRAINT "consultas_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultas"
    ADD CONSTRAINT "consultas_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."consultas"
    ADD CONSTRAINT "consultas_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detalle_ventas"
    ADD CONSTRAINT "detalle_ventas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."detalle_ventas"
    ADD CONSTRAINT "detalle_ventas_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diagnosticos_consulta"
    ADD CONSTRAINT "diagnosticos_consulta_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entregas_farmacia"
    ADD CONSTRAINT "entregas_farmacia_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entregas_farmacia"
    ADD CONSTRAINT "entregas_farmacia_entregado_por_fkey" FOREIGN KEY ("entregado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."entregas_farmacia"
    ADD CONSTRAINT "entregas_farmacia_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes_medicamentos"("id");



ALTER TABLE ONLY "public"."entregas_farmacia"
    ADD CONSTRAINT "entregas_farmacia_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "public"."medicamentos"("id");



ALTER TABLE ONLY "public"."entregas_ropa"
    ADD CONSTRAINT "entregas_ropa_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entregas_ropa"
    ADD CONSTRAINT "entregas_ropa_entregado_por_fkey" FOREIGN KEY ("entregado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."entregas_ropa"
    ADD CONSTRAINT "entregas_ropa_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gastos_brigada"
    ADD CONSTRAINT "gastos_brigada_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gastos_brigada"
    ADD CONSTRAINT "gastos_brigada_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."inscripciones_voluntarios"
    ADD CONSTRAINT "inscripciones_voluntarios_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lotes_medicamentos"
    ADD CONSTRAINT "lotes_medicamentos_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "public"."medicamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medicamentos"
    ADD CONSTRAINT "medicamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_inventario"("id");



ALTER TABLE ONLY "public"."medicamentos_consulta"
    ADD CONSTRAINT "medicamentos_consulta_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medicamentos_consulta"
    ADD CONSTRAINT "medicamentos_consulta_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "public"."medicamentos"("id");



ALTER TABLE ONLY "public"."movimientos_inventario"
    ADD CONSTRAINT "movimientos_inventario_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."movimientos_inventario"
    ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "public"."asignaciones_voluntarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participaciones_voluntarios"
    ADD CONSTRAINT "participaciones_voluntarios_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."participantes_actividad"
    ADD CONSTRAINT "participantes_actividad_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades_infantiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_especialidad_id_fkey" FOREIGN KEY ("especialidad_id") REFERENCES "public"."especialidades"("id");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presupuestos_brigada"
    ADD CONSTRAINT "presupuestos_brigada_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id");



ALTER TABLE ONLY "public"."signos_vitales"
    ADD CONSTRAINT "signos_vitales_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_brigada_id_fkey" FOREIGN KEY ("brigada_id") REFERENCES "public"."brigadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ventas"
    ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "public"."perfiles"("id");



CREATE POLICY "Admin delete actividades_infantiles" ON "public"."actividades_infantiles" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete atenciones" ON "public"."atenciones_pacientes" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete categorias_inventario" ON "public"."categorias_inventario" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete categorias_productos" ON "public"."categorias_productos" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete consultas" ON "public"."consultas" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete contacto" ON "public"."contacto" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete detalle_ventas" ON "public"."detalle_ventas" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete diagnosticos_consulta" ON "public"."diagnosticos_consulta" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete donaciones_ropa" ON "public"."donaciones_ropa" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete entregas_farmacia" ON "public"."entregas_farmacia" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete entregas_ropa" ON "public"."entregas_ropa" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete especialidades" ON "public"."especialidades" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete inscripciones_voluntarios" ON "public"."inscripciones_voluntarios" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete lotes_medicamentos" ON "public"."lotes_medicamentos" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete medicamentos" ON "public"."medicamentos" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete medicamentos_consulta" ON "public"."medicamentos_consulta" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete movimientos_inventario" ON "public"."movimientos_inventario" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete pacientes" ON "public"."pacientes" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete participaciones_voluntarios" ON "public"."participaciones_voluntarios" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete participantes_actividad" ON "public"."participantes_actividad" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete presupuestos_brigada" ON "public"."presupuestos_brigada" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete productos" ON "public"."productos" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete signos_vitales" ON "public"."signos_vitales" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete ventas" ON "public"."ventas" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete voluntarios" ON "public"."voluntarios" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin full control perfiles" ON "public"."perfiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert presupuestos_brigada" ON "public"."presupuestos_brigada" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin read all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update presupuestos_brigada" ON "public"."presupuestos_brigada" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Clinical insert own atenciones" ON "public"."atenciones_pacientes" FOR INSERT TO "authenticated" WITH CHECK ((("atendido_por" = "auth"."uid"()) AND "public"."is_clinical"() AND ((("tipo_atencion" = 'medico'::"text") AND "public"."has_role"('medico'::"text")) OR (("tipo_atencion" = 'odontologo'::"text") AND "public"."has_role"('odontologo'::"text")))));



CREATE POLICY "Clinical read own atenciones" ON "public"."atenciones_pacientes" FOR SELECT TO "authenticated" USING ((("atendido_por" = "auth"."uid"()) AND "public"."is_clinical"()));



CREATE POLICY "Clinico read diagnosticos_consulta" ON "public"."diagnosticos_consulta" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico read signos_vitales" ON "public"."signos_vitales" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin insert consultas" ON "public"."consultas" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin insert diagnosticos_consulta" ON "public"."diagnosticos_consulta" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin insert medicamentos_consulta" ON "public"."medicamentos_consulta" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin insert pacientes" ON "public"."pacientes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin insert signos_vitales" ON "public"."signos_vitales" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin update consultas" ON "public"."consultas" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin update diagnosticos_consulta" ON "public"."diagnosticos_consulta" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin update medicamentos_consulta" ON "public"."medicamentos_consulta" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin update pacientes" ON "public"."pacientes" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Admin update signos_vitales" ON "public"."signos_vitales" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Coordinador/Admin insert actividades_infantiles" ON "public"."actividades_infantiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Coordinador/Admin insert participantes_actividad" ON "public"."participantes_actividad" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Coordinador/Admin update actividades_infantiles" ON "public"."actividades_infantiles" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Coordinador/Admin update participantes_actividad" ON "public"."participantes_actividad" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Clinico/Farmacia read consultas" ON "public"."consultas" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text", 'atencion_pacientes'::"text", 'encargado_farmacia'::"text"]));



CREATE POLICY "Coordinador/Admin delete asignaciones_voluntarios" ON "public"."asignaciones_voluntarios" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin delete brigada_imagenes" ON "public"."brigada_imagenes" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin delete brigadas" ON "public"."brigadas" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin delete gastos_brigada" ON "public"."gastos_brigada" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert asignaciones_voluntarios" ON "public"."asignaciones_voluntarios" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert brigada_imagenes" ON "public"."brigada_imagenes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert brigadas" ON "public"."brigadas" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert categorias_productos" ON "public"."categorias_productos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert detalle_ventas" ON "public"."detalle_ventas" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert especialidades" ON "public"."especialidades" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert gastos_brigada" ON "public"."gastos_brigada" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert participaciones_voluntarios" ON "public"."participaciones_voluntarios" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert presupuestos_brigada" ON "public"."presupuestos_brigada" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert productos" ON "public"."productos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin insert ventas" ON "public"."ventas" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update asignaciones_voluntarios" ON "public"."asignaciones_voluntarios" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update brigada_imagenes" ON "public"."brigada_imagenes" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update brigadas" ON "public"."brigadas" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update categorias_productos" ON "public"."categorias_productos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update contacto" ON "public"."contacto" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update detalle_ventas" ON "public"."detalle_ventas" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update donaciones_ropa" ON "public"."donaciones_ropa" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update entregas_ropa" ON "public"."entregas_ropa" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update especialidades" ON "public"."especialidades" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update gastos_brigada" ON "public"."gastos_brigada" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update inscripciones_voluntarios" ON "public"."inscripciones_voluntarios" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update participaciones_voluntarios" ON "public"."participaciones_voluntarios" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update presupuestos_brigada" ON "public"."presupuestos_brigada" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update productos" ON "public"."productos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update ventas" ON "public"."ventas" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Coordinador/Admin update voluntarios" ON "public"."voluntarios" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'coordinador'::"text"]));



CREATE POLICY "Encargado/Admin insert categorias_inventario" ON "public"."categorias_inventario" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text"]));



CREATE POLICY "Encargado/Admin insert lotes_medicamentos" ON "public"."lotes_medicamentos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text"]));



CREATE POLICY "Encargado/Admin insert medicamentos" ON "public"."medicamentos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text"]));



CREATE POLICY "Encargado/Admin update categorias_inventario" ON "public"."categorias_inventario" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text"]));



CREATE POLICY "Encargado/Admin update medicamentos" ON "public"."medicamentos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text", 'encargado_farmacia'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text", 'encargado_farmacia'::"text"]));



CREATE POLICY "Encargado/Farmacia/Admin update lotes_medicamentos" ON "public"."lotes_medicamentos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text", 'encargado_farmacia'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_bodega'::"text", 'encargado_farmacia'::"text"]));



CREATE POLICY "Farmacia/Clinica/Admin insert entregas_farmacia" ON "public"."entregas_farmacia" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"text", 'encargado_farmacia'::"text", 'atencion_pacientes'::"text"]));



CREATE POLICY "Insert contacto" ON "public"."contacto" FOR INSERT WITH CHECK (true);



CREATE POLICY "Insert voluntarios" ON "public"."voluntarios" FOR INSERT WITH CHECK (true);



CREATE POLICY "Panel insert donaciones_ropa" ON "public"."donaciones_ropa" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_panel_user"());



CREATE POLICY "Panel insert entregas_ropa" ON "public"."entregas_ropa" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_panel_user"());



CREATE POLICY "Panel insert movimientos_inventario" ON "public"."movimientos_inventario" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_panel_user"());



CREATE POLICY "Panel read actividades_infantiles" ON "public"."actividades_infantiles" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read all perfiles" ON "public"."perfiles" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read asignaciones_voluntarios" ON "public"."asignaciones_voluntarios" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read brigada_imagenes" ON "public"."brigada_imagenes" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read brigadas" ON "public"."brigadas" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read categorias_inventario" ON "public"."categorias_inventario" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read categorias_productos" ON "public"."categorias_productos" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read contacto" ON "public"."contacto" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read detalle_ventas" ON "public"."detalle_ventas" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read donaciones_ropa" ON "public"."donaciones_ropa" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read entregas_farmacia" ON "public"."entregas_farmacia" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read entregas_ropa" ON "public"."entregas_ropa" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read gastos_brigada" ON "public"."gastos_brigada" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read inscripciones_voluntarios" ON "public"."inscripciones_voluntarios" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read lotes_medicamentos" ON "public"."lotes_medicamentos" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read medicamentos" ON "public"."medicamentos" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read medicamentos_consulta" ON "public"."medicamentos_consulta" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read movimientos_inventario" ON "public"."movimientos_inventario" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read pacientes" ON "public"."pacientes" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read participaciones_voluntarios" ON "public"."participaciones_voluntarios" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read participantes_actividad" ON "public"."participantes_actividad" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read presupuestos_brigada" ON "public"."presupuestos_brigada" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read productos" ON "public"."productos" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read ventas" ON "public"."ventas" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Panel read voluntarios" ON "public"."voluntarios" FOR SELECT TO "authenticated" USING ("public"."is_panel_user"());



CREATE POLICY "Permitir actualizacion de propio perfil" ON "public"."perfiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Permitir actualizar en brigada_imagenes" ON "public"."brigada_imagenes" FOR UPDATE USING (true);



CREATE POLICY "Permitir eliminar en brigada_imagenes" ON "public"."brigada_imagenes" FOR DELETE USING (true);



CREATE POLICY "Permitir insertar en brigada_imagenes" ON "public"."brigada_imagenes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Permitir lectura de propio perfil" ON "public"."perfiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Permitir lectura en brigada_imagenes" ON "public"."brigada_imagenes" FOR SELECT USING (true);



CREATE POLICY "Public insert contacto" ON "public"."contacto" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public insert inscripciones_voluntarios" ON "public"."inscripciones_voluntarios" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public insert voluntarios" ON "public"."voluntarios" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public/Panel read especialidades" ON "public"."especialidades" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Staff admin read all atenciones" ON "public"."atenciones_pacientes" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['admin'::"text", 'staff'::"text"]));



CREATE POLICY "Users read own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."actividades_infantiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "actividades_infantiles_auth_all" ON "public"."actividades_infantiles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "admin_all_brigadas" ON "public"."brigadas" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = ANY (ARRAY['admin'::"public"."user_role", 'coordinador'::"public"."user_role"]))))));



ALTER TABLE "public"."asignaciones_voluntarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."atenciones_pacientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brigada_imagenes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brigadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_inventario" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_productos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categorias_productos_auth_all" ON "public"."categorias_productos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "categorias_select" ON "public"."categorias_inventario" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."consultas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultas_auth_all" ON "public"."consultas" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."contacto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."detalle_ventas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "detalle_ventas_auth_all" ON "public"."detalle_ventas" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."diagnosticos_consulta" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "diagnosticos_consulta_auth_all" ON "public"."diagnosticos_consulta" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."donaciones_ropa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "donaciones_ropa_auth_all" ON "public"."donaciones_ropa" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."entregas_farmacia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entregas_farmacia_auth_all" ON "public"."entregas_farmacia" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."entregas_ropa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entregas_ropa_auth_all" ON "public"."entregas_ropa" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."especialidades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "especialidades_select" ON "public"."especialidades" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "especialidades_write" ON "public"."especialidades" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = ANY (ARRAY['admin'::"public"."user_role", 'coordinador'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = ANY (ARRAY['admin'::"public"."user_role", 'coordinador'::"public"."user_role"]))))));



ALTER TABLE "public"."gastos_brigada" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inscripciones_voluntarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lotes_medicamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lotes_medicamentos_select" ON "public"."lotes_medicamentos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."medicamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medicamentos_consulta" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medicamentos_consulta_auth_all" ON "public"."medicamentos_consulta" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "medicamentos_select" ON "public"."medicamentos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "movimientos_insert" ON "public"."movimientos_inventario" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_panel_user"());



ALTER TABLE "public"."movimientos_inventario" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movimientos_select" ON "public"."movimientos_inventario" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pacientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pacientes_auth_all" ON "public"."pacientes" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."participaciones_voluntarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."participantes_actividad" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participantes_actividad_auth_all" ON "public"."participantes_actividad" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."perfiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfiles_delete_policy" ON "public"."perfiles" FOR DELETE TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_user_role"() = 'admin'::"text")));



CREATE POLICY "perfiles_insert_policy" ON "public"."perfiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "perfiles_select_policy" ON "public"."perfiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "perfiles_update_policy" ON "public"."perfiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_user_role"() = 'admin'::"text"))) WITH CHECK ((("id" = "auth"."uid"()) OR ("public"."get_user_role"() = 'admin'::"text")));



ALTER TABLE "public"."presupuestos_brigada" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "productos_auth_all" ON "public"."productos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "public_read_brigadas" ON "public"."brigadas" FOR SELECT USING (true);



ALTER TABLE "public"."signos_vitales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signos_vitales_auth_all" ON "public"."signos_vitales" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ventas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ventas_auth_all" ON "public"."ventas" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."voluntarios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."actualizar_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_codigo_brigada"("fecha" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generar_codigo_brigada"("fecha" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_codigo_brigada"("fecha" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_clinical"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_clinical"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_clinical"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_panel_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_panel_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_panel_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_medicamento"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_medicamento"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_medicamento"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sp_confirmar_participacion"("p_brigada" "uuid", "p_perfil" "uuid", "p_hora_llegada" time without time zone, "p_hora_salida" time without time zone, "p_observaciones" "text", "p_registrado_por" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sp_confirmar_participacion"("p_brigada" "uuid", "p_perfil" "uuid", "p_hora_llegada" time without time zone, "p_hora_salida" time without time zone, "p_observaciones" "text", "p_registrado_por" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sp_confirmar_participacion"("p_brigada" "uuid", "p_perfil" "uuid", "p_hora_llegada" time without time zone, "p_hora_salida" time without time zone, "p_observaciones" "text", "p_registrado_por" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_decrease_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_decrease_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_decrease_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_entrega_farmacia_after_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_entrega_farmacia_after_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_entrega_farmacia_after_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_generar_codigo_brigada"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_generar_codigo_brigada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_generar_codigo_brigada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_update_venta_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_update_venta_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_update_venta_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."actividades_infantiles" TO "anon";
GRANT ALL ON TABLE "public"."actividades_infantiles" TO "authenticated";
GRANT ALL ON TABLE "public"."actividades_infantiles" TO "service_role";



GRANT ALL ON TABLE "public"."lotes_medicamentos" TO "anon";
GRANT ALL ON TABLE "public"."lotes_medicamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."lotes_medicamentos" TO "service_role";



GRANT ALL ON TABLE "public"."medicamentos" TO "anon";
GRANT ALL ON TABLE "public"."medicamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."medicamentos" TO "service_role";



GRANT ALL ON TABLE "public"."alertas_vencimiento" TO "anon";
GRANT ALL ON TABLE "public"."alertas_vencimiento" TO "authenticated";
GRANT ALL ON TABLE "public"."alertas_vencimiento" TO "service_role";



GRANT ALL ON TABLE "public"."asignaciones_voluntarios" TO "anon";
GRANT ALL ON TABLE "public"."asignaciones_voluntarios" TO "authenticated";
GRANT ALL ON TABLE "public"."asignaciones_voluntarios" TO "service_role";



GRANT ALL ON TABLE "public"."atenciones_pacientes" TO "anon";
GRANT ALL ON TABLE "public"."atenciones_pacientes" TO "authenticated";
GRANT ALL ON TABLE "public"."atenciones_pacientes" TO "service_role";



GRANT ALL ON TABLE "public"."brigada_imagenes" TO "anon";
GRANT ALL ON TABLE "public"."brigada_imagenes" TO "authenticated";
GRANT ALL ON TABLE "public"."brigada_imagenes" TO "service_role";



GRANT ALL ON TABLE "public"."brigadas" TO "anon";
GRANT ALL ON TABLE "public"."brigadas" TO "authenticated";
GRANT ALL ON TABLE "public"."brigadas" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_inventario" TO "anon";
GRANT ALL ON TABLE "public"."categorias_inventario" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_inventario" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_productos" TO "anon";
GRANT ALL ON TABLE "public"."categorias_productos" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_productos" TO "service_role";



GRANT ALL ON TABLE "public"."consultas" TO "anon";
GRANT ALL ON TABLE "public"."consultas" TO "authenticated";
GRANT ALL ON TABLE "public"."consultas" TO "service_role";



GRANT ALL ON TABLE "public"."contacto" TO "anon";
GRANT ALL ON TABLE "public"."contacto" TO "authenticated";
GRANT ALL ON TABLE "public"."contacto" TO "service_role";



GRANT ALL ON TABLE "public"."participantes_actividad" TO "anon";
GRANT ALL ON TABLE "public"."participantes_actividad" TO "authenticated";
GRANT ALL ON TABLE "public"."participantes_actividad" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_actividades" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_actividades" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_actividades" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_brigadas" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_brigadas" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_brigadas" TO "service_role";



GRANT ALL ON TABLE "public"."entregas_farmacia" TO "anon";
GRANT ALL ON TABLE "public"."entregas_farmacia" TO "authenticated";
GRANT ALL ON TABLE "public"."entregas_farmacia" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_farmacia" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_farmacia" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_farmacia" TO "service_role";



GRANT ALL ON TABLE "public"."stock_actual" TO "anon";
GRANT ALL ON TABLE "public"."stock_actual" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_actual" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_inventario" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_inventario" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_inventario" TO "service_role";



GRANT ALL ON TABLE "public"."pacientes" TO "anon";
GRANT ALL ON TABLE "public"."pacientes" TO "authenticated";
GRANT ALL ON TABLE "public"."pacientes" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_pacientes" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_pacientes" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_pacientes" TO "service_role";



GRANT ALL ON TABLE "public"."entregas_ropa" TO "anon";
GRANT ALL ON TABLE "public"."entregas_ropa" TO "authenticated";
GRANT ALL ON TABLE "public"."entregas_ropa" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_ropa" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_ropa" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_ropa" TO "service_role";



GRANT ALL ON TABLE "public"."ventas" TO "anon";
GRANT ALL ON TABLE "public"."ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."ventas" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_ventas" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_ventas" TO "service_role";



GRANT ALL ON TABLE "public"."especialidades" TO "anon";
GRANT ALL ON TABLE "public"."especialidades" TO "authenticated";
GRANT ALL ON TABLE "public"."especialidades" TO "service_role";



GRANT ALL ON TABLE "public"."perfiles" TO "anon";
GRANT ALL ON TABLE "public"."perfiles" TO "authenticated";
GRANT ALL ON TABLE "public"."perfiles" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_voluntarios" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_voluntarios" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_voluntarios" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_ventas" TO "anon";
GRANT ALL ON TABLE "public"."detalle_ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_ventas" TO "service_role";



GRANT ALL ON TABLE "public"."diagnosticos_consulta" TO "anon";
GRANT ALL ON TABLE "public"."diagnosticos_consulta" TO "authenticated";
GRANT ALL ON TABLE "public"."diagnosticos_consulta" TO "service_role";



GRANT ALL ON TABLE "public"."donaciones_ropa" TO "anon";
GRANT ALL ON TABLE "public"."donaciones_ropa" TO "authenticated";
GRANT ALL ON TABLE "public"."donaciones_ropa" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos_inventario" TO "anon";
GRANT ALL ON TABLE "public"."movimientos_inventario" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos_inventario" TO "service_role";



GRANT ALL ON TABLE "public"."estadisticas_inventario" TO "anon";
GRANT ALL ON TABLE "public"."estadisticas_inventario" TO "authenticated";
GRANT ALL ON TABLE "public"."estadisticas_inventario" TO "service_role";



GRANT ALL ON TABLE "public"."gastos_brigada" TO "anon";
GRANT ALL ON TABLE "public"."gastos_brigada" TO "authenticated";
GRANT ALL ON TABLE "public"."gastos_brigada" TO "service_role";



GRANT ALL ON TABLE "public"."inscripciones_voluntarios" TO "anon";
GRANT ALL ON TABLE "public"."inscripciones_voluntarios" TO "authenticated";
GRANT ALL ON TABLE "public"."inscripciones_voluntarios" TO "service_role";



GRANT ALL ON TABLE "public"."medicamentos_consulta" TO "anon";
GRANT ALL ON TABLE "public"."medicamentos_consulta" TO "authenticated";
GRANT ALL ON TABLE "public"."medicamentos_consulta" TO "service_role";



GRANT ALL ON TABLE "public"."participaciones_voluntarios" TO "anon";
GRANT ALL ON TABLE "public"."participaciones_voluntarios" TO "authenticated";
GRANT ALL ON TABLE "public"."participaciones_voluntarios" TO "service_role";



GRANT ALL ON TABLE "public"."presupuestos_brigada" TO "anon";
GRANT ALL ON TABLE "public"."presupuestos_brigada" TO "authenticated";
GRANT ALL ON TABLE "public"."presupuestos_brigada" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON TABLE "public"."signos_vitales" TO "anon";
GRANT ALL ON TABLE "public"."signos_vitales" TO "authenticated";
GRANT ALL ON TABLE "public"."signos_vitales" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."v_actividad_reciente" TO "anon";
GRANT ALL ON TABLE "public"."v_actividad_reciente" TO "authenticated";
GRANT ALL ON TABLE "public"."v_actividad_reciente" TO "service_role";



GRANT ALL ON TABLE "public"."v_alertas_sistema" TO "anon";
GRANT ALL ON TABLE "public"."v_alertas_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."v_alertas_sistema" TO "service_role";



GRANT ALL ON TABLE "public"."v_entregas_farmacia" TO "anon";
GRANT ALL ON TABLE "public"."v_entregas_farmacia" TO "authenticated";
GRANT ALL ON TABLE "public"."v_entregas_farmacia" TO "service_role";



GRANT ALL ON TABLE "public"."v_medicamentos_disponibles" TO "anon";
GRANT ALL ON TABLE "public"."v_medicamentos_disponibles" TO "authenticated";
GRANT ALL ON TABLE "public"."v_medicamentos_disponibles" TO "service_role";



GRANT ALL ON TABLE "public"."v_pacientes_atendidos" TO "anon";
GRANT ALL ON TABLE "public"."v_pacientes_atendidos" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pacientes_atendidos" TO "service_role";



GRANT ALL ON TABLE "public"."v_resumen_ropa" TO "anon";
GRANT ALL ON TABLE "public"."v_resumen_ropa" TO "authenticated";
GRANT ALL ON TABLE "public"."v_resumen_ropa" TO "service_role";



GRANT ALL ON TABLE "public"."v_ventas" TO "anon";
GRANT ALL ON TABLE "public"."v_ventas" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ventas" TO "service_role";



GRANT ALL ON TABLE "public"."voluntarios" TO "anon";
GRANT ALL ON TABLE "public"."voluntarios" TO "authenticated";
GRANT ALL ON TABLE "public"."voluntarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "Public insert contacto" on "public"."contacto";

drop policy "Public/Panel read especialidades" on "public"."especialidades";

drop policy "Public insert inscripciones_voluntarios" on "public"."inscripciones_voluntarios";

drop policy "Public insert voluntarios" on "public"."voluntarios";

alter table "public"."consultas" drop constraint "consultas_tipo_consulta_check";

alter table "public"."medicamentos" drop constraint "chk_medicamentos_tipo_recurso";

alter table "public"."pacientes" drop constraint "pacientes_sexo_check";

alter table "public"."consultas" add constraint "consultas_tipo_consulta_check" CHECK (((tipo_consulta)::text = ANY ((ARRAY['Medica'::character varying, 'Odontologica'::character varying])::text[]))) not valid;

alter table "public"."consultas" validate constraint "consultas_tipo_consulta_check";

alter table "public"."medicamentos" add constraint "chk_medicamentos_tipo_recurso" CHECK (((tipo_recurso)::text = ANY ((ARRAY['medicamento'::character varying, 'insumo_medico'::character varying, 'material_brigada'::character varying])::text[]))) not valid;

alter table "public"."medicamentos" validate constraint "chk_medicamentos_tipo_recurso";

alter table "public"."pacientes" add constraint "pacientes_sexo_check" CHECK (((sexo)::text = ANY ((ARRAY['Masculino'::character varying, 'Femenino'::character varying])::text[]))) not valid;

alter table "public"."pacientes" validate constraint "pacientes_sexo_check";

create or replace view "public"."dashboard_voluntarios" as  SELECT count(*) AS total_inscritos,
    count(*) FILTER (WHERE (EXTRACT(year FROM created_at) = EXTRACT(year FROM CURRENT_DATE))) AS nuevos_este_ano,
    count(*) FILTER (WHERE (especialidad_id IN ( SELECT especialidades.id
           FROM public.especialidades
          WHERE ((especialidades.nombre)::text = ANY ((ARRAY['Médico General'::character varying, 'Odontólogo'::character varying, 'Enfermería'::character varying, 'Farmacia'::character varying, 'Psicología'::character varying, 'Nutrición'::character varying])::text[]))))) AS profesionales_salud,
    count(*) FILTER (WHERE (especialidad_id IN ( SELECT especialidades.id
           FROM public.especialidades
          WHERE ((especialidades.nombre)::text = ANY ((ARRAY['Logística'::character varying, 'Registro'::character varying])::text[]))))) AS logistica
   FROM public.perfiles p
  WHERE (rol = 'voluntario'::public.user_role);


create or replace view "public"."v_alertas_sistema" as  SELECT '🔴'::text AS icono,
    ('Vencido: '::text || (m.nombre)::text) AS mensaje,
    ((('Lote '::text || (l.numero_lote)::text) || ' venció el '::text) || l.fecha_vencimiento) AS detalle,
    1 AS prioridad
   FROM (public.lotes_medicamentos l
     JOIN public.medicamentos m ON ((l.medicamento_id = m.id)))
  WHERE ((l.fecha_vencimiento < CURRENT_DATE) AND (l.cantidad_actual > 0))
UNION ALL
 SELECT '🟡'::text AS icono,
    ('Por Vencer: '::text || (m.nombre)::text) AS mensaje,
    ((('Lote '::text || (l.numero_lote)::text) || ' vence el '::text) || l.fecha_vencimiento) AS detalle,
    2 AS prioridad
   FROM (public.lotes_medicamentos l
     JOIN public.medicamentos m ON ((l.medicamento_id = m.id)))
  WHERE (((l.fecha_vencimiento >= CURRENT_DATE) AND (l.fecha_vencimiento <= (CURRENT_DATE + '6 mons'::interval))) AND (l.cantidad_actual > 0))
UNION ALL
 SELECT '🟡'::text AS icono,
    ('Bajo Stock: '::text || (productos.nombre)::text) AS mensaje,
    (('Quedan '::text || productos.stock) || ' unidades'::text) AS detalle,
    3 AS prioridad
   FROM public.productos
  WHERE (productos.stock <= 5)
UNION ALL
 SELECT '🔵'::text AS icono,
    'Inscripciones Abiertas'::text AS mensaje,
    ((((brigadas.nombre)::text || ' ('::text) || (brigadas.lugar)::text) || ')'::text) AS detalle,
    4 AS prioridad
   FROM public.brigadas
  WHERE (brigadas.estado = 'inscripciones_abiertas'::public.estado_brigada)
  ORDER BY 4
 LIMIT 10;



  create policy "Public insert contacto"
  on "public"."contacto"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Public/Panel read especialidades"
  on "public"."especialidades"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Public insert inscripciones_voluntarios"
  on "public"."inscripciones_voluntarios"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Public insert voluntarios"
  on "public"."voluntarios"
  as permissive
  for insert
  to anon, authenticated
with check (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Permitir eliminar de brigadas"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'brigadas'::text));



  create policy "Permitir lectura de brigadas"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'brigadas'::text));



  create policy "Permitir subida a brigadas"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'brigadas'::text));



