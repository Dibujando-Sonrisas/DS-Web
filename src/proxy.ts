import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { canAccessRoute, resolvePermissions, type RolConPermisos } from "@/lib/auth/permissions";

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/administracion");
  const isAuthPage = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/registro");

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/administracion", request.url));
  }

  if (pathname.startsWith("/auth/sin-acceso")) {
    return response;
  }

  // Validación RBAC de autorización para rutas en /administracion
  if (isAdminRoute && user) {
    // Permitir acceso siempre a la página de no-autorizado para evitar bucles de redirección
    if (pathname === "/administracion/no-autorizado") {
      return response;
    }

    // rol y permisos en la misma consulta; misma regla que getAuthContext (src/lib/auth/session.ts)
    const { data: profile } = await supabase
      .from("perfiles")
      .select("activo, rol:rol_id(es_superadmin, rol_permisos(permiso))")
      .eq("id", user.id)
      .maybeSingle();

    const rol = (profile?.rol ?? null) as RolConPermisos | null;
    if (!profile || !profile.activo || !rol) {
      return NextResponse.redirect(new URL("/auth/sin-acceso", request.url));
    }

    if (!canAccessRoute(resolvePermissions(rol), pathname)) {
      return NextResponse.redirect(
        new URL("/administracion/no-autorizado", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/administracion/:path*",
    "/auth/login",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
