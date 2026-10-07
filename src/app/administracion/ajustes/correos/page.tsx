import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { configuracionFaltante } from "@/lib/email/contacto";
import CorreosPanel, { type Destinatario } from "./CorreosPanel";

export default async function AjustesCorreosPage() {
  await requirePermission(PERMISSIONS.AJUSTES_READ);
  const supabase = await createSupabaseServerClient();
  const [{ data: usuarios, error: usuariosError }, { data: filas, error: filasError }] =
    await Promise.all([
      supabase.rpc("usuarios_con_correo"),
      supabase
        .from("destinatarios_contacto")
        .select("perfil_id, created_at")
        .order("created_at", { ascending: true }),
    ]);

  const porId = new Map((usuarios ?? []).map((u) => [u.id, u]));
  const destinatarios: Destinatario[] = (filas ?? []).flatMap((f) => {
    const u = porId.get(f.perfil_id);
    return u ? [{ ...u, agregado: f.created_at }] : [];
  });
  // se pueden elegir los usuarios activos que todavía no reciben
  const opciones = (usuarios ?? [])
    .filter((u) => u.activo && !destinatarios.some((d) => d.id === u.id))
    .map((u) => ({ value: u.id, label: u.nombre, detail: u.email }));

  return (
    <CorreosPanel
      destinatarios={destinatarios}
      opciones={opciones}
      fetchError={usuariosError?.message || filasError?.message || null}
      configFaltante={configuracionFaltante()}
    />
  );
}
