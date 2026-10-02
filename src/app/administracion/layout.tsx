import { PermissionsProvider } from "./components/PermissionsProvider";
import AdminLayoutClient from "./components/AdminLayoutClient";
import { getAuthContext, getSpecialtyName } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
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

  const specialtyName = await getSpecialtyName(ctx.profile.especialidad_id);

  const displayName = ctx.profile.nombre_completo || ctx.user.email || "Usuario";
  const roleLabel = ROLE_LABELS[ctx.role] || ctx.role;

  return (
    <PermissionsProvider role={ctx.role} specialtyName={specialtyName}>
      <AdminLayoutClient
        displayName={displayName}
        roleLabel={roleLabel}
        avatarUrl={ctx.profile.avatar_url}
        email={ctx.user.email || ""}
      >
        {children}
      </AdminLayoutClient>
    </PermissionsProvider>
  );
}
