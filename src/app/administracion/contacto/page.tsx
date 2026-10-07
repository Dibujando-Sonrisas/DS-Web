import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import ContactoClient from "./ContactoClient";

export default async function ContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ mensaje?: string | string[] }>;
}) {
  await requirePermission(PERMISSIONS.CONTACTO_READ);
  const { mensaje } = await searchParams;
  const inicialId = typeof mensaje === "string" ? mensaje : null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacto")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mensajes de Contacto"
        description="Revisa y responde los mensajes enviados a través de la página web."
      />

      <ContactoClient
        key={inicialId ?? ""}
        mensajes={data ?? []}
        fetchError={error?.message ?? null}
        inicialId={inicialId}
      />
    </div>
  );
}
