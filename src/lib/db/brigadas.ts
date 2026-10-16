import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export type EstadoBrigada =
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "finalizada"
  | "cancelada";

export interface Brigada {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  lugar: string;
  municipio: string;
  departamento: string;
  fecha_brigada: string;
  fecha_inicio_inscripcion: string;
  fecha_fin_inscripcion: string;
  estado: EstadoBrigada;
  capacidad_voluntarios?: number | null;
  imagen_banner?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BrigadaInsert = Omit<
  Brigada,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
};
export type BrigadaUpdate = Partial<
  Omit<Brigada, "id" | "created_at" | "updated_at">
>;

export async function getBrigadas(
  client: SupabaseClient = supabase
): Promise<{ data: Brigada[] | null; error: string | null }> {
  const { data, error } = await client
    .from("brigadas")
    .select("*")
    .order("fecha_brigada", { ascending: true })
    .order("codigo", { ascending: true });

  return { data: data ?? null, error: error?.message ?? null };
}

export async function insertBrigada(
  client: SupabaseClient,
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
  client: SupabaseClient,
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
  client: SupabaseClient,
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
