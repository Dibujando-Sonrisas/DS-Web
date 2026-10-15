"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import type { Database, Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type Tabla = keyof Database["public"]["Tables"];
type Evento = "INSERT" | "UPDATE" | "DELETE" | "*";

let canales = 0;

export function useCambiosEnVivo<T extends Tabla>(
  tabla: T,
  alCambiar: (cambio: RealtimePostgresChangesPayload<Tables<T>>) => void,
  { evento = "*", filtro }: { evento?: Evento; filtro?: string } = {}
) {
  const callback = useRef(alCambiar);
  useEffect(() => {
    callback.current = alCambiar;
  });

  useEffect(() => {
    let activo = true;
    const canal = supabase
      .channel(`${tabla}:${++canales}`)
      .on<Tables<T>>(
        "postgres_changes",
        { event: evento, schema: "public", table: tabla, filter: filtro },
        (cambio) => callback.current(cambio)
      );
    supabase.realtime.setAuth().then(() => activo && canal.subscribe());
    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [tabla, evento, filtro]);
}
