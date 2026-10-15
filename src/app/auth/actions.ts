"use server";

import { redirect } from "next/navigation";
import { avisarUsuarioNuevo, enviarRestablecerContrasena } from "@/lib/cuentas";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailSchema } from "@/lib/validation/validationUtils";

const logger = getLogger("auth");

export type AuthState = {
  error?: string;
  success?: string;
} | null;

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Por favor completa todos los campos." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warning("Sign-in failed", errorInfo(error));
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials")
    ) {
      return { error: "Correo o contraseña incorrectos." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Debes confirmar tu correo antes de iniciar sesión." };
    }
    return { error: "Ocurrió un error al iniciar sesión. Intenta de nuevo." };
  }
  logger.info("User signed in", { userId: data.user.id });

  const next = (formData.get("next") as string)?.trim();
  const safeNext =
    next && next.startsWith("/administracion") ? next : "/administracion";
  redirect(safeNext);
}

export async function signUpAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!fullName || !email || !password || !confirmPassword) {
    return {
      error:
        "Prueba de presencia: Por favor completa todos los campos obligatorios.",
    };
  }

  if (password.length < 8) {
    return {
      error:
        "Prueba de longitud: La contraseña debe tener al menos 8 caracteres.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Prueba de coherencia: Las contraseñas ingresadas no coinciden.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    if (
      signUpError.message.includes("already registered") ||
      signUpError.message.includes("already exists")
    ) {
      return {
        error:
          "Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.",
      };
    }
    logger.error("Sign-up failed", errorInfo(signUpError));
    return { error: "No se pudo registrar el usuario. Intenta de nuevo." };
  }

  const user = authData.user;
  if (user) {
    // Sincronización explicita en caso de que el trigger esté en proceso
    const { data: existingProfile } = await supabase
      .from("perfiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: perfilError } = await supabase.from("perfiles").insert({
        id: user.id,
        nombre_completo: fullName,
        // sin rol: la base asigna el predeterminado ("voluntario"), igual que el trigger handle_new_user
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // el trigger handle_new_user también lo crea: si este insert falla no se corta el registro
      if (perfilError)
        logger.warning("Profile sync failed", {
          ...errorInfo(perfilError),
          userId: user.id,
        });
    }
  }

  // Si requiere confirmación de email por Supabase Auth
  if (authData.session === null && user?.identities?.length === 0) {
    return { error: "Tu cuenta ya existe. Por favor inicia sesión." };
  }

  logger.info("User signed up", { userId: user?.id ?? null });
  await avisarUsuarioNuevo(fullName, email, "Registro desde el sitio web");
  redirect("/auth/sin-acceso");
}

/** Desde el enlace del correo (cuenta de voluntario nueva o Recuperar contraseña). */
export async function crearContrasenaAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const tokenHash = (formData.get("token_hash") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  // el enlace se canjea al guardar y no al abrirlo: así no lo gastan los
  // filtros de correo que abren los enlaces para revisarlos
  const supabase = await createSupabaseServerClient();
  const { error: enlaceError } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  if (enlaceError) {
    logger.warning("Password link verification failed", errorInfo(enlaceError));
    return {
      error:
        "El enlace venció o ya se usó. Pide uno nuevo en Recuperar contraseña.",
    };
  }

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    logger.error("Password update failed", errorInfo(error));
    return {
      error:
        error.code === "same_password"
          ? "La contraseña nueva debe ser distinta de la anterior. Pide un enlace nuevo e intenta otra."
          : "No se pudo guardar la contraseña. Pide un enlace nuevo e intenta otra.",
    };
  }
  logger.info("Password updated", { userId: data.user.id });

  redirect("/administracion");
}

export async function recuperarContrasenaAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const correo = emailSchema.safeParse(formData.get("email"));
  if (!correo.success) {
    return { error: "Ingresa un correo electrónico válido." };
  }

  try {
    await enviarRestablecerContrasena(correo.data.toLowerCase());
  } catch (e) {
    logger.error("Password reset email failed", errorInfo(e));
    return {
      error: "No pudimos enviar el correo. Intenta de nuevo más tarde.",
    };
  }
  // mismo mensaje haya o no cuenta: no revela qué correos están registrados
  return {
    success:
      "Si el correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja de entrada.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) logger.warning("Sign-out failed", errorInfo(error));
  redirect("/auth/login");
}
