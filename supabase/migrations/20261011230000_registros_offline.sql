-- =========================================================================
-- HUELLA DEL MODO OFFLINE
--   public.registros_offline: cada registro que se creó, cambió o borró en el
--   servidor de una brigada sin internet, con la sesión offline en la que
--   pasó. La llena scripts/offline.mjs al subir los cambios (npm run
--   offline:subir); la app no la escribe.
--
--   operacion = INSERT → el registro se creó offline
--               UPDATE → existía y se cambió offline
--               DELETE → existía y se borró offline
-- =========================================================================

CREATE TABLE public.registros_offline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- la sesión offline: desde la descarga (preparada_en) hasta esta subida
  sesion_id uuid NOT NULL,
  preparada_en timestamptz NOT NULL,
  subido_en timestamptz NOT NULL DEFAULT now(),
  tabla text NOT NULL,
  -- la llave primaria del registro, p. ej. {"id": "..."}
  registro jsonb NOT NULL,
  operacion text NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  -- el último cambio de ese registro en el servidor offline
  cambiado_en timestamptz NOT NULL
);

CREATE INDEX idx_registros_offline_registro ON public.registros_offline (tabla, registro);
CREATE INDEX idx_registros_offline_sesion ON public.registros_offline (sesion_id);

-- solo la escribe el script con la conexión directa a la base; sin acceso desde la API
ALTER TABLE public.registros_offline ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registros_offline FROM anon, authenticated;
