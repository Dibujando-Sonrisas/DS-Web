"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { assertPermission, getAuthContext, ROL_TONOS, type RolTono } from "@/lib/auth/session";
import { PERMISSIONS, isPermission, permissionLabel } from "@/lib/auth/permissions";

export type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
} | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** RLS no da error cuando no deja tocar una fila: solo devuelve 0 filas. */
function assertFilas(data: unknown[] | null, mensaje: string) {
  if (!data?.length) throw new Error(mensaje);
}

/** Actualizar datos básicos de perfil (Tarea 4) */
export async function updateProfileAction(
  userId: string,
  data: {
    nombre_completo: string;
    telefono?: string;
    fecha_nacimiento?: string;
    sexo?: string;
  }
): Promise<ActionResponse> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Debes iniciar sesión.");

    // Allow updating own profile with PERFIL_UPDATE, or other profiles with USUARIOS_UPDATE
    if (ctx.user.id !== userId) {
      await assertPermission(PERMISSIONS.USUARIOS_UPDATE);
    } else {
      await assertPermission(PERMISSIONS.PERFIL_UPDATE);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("perfiles")
      .update({
        nombre_completo: data.nombre_completo,
        telefono: data.telefono || null,
        fecha_nacimiento: data.fecha_nacimiento || null,
        sexo: data.sexo || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    revalidatePath("/administracion/usuarios");
    revalidatePath("/administracion/perfil");
    return {
      success: true,
      message: "Perfil actualizado exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al actualizar perfil.",
    };
  }
}

/** Actualizar la URL de avatar del perfil (Tarea 5) */
export async function updateAvatarAction(
  userId: string,
  avatarUrl: string
): Promise<ActionResponse> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Debes iniciar sesión.");

    if (ctx.user.id !== userId) {
      await assertPermission(PERMISSIONS.USUARIOS_UPDATE);
    } else {
      await assertPermission(PERMISSIONS.PERFIL_UPDATE);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("perfiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    revalidatePath("/administracion/usuarios");
    revalidatePath("/administracion/perfil");
    return {
      success: true,
      message: "Avatar actualizado exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al actualizar avatar.",
    };
  }
}

/** Cambiar rol del usuario. La base repite estas reglas (trigger en perfiles). */
export async function changeRoleAction(
  userId: string,
  roleId: string
): Promise<ActionResponse> {
  try {
    const ctx = await assertPermission(PERMISSIONS.USUARIOS_UPDATE);
    if (ctx.user.id === userId) {
      throw new Error("No puedes cambiar tu propio rol.");
    }
    if (!UUID.test(roleId)) throw new Error("Rol no válido.");

    const supabase = await createSupabaseServerClient();

    // el rol de administrador solo lo da o lo quita otro administrador
    if (!ctx.role.es_superadmin) {
      const { data: involucrados } = await supabase
        .from("perfiles")
        .select("rol:rol_id(es_superadmin)")
        .eq("id", userId)
        .maybeSingle();
      const { data: destino } = await supabase
        .from("roles")
        .select("es_superadmin")
        .eq("id", roleId)
        .maybeSingle();
      const actual = involucrados?.rol as { es_superadmin: boolean } | null;
      if (actual?.es_superadmin || destino?.es_superadmin) {
        throw new Error("Solo un administrador puede asignar o quitar el rol de administrador.");
      }
    }

    const { data, error } = await supabase
      .from("perfiles")
      .update({
        rol_id: roleId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id");

    if (error) throw new Error(error.message);
    assertFilas(data, "No se pudo cambiar el rol: el usuario no existe o no tienes acceso a él.");

    revalidatePath("/administracion/usuarios");
    return {
      success: true,
      message: "Rol de usuario actualizado exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al cambiar rol.",
    };
  }
}

/** Cambiar especialidad del usuario (Tarea 6 - Solo Admin) */
export async function changeSpecialtyAction(
  userId: string,
  specialtyId: string | null
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.USUARIOS_UPDATE);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("perfiles")
      .update({
        especialidad_id: specialtyId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id");

    if (error) throw new Error(error.message);
    assertFilas(data, "No se pudo cambiar la especialidad: el usuario no existe o no tienes acceso a él.");

    revalidatePath("/administracion/usuarios");
    return {
      success: true,
      message: "Especialidad de usuario actualizada exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al cambiar especialidad.",
    };
  }
}

/** Activar cuenta de usuario (Tarea 6 - Solo Admin) */
export async function activateUserAction(
  userId: string
): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.USUARIOS_UPDATE);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("perfiles")
      .update({
        activo: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id");

    if (error) throw new Error(error.message);
    assertFilas(data, "No se pudo activar la cuenta: el usuario no existe o no tienes acceso a él.");

    revalidatePath("/administracion/usuarios");
    return {
      success: true,
      message: "Cuenta de usuario activada exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al activar usuario.",
    };
  }
}

/** Desactivar cuenta de usuario (Tarea 6 - Solo Admin) */
export async function deactivateUserAction(
  userId: string
): Promise<ActionResponse> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error("Debes iniciar sesión.");
    if (ctx.user.id === userId) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }

    await assertPermission(PERMISSIONS.USUARIOS_UPDATE);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("perfiles")
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id");

    if (error) throw new Error(error.message);
    assertFilas(data, "No se pudo desactivar la cuenta: el usuario no existe o no tienes acceso a él.");

    revalidatePath("/administracion/usuarios");
    return {
      success: true,
      message: "Cuenta de usuario desactivada exitosamente.",
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al desactivar usuario.",
    };
  }
}

