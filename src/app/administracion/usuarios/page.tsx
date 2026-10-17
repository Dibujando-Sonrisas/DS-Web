import PageHeader from "@/app/administracion/components/PageHeader";
import {
  PERMISSIONS,
  type Permission,
  resolvePermissions,
} from "@/lib/auth/permissions";
import {
  type RolResumen,
  type RolTono,
  requirePermission,
  toRolTono,
} from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import styles from "@/styles/pages/admin.module.css";
import UsuariosAdminClient from "./UsuariosAdminClient";

export type ProfileWithSpecialty = {
  id: string;
  nombre_completo: string | null;
  rol_id: string;
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
  rol: RolResumen | null;
};

export type SpecialtyRow = {
  id: string;
  nombre: string;
};

/** Un rol con sus permisos efectivos y cuántos usuarios lo tienen. */
export type RolDetalle = {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: RolTono;
  es_superadmin: boolean;
  es_predeterminado: boolean;
  permisos: Permission[];
  usuarios: number;
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.USUARIOS_READ);
  const supabase = await createSupabaseServerClient();
  const { tab } = await searchParams;

  const [
    { data: profilesData, error: profilesError },
    { data: specialtiesData, error: specialtiesError },
    { data: rolesData, error: rolesError },
  ] = await Promise.all([
    supabase
      .from("perfiles")
      .select(
        "*, especialidades:especialidad_id(id, nombre), rol:rol_id(id, nombre, color, es_superadmin)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("especialidades")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
    supabase
      .from("roles")
      .select(
        "id, nombre, descripcion, color, es_superadmin, es_predeterminado, rol_permisos(permiso), perfiles(count)"
      )
      .order("es_superadmin", { ascending: false })
      .order("nombre", { ascending: true }),
  ]);

  const rows: ProfileWithSpecialty[] = (profilesData ?? []).map(
    ({ rol, ...profile }) => ({
      ...profile,
      rol: rol ? { ...rol, color: toRolTono(rol.color) } : null,
    })
  );
  const specialties: SpecialtyRow[] = specialtiesData ?? [];
  const roles: RolDetalle[] = (rolesData ?? []).map(
    ({ rol_permisos, perfiles, ...rol }) => ({
      ...rol,
      color: toRolTono(rol.color),
      permisos: resolvePermissions({
        es_superadmin: rol.es_superadmin,
        rol_permisos,
      }),
      usuarios: perfiles[0]?.count ?? 0,
    })
  );
  const fetchError =
    profilesError?.message ||
    specialtiesError?.message ||
    rolesError?.message ||
    null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Administración de Usuarios"
        description="Gestiona los miembros de Dibujando Sonrisas y los roles que definen qué puede hacer cada uno en el panel."
      />

      <UsuariosAdminClient
        rows={rows}
        specialties={specialties}
        roles={roles}
        fetchError={fetchError}
        currentUserId={ctx.user.id}
        initialTab={tab === "roles" ? "roles" : "miembros"}
      />
    </div>
  );
}
