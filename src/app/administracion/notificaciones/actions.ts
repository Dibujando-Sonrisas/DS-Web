"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthContext, type AuthContext } from "@/lib/auth/session";
import { PERMISSIONS, canAccessRoute } from "@/lib/auth/permissions";

export type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  fecha: string | null;
  nueva: boolean;
  alerta: boolean;
};

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Alerta = (supabase: Supabase, ctx: AuthContext) => Promise<Notificacion[]>;

const stockMinimo: Alerta = async (supabase, ctx) => {
  const gestionaStock = [PERMISSIONS.INVENTARIO_UPDATE, PERMISSIONS.FARMACIA_UPDATE].some((p) =>
    ctx.permissions.includes(p)
  );
  if (!gestionaStock) return [];

  const { data, error } = await supabase
    .from("stock_actual")
    .select("nombre, stock_total, stock_minimo")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);

  const criticos = (data ?? []).filter((m) => (m.stock_total ?? 0) < (m.stock_minimo ?? 0));
  if (!criticos.length) return [];

  const n = criticos.length;
  const primeros = criticos
    .slice(0, 3)
    .map((m) => `${m.nombre} (${m.stock_total ?? 0}/${m.stock_minimo})`)
    .join(", ");
  return [
    {
      id: "stock_minimo",
      tipo: "stock_minimo",
      titulo: n === 1 ? "1 producto bajo el stock mínimo" : `${n} productos bajo el stock mínimo`,
      detalle: n > 3 ? `${primeros} y ${n - 3} más` : primeros,
      enlace: canAccessRoute(ctx.permissions, "/administracion/reportes")
        ? "/administracion/reportes"
        : "/administracion/inventario",
      fecha: null,
      nueva: false,
      alerta: true,
    },
  ];
};

const ALERTAS: Alerta[] = [stockMinimo];

export async function obtenerNotificacionesAction(): Promise<Notificacion[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const supabase = await createSupabaseServerClient();

  const [eventos, vistas, alertas] = await Promise.all([
    supabase
      .from("notificaciones")
      .select("id, tipo, titulo, detalle, enlace, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("notificaciones_vistas").select("vistas_hasta").maybeSingle(),
    Promise.all(
      ALERTAS.map((alerta) =>
        alerta(supabase, ctx).catch((e) => {
          console.error("No se pudo calcular una alerta del panel:", e);
          return [];
        })
      )
    ).then((r) => r.flat()),
  ]);
  if (eventos.error) console.error("No se pudieron cargar las notificaciones:", eventos.error);

  const vistasHasta = vistas.data ? new Date(vistas.data.vistas_hasta).getTime() : 0;
  return [
    ...alertas,
    ...(eventos.data ?? []).map((e) => ({
      id: e.id,
      tipo: e.tipo,
      titulo: e.titulo,
      detalle: e.detalle,
      enlace: e.enlace,
      fecha: e.created_at,
      nueva: new Date(e.created_at).getTime() > vistasHasta,
      alerta: false,
    })),
  ];
}

export async function marcarNotificacionesVistasAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("marcar_notificaciones_vistas");
  if (error) console.error("No se pudieron marcar las notificaciones como vistas:", error);
}

