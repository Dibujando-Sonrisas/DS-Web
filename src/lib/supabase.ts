import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { MODO_OFFLINE } from "./offline";

const url = urlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

/**
 * En el modo offline Supabase corre en el mismo equipo que sirve la app: el navegador
 * lo busca en la dirección con la que abrió la página, que cambia según la red de la brigada.
 */
function urlSupabase(configurada: string) {
  if (!MODO_OFFLINE || typeof window === "undefined" || !configurada) return configurada;
  const local = new URL(configurada);
  local.hostname = window.location.hostname;
  return local.origin;
}
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

declare global {
  var __supabase: SupabaseClient<Database> | undefined;
}

function createSingleton(): SupabaseClient<Database> {
  if (!globalThis.__supabase) {
    if (!url || !key) {
      throw new Error(
        "Faltan variables de Supabase. En la raíz del proyecto, crea o edita `.env.local` con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (sin comillas ni punto y coma al final). Luego reinicia `npm run dev`."
      );
    }
    globalThis.__supabase = createBrowserClient<Database>(url, key);
  }
  return globalThis.__supabase;
}

export const supabase = createSingleton();
