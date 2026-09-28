import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission, getAuthContext } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isAppRole, type AppRole } from "@/lib/auth/roles";
import PageHeader from "@/app/administracion/components/PageHeader";
import styles from "@/styles/pages/admin.module.css";
import UsuariosAdminClient from "./UsuariosAdminClient";

export type ProfileWithSpecialty = {
  id: string;
  nombre_completo: string | null;
  rol: AppRole;
  activo: boolean;
  avatar_url: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  cargo: string | null;
  especialidad_id: string | null;
  created_at: string;
  updated_at: string;
  especialidades: {
    id: string;
    nombre: string;
  } | null;
};

export type SpecialtyRow = {
  id: string;
  nombre: string;
};

export default async function UsuariosPage() {
  await requirePermission(PERMISSIONS.USUARIOS_READ);

  const [supabase, ctx] = await Promise.all([
    createSupabaseServerClient(),
    getAuthContext(),
  ]);

  const currentUserId = ctx?.user.id || "";

  // 1. Fetch profiles joined with specialties
  const { data: profilesData, error: profilesError } = await supabase
    .from("perfiles")
    .select("*, especialidades:especialidad_id(id, nombre)")
    .order("created_at", { ascending: false });

  // 2. Fetch specialties list for filters and modal assignment
  const { data: specialtiesData, error: specialtiesError } = await supabase
    .from("especialidades")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  const rawRows = profilesData ?? [];
  const rows: any[] = rawRows;

  const specialties: SpecialtyRow[] = specialtiesData ?? [];
  const fetchError =
    profilesError?.message || specialtiesError?.message || null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Administración de Usuarios"
        description="Gestiona los perfiles de los miembros de Dibujando Sonrisas. Puedes buscar, filtrar, cambiar roles, asignar especialidades clínicas y activar o desactivar accesos."
      />

      <UsuariosAdminClient
        rows={rows}
        specialties={specialties}
        fetchError={fetchError}
        currentUserId={currentUserId}
      />
    </div>
  );
}
