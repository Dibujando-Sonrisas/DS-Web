import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { supabase } from "../supabase";

export type EstadoBrigada = Enums<"estado_brigada">;
export type Brigada = Tables<"brigadas">;
export type BrigadaInsert = TablesInsert<"brigadas">;
export type BrigadaUpdate = TablesUpdate<"brigadas">;

export async function getBrigadas(
  client: SupabaseClient<Database> = supabase
): Promise<{ data: Brigada[] | null; error: string | null }> {
  const { data, error } = await client
    .from("brigadas")
    .select("*")
    .order("fecha_brigada", { ascending: true })
    .order("codigo", { ascending: true });

  return { data: data ?? null, error: error?.message ?? null };
}

export async function insertBrigada(
  client: SupabaseClient<Database>,
  data: BrigadaInsert
): Promise<{ data: Brigada | null; error: string | null }> {
  const { data: inserted, error } = await client
    .from("brigadas")
    .insert([data])
    .select()
    .single();

  return { data: inserted, error: error?.message ?? null };
}

export async function updateBrigada(
  client: SupabaseClient<Database>,
  id: string,
  data: BrigadaUpdate
): Promise<{ data: Brigada | null; error: string | null }> {
  const { data: updated, error } = await client
    .from("brigadas")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  return { data: updated, error: error?.message ?? null };
}

export async function deleteBrigada(
  client: SupabaseClient<Database>,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await client.from("brigadas").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function slugifyBrigadaId(codigo: string): string {
  const clean = codigo
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-");
  return `Brigada-${clean || Date.now()}`;
}
