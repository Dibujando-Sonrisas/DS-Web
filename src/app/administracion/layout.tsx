import { PermissionsProvider } from "./components/PermissionsProvider";
import AdminLayoutClient from "./components/AdminLayoutClient";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | Fundación Dibujando Sonrisas",
  description: "Sistema Web de Gestión Integral — Fundación Dibujando Sonrisas.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();

  if (!ctx) {
    redirect("/auth/sin-acceso");
  }

  const displayName = ctx.profile.nombre_completo || ctx.user.email || "Usuario";

  return (
    <PermissionsProvider role={ctx.role} permissions={ctx.permissions}>
      <AdminLayoutClient
        displayName={displayName}
        roleLabel={ctx.role.nombre}
        avatarUrl={ctx.profile.avatar_url}
        email={ctx.user.email || ""}
      >
        {children}
      </AdminLayoutClient>
    </PermissionsProvider>
  );
}
