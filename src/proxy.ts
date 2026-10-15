import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessRoute,
  type RolConPermisos,
  resolvePermissions,
} from "@/lib/auth/permissions";

export const config = {
  matcher: [
    "/administracion/:path*",
    "/auth/login",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

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
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/administracion");
  const isAuthPage =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/registro");

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

  if (isAdminRoute && user) {
    if (pathname === "/administracion/no-autorizado") {
      return response;
    }

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
