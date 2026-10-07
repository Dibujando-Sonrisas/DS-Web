import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

/**
 * Cliente con la clave secreta: salta la RLS y usa la API de administración de
 * Auth (crear cuentas, generar enlaces). Solo en el servidor y después de
 * comprobar los permisos de quien hace la acción.
 */
export function createSupabaseAdminClient() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
