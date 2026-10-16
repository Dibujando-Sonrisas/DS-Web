-- =========================================================================
-- HUELLA DEL MODO OFFLINE: conflictos
--   Al subir, cada registro tocado offline se compara con su versión en línea.
--   Si en línea cambiaron otros campos, se combinan; si chocan en el mismo
--   campo, o lo borraron de un lado y lo cambiaron del otro, gana lo de la
--   brigada y aquí queda lo que había en línea para revisarlo:
--     {"motivo": "...", "campos": {"telefono": {"en_linea": ..., "brigada": ...}}}
--     {"motivo": "...", "en_linea": {la fila que estaba en línea}}
--   null: sin conflicto.
--   sesion_id identifica cada subida (una sesión offline puede subir varias veces).
-- =========================================================================

ALTER TABLE public.registros_offline ADD COLUMN conflicto jsonb;

CREATE INDEX idx_registros_offline_conflictos ON public.registros_offline (subido_en DESC)
  WHERE conflicto IS NOT NULL;