/* ── ROLES ── */

export type GuardarRolInput = {
  id: string | null;
  nombre: string;
  descripcion: string;
  color: RolTono;
  predeterminado: boolean;
  permisos: string[];
};

/** Crea o edita un rol y deja sus permisos exactamente como vienen (una sola transacción en la base). */
export async function guardarRolAction(input: GuardarRolInput): Promise<ActionResponse & { id?: string }> {
  try {
    const ctx = await assertPermission(input.id ? PERMISSIONS.ROLES_UPDATE : PERMISSIONS.ROLES_CREATE);
    if (input.id && !UUID.test(input.id)) throw new Error("Rol no válido.");

    const nombre = input.nombre.trim();
    const descripcion = input.descripcion.trim();
    if (nombre.length < 2 || nombre.length > 60) throw new Error("El nombre debe tener entre 2 y 60 caracteres.");
    if (descripcion.length > 240) throw new Error("La descripción admite hasta 240 caracteres.");
    if (!(ROL_TONOS as readonly string[]).includes(input.color)) throw new Error("Color no válido.");

    // solo claves del catálogo; perfil.read va siempre (sin él no se entra al panel)
    const permisos = [...new Set([...input.permisos.filter(isPermission), PERMISSIONS.PERFIL_READ])];

    if (!ctx.role.es_superadmin) {
      if (input.id === ctx.role.id) throw new Error("No puedes editar tu propio rol.");
      const ajenos = permisos.filter((p) => !ctx.permissions.includes(p));
      if (ajenos.length) {
        throw new Error(`No puedes otorgar permisos que no tienes: ${ajenos.map(permissionLabel).join(", ")}.`);
      }
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("guardar_rol", {
      p_id: input.id as string,
      p_nombre: nombre,
      p_descripcion: descripcion,
      p_color: input.color,
      p_predeterminado: input.predeterminado,
      p_permisos: permisos,
    });

    if (error) {
      if (error.code === "23505") throw new Error(`Ya existe un rol llamado "${nombre}".`);
      throw new Error(error.message);
    }

    // el nombre del rol se ve en el encabezado y en otras páginas del panel
    revalidatePath("/administracion", "layout");
    return {
      success: true,
      id: data as string,
      message: input.id ? "Rol actualizado exitosamente." : "Rol creado exitosamente.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar el rol." };
  }
}

/** Elimina un rol; si tiene usuarios, primero los pasa a destinoId. */
export async function eliminarRolAction(rolId: string, destinoId: string | null): Promise<ActionResponse> {
  try {
    await assertPermission(PERMISSIONS.ROLES_DELETE);
    if (!UUID.test(rolId) || (destinoId && !UUID.test(destinoId))) throw new Error("Rol no válido.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("eliminar_rol", {
      p_id: rolId,
      p_destino: destinoId as string,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/administracion", "layout");
    return { success: true, message: "Rol eliminado exitosamente." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al eliminar el rol." };
  }
}
