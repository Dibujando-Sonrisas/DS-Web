import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import { InventarioClient } from "./InventarioClient";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ lotes?: string | string[] }>;
}) {
  await requirePermission(PERMISSIONS.INVENTARIO_READ);

  // ?lotes=<id> abre los lotes de ese recurso (enlace desde la búsqueda)
  const { lotes } = await searchParams;
  let initialLotes: { id: string; nombre: string } | null = null;
  if (typeof lotes === "string") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("medicamentos").select("id, nombre").eq("id", lotes).maybeSingle();
    initialLotes = data;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Inventario Médico"
        description="Control de insumos, medicamentos y materiales utilizados en las brigadas."
      />

      <InventarioClient initialLotes={initialLotes} />
    </div>
  );
}
