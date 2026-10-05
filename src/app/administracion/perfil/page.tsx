import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PerfilClient from "./PerfilClient";

export const metadata = {
  title: "Mi Perfil | Dibujando Sonrisas",
  description: "Edita la información de tu perfil personal.",
};

export default async function PerfilPage() {
  const ctx = await requirePermission(PERMISSIONS.PERFIL_READ);

  return (
    <PerfilClient
      profile={ctx.profile}
      role={ctx.role}
      email={ctx.user.email ?? ""}
      specialtyName={ctx.specialtyName ?? "Ninguna"}
    />
  );
}
