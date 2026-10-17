import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  canAccessRoute,
  type Permission,
  resolvePermissions,
} from "./permissions";

const logger = getLogger("auth");

export const ROL_TONOS = [
  "brand",
  "info",
  "success",
  "warning",
  "danger",
  "neutral",
] as const;
export type RolTono = (typeof ROL_TONOS)[number];

export function isRolTono(value: string): value is RolTono {
  return ROL_TONOS.some((tono) => tono === value);
}

// roles.color has a CHECK constraint limited to ROL_TONOS, so the fallback never applies.
export function toRolTono(value: string): RolTono {
  return isRolTono(value) ? value : "neutral";
}

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
  specialtyName: string | null;
};

const PERFIL_SELECT =
  "*, rol:rol_id(id, nombre, color, es_superadmin, rol_permisos(permiso)), especialidades:especialidad_id(nombre)";

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
    logger.error("Profile load failed", {
      ...errorInfo(error),
      userId: user.id,
    });
    return null;
  }

  let row = data;

  if (!row) {
    const now = new Date().toISOString();
    const { data: nuevo, error: insertError } = await supabase
      .from("perfiles")
      .insert({
        id: user.id,
        nombre_completo:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Usuario",
        activo: true,
        created_at: now,
        updated_at: now,
      })
      .select(PERFIL_SELECT)
      .single();

    if (insertError) {
      logger.error("Profile auto-creation failed", {
        ...errorInfo(insertError),
        userId: user.id,
      });
      return null;
    }
    logger.info("Profile auto-created", { userId: user.id });
    row = nuevo;
  }

  if (!row.activo || !row.rol) {
    logger.debug("Profile without access", {
      userId: user.id,
      activo: row.activo,
      conRol: Boolean(row.rol),
    });
    return null;
  }

  const { rol, especialidades, ...profile } = row;
  return {
    user,
    profile,
    role: {
      id: rol.id,
      nombre: rol.nombre,
      color: toRolTono(rol.color),
      es_superadmin: rol.es_superadmin,
    },
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

export async function assertPermission(
  permission: Permission
): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }
  if (!ctx.permissions.includes(permission)) {
    logger.warning("Permission denied", { permission, userId: ctx.user.id });
    throw new Error("No tienes permiso para realizar esta acción.");
  }
  return ctx;
}
