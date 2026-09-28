import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAppRole, type AppRole } from "./roles";
import { canAccessRoute, hasPermission, hasAnyPermission, type Permission } from "./permissions";

export type Perfil = {
  id: string;
  nombre_completo: string | null;
  rol: AppRole | null;
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
  role: AppRole;
  profile: Omit<Perfil, "rol"> & { rol: AppRole };
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileData, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  let profile = profileData;

  // Tarea 3: Si el usuario no posee registro en perfiles: Crear automáticamente
  if (!profile) {
    const now = new Date().toISOString();
    const { data: newProfile, error: insertError } = await supabase
      .from("perfiles")
      .insert({
        id: user.id,
        nombre_completo: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario",
        // sin rol: la base asigna el predeterminado ("voluntario"), igual que el trigger handle_new_user
        activo: true,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error auto-creating profile in database:", insertError);
      return null;
    }
    profile = newProfile;
  }

  // Si el usuario no está activo, no tiene acceso
  if (!profile.activo) {
    return null;
  }

  if (!isAppRole(profile.rol)) {
    console.error("Invalid role in profile:", profile.rol);
    return null;
  }

  return { user, role: profile.rol, profile: profile as unknown as (Omit<Perfil, "rol"> & { rol: AppRole }) };
}

export async function getCurrentUserRole(): Promise<AppRole | null> {
  const ctx = await getAuthContext();
  return ctx ? ctx.role : null;
}

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
  if (!hasPermission(ctx.role, permission)) {
    redirect("/administracion/no-autorizado");
  }
  return ctx;
}

export async function requireAnyPermission(
  permissions: Permission[]
): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!hasAnyPermission(ctx.role, permissions)) {
    redirect("/administracion/no-autorizado");
  }
  return ctx;
}

export async function requireRouteAccess(
  pathname: string
): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  
  let specialtyName: string | null = null;
  if (ctx.profile.especialidad_id) {
    const supabase = await createSupabaseServerClient();
    const { data: specialty } = await supabase
      .from("especialidades")
      .select("nombre")
      .eq("id", ctx.profile.especialidad_id)
      .maybeSingle();
    if (specialty?.nombre) {
      specialtyName = specialty.nombre;
    }
  }

  if (!canAccessRoute(ctx.role, pathname, specialtyName)) {
    redirect("/administracion/no-autorizado");
  }
  return ctx;
}

export async function assertPermission(permission: Permission): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }
  if (!hasPermission(ctx.role, permission)) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
}
