import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessRoute, resolvePermissions, type Permission } from "./permissions";

/** Tonos de badge disponibles para un rol (columna roles.color). */
export const ROL_TONOS = ["brand", "info", "success", "warning", "danger", "neutral"] as const;
export type RolTono = (typeof ROL_TONOS)[number];

/** Lo que se necesita de un rol para mostrarlo (badge, encabezado, reportes). */
export type RolResumen = {
  id: string;
  nombre: string;
  color: RolTono;
  es_superadmin: boolean;
};

export type Perfil = {
  id: string;
  nombre_completo: string | null;
  rol_id: string;
  avatar_url: string | null;
  activo: boolean;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  cargo: string | null;
  especialidad_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthContext = {
  user: User;
  profile: Perfil;
  role: RolResumen;
  permissions: Permission[];
  /** nombre de la especialidad del perfil, solo para mostrar */
  specialtyName: string | null;
};

// perfil + rol + permisos + especialidad en una sola consulta
const PERFIL_SELECT =
  "*, rol:rol_id(id, nombre, color, es_superadmin, rol_permisos(permiso)), especialidades:especialidad_id(nombre)";

type PerfilConRol = Perfil & {
  rol: (RolResumen & { rol_permisos: { permiso: string }[] }) | null;
  especialidades: { nombre: string } | null;
};

/**
 * Usuario, perfil, rol y permisos de la sesión actual.
 * cache(): layout, página y guardas de un mismo render comparten una sola consulta.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select(PERFIL_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  let row = data as unknown as PerfilConRol | null;

  // Si el usuario no posee registro en perfiles: crearlo automáticamente
  if (!row) {
    const now = new Date().toISOString();
    const { data: nuevo, error: insertError } = await supabase
      .from("perfiles")
      .insert({
        id: user.id,
        nombre_completo: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario",
        // sin rol: la base asigna el rol predeterminado, igual que el trigger handle_new_user
        activo: true,
        created_at: now,
        updated_at: now,
      })
      .select(PERFIL_SELECT)
      .single();

    if (insertError) {
      console.error("Error auto-creating profile in database:", insertError);
      return null;
    }
    row = nuevo as unknown as PerfilConRol;
  }

  // Si el usuario no está activo o no tiene rol, no tiene acceso
  if (!row.activo || !row.rol) {
    return null;
  }

  const { rol, especialidades, ...profile } = row;
  return {
    user,
    profile,
    role: { id: rol.id, nombre: rol.nombre, color: rol.color, es_superadmin: rol.es_superadmin },
    permissions: resolvePermissions(rol),
    specialtyName: especialidades?.nombre ?? null,
  };
});

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    redirect("/auth/sin-acceso");
  }
  return ctx;
}

export async function requirePermission(
  permission: Permission
): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!ctx.permissions.includes(permission)) {
    redirect("/administracion/no-autorizado");
  }
  return ctx;
}

export async function requireRouteAccess(
  pathname: string
): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!canAccessRoute(ctx.permissions, pathname)) {
    redirect("/administracion/no-autorizado");
  }
  return ctx;
}

/** Para server actions: lanza un error legible en vez de redirigir. Devuelve el contexto para reutilizarlo. */
export async function assertPermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }
  if (!ctx.permissions.includes(permission)) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
  return ctx;
}
