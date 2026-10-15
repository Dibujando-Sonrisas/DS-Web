import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { MODO_OFFLINE } from "./offline";

const url = urlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

function urlSupabase(configurada: string) {
  if (!MODO_OFFLINE || typeof window === "undefined" || !configurada)
    return configurada;
  const local = new URL(configurada);
  local.hostname = window.location.hostname;
  return local.origin;
}
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

declare global {
  var __supabase: SupabaseClient<Database> | undefined;
}

// Un solo cliente por pestaña (y por proceso cuando el módulo se evalúa en el SSR de un componente
// cliente). Sin sesión en el servidor; los canales Realtime los cierra useCambiosEnVivo al desmontar.
function createSingleton(): SupabaseClient<Database> {
  if (!globalThis.__supabase) {
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set."
      );
    }
    globalThis.__supabase = createBrowserClient<Database>(url, key);
  }
  return globalThis.__supabase;
}

export const supabase = createSingleton();
