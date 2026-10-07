import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AVISOS_CORREO } from "@/lib/avisosCorreo";
import { configuracionFaltante } from "@/lib/email/avisos";
import CorreosPanel, { type SeccionAviso } from "./CorreosPanel";

export default async function AjustesCorreosPage() {
  await requirePermission(PERMISSIONS.AJUSTES_READ);
  const supabase = await createSupabaseServerClient();
  const [{ data: usuarios, error: usuariosError }, { data: filas, error: filasError }] =
    await Promise.all([
      supabase.rpc("usuarios_con_correo"),
      supabase
        .from("destinatarios_correo")
        .select("aviso, perfil_id, created_at")
        .order("created_at", { ascending: true }),
    ]);

  const porId = new Map((usuarios ?? []).map((u) => [u.id, u]));
  const secciones: SeccionAviso[] = AVISOS_CORREO.map((aviso) => {
    const destinatarios = (filas ?? []).flatMap((f) => {
      const u = f.aviso === aviso.id ? porId.get(f.perfil_id) : undefined;
      return u ? [{ ...u, agregado: f.created_at }] : [];
    });
    return {
      ...aviso,
      destinatarios,
      // se pueden elegir los usuarios activos que todavía no reciben este aviso
      opciones: (usuarios ?? [])
        .filter((u) => u.activo && !destinatarios.some((d) => d.id === u.id))
        .map((u) => ({ value: u.id, label: u.nombre, detail: u.email })),
    };
  });

  return (
    <CorreosPanel
      secciones={secciones}
      fetchError={usuariosError?.message || filasError?.message || null}
      configFaltante={configuracionFaltante()}
    />
  );
}
