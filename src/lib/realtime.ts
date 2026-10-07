"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database, Tables } from "@/lib/database.types";

type Tabla = keyof Database["public"]["Tables"];
type Evento = "INSERT" | "UPDATE" | "DELETE" | "*";

/**
 * Escucha en vivo los cambios de una tabla (Supabase Realtime, postgres_changes).
 * Solo llegan las filas que el usuario puede leer por RLS, y la tabla tiene que
 * estar en la publicación supabase_realtime (ALTER PUBLICATION ... ADD TABLE).
 * `filtro` usa la sintaxis de Realtime, p. ej. "brigada_id=eq.123".
 */
export function useCambiosEnVivo<T extends Tabla>(
  tabla: T,
  alCambiar: (cambio: RealtimePostgresChangesPayload<Tables<T>>) => void,
  { evento = "*", filtro }: { evento?: Evento; filtro?: string } = {}
) {
  // el último callback sin volver a suscribirse en cada render
  const callback = useRef(alCambiar);
  useEffect(() => {
    callback.current = alCambiar;
  });

  useEffect(() => {
    let activo = true;
    const canal = supabase
      .channel(`${tabla}:${crypto.randomUUID()}`)
      .on<Tables<T>>(
        "postgres_changes",
        { event: evento, schema: "public", table: tabla, filter: filtro },
        (cambio) => callback.current(cambio)
      );
    // unirse con el token de la sesión: como anónimo la RLS no deja pasar nada
    supabase.realtime.setAuth().then(() => activo && canal.subscribe());
    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [tabla, evento, filtro]);
}
