import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Cliente con la clave de servicio: ignora RLS, así que solo después de verificar el permiso.
 * Uno por proceso: no guarda sesión ni refresca tokens, no hay nada por usuario que separar.
 */
export function createSupabaseAdminClient() {
  if (adminClient) return adminClient;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return adminClient;
}
