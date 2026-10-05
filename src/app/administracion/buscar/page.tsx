import type { ReactNode } from "react";
import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, CircleAlert, Eye, HeartPulse, Layers, Search, SearchX, Settings2, Tent } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { canAccessRoute } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { coincide } from "@/lib/texto";
import { ESTADOS as ESTADOS_PACIENTE } from "@/app/administracion/pacientes/estados";
import PageHeader from "@/app/administracion/components/PageHeader";
import EmptyState from "@/app/administracion/components/EmptyState";
import styles from "@/styles/pages/admin.module.css";

const VISTA_PREVIA = 5; // filas por grupo en "Todos"
const MAX_FILAS = 50; // filas en la pestaña de un solo tipo

// el enum de la base tiene estados heredados que la app no usa: esos caen en su nombre crudo
const ESTADOS_BRIGADA: Record<string, { label: string; badge: string }> = {
  inscripciones_abiertas: { label: "Inscripciones Abiertas", badge: "badgeInfo" },
  inscripciones_cerradas: { label: "Inscripciones Cerradas", badge: "badgeNeutral" },
  finalizada: { label: "Finalizada", badge: "badgeNeutral" },
  cancelada: { label: "Cancelada", badge: "badgeDanger" },
};

const TIPOS_RECURSO: Record<string, { label: string; badge: string }> = {
  medicamento: { label: "Medicamento", badge: "badgeInfo" },
  insumo_medico: { label: "Insumo Médico", badge: "badgeBrand" },
  material_brigada: { label: "Material Brigada", badge: "badgeNeutral" },
};

const stockBadge = (estado: string) =>
  estado === "Sin Existencias" ? "badgeDanger" : estado === "Normal" ? "badgeSuccess" : "badgeWarning";

// fecha_brigada es un DATE: en UTC no se corre un día según la zona del servidor
const formatFecha = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type Grupo = {
  id: "pacientes" | "brigadas" | "inventario";
  label: string;
  icon: ReactNode;
  total: number;
  error: boolean;
  tabla: (filas: number) => ReactNode;
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tipo?: string | string[] }>;
}) {
  const ctx = await requireAuthContext();
  const puede = (ruta: string) => canAccessRoute(ctx.permissions, ruta);
  const acceso = {
    pacientes: puede("/administracion/pacientes"),
    brigadas: puede("/administracion/brigadas"),
    inventario: puede("/administracion/inventario"),
  };
  if (!acceso.pacientes && !acceso.brigadas && !acceso.inventario) {
    redirect("/administracion/no-autorizado");
  }

  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim();
  const buscar = q.length >= 2;

  // ponytail: trae cada tabla y filtra aquí para ignorar tildes igual que los módulos;
  // con miles de filas, pasar a una función SQL con unaccent + ilike + limit
  const supabase = await createSupabaseServerClient();
  const [pac, brig, inv] = await Promise.all([
    buscar && acceso.pacientes
      ? supabase
          .from("v_pacientes_atendidos")
          .select("id, codigo, paciente, brigada, estado")
          .order("created_at", { ascending: false })
      : null,
    buscar && acceso.brigadas
      ? supabase
          .from("brigadas")
          .select("id, codigo, nombre, lugar, municipio, departamento, fecha_brigada, estado")
          .order("fecha_brigada", { ascending: false })
      : null,
    buscar && acceso.inventario
      ? supabase
          .from("stock_actual")
          .select("medicamento_id, nombre, descripcion, tipo_recurso, stock_total, unidad_medida, estado_stock")
          .order("nombre")
      : null,
  ]);
  for (const res of [pac, brig, inv]) {
    if (res?.error) console.error("Error en la búsqueda global:", res.error.message);
  }

  const pacientes = (pac?.data ?? []).filter((p) => coincide(`${p.codigo ?? ""} ${p.paciente ?? ""}`, q));
  const brigadas = (brig?.data ?? []).filter((b) =>
    coincide(`${b.codigo} ${b.nombre} ${b.lugar} ${b.municipio} ${b.departamento}`, q)
  );
  const recursos = (inv?.data ?? []).filter((r) => coincide(`${r.nombre ?? ""} ${r.descripcion ?? ""}`, q));

  const grupos: Grupo[] = [];
  if (acceso.pacientes) {
    grupos.push({
      id: "pacientes",
      label: "Pacientes",
      icon: <HeartPulse aria-hidden="true" />,
      total: pacientes.length,
      error: !!pac?.error,
      tabla: (filas) => (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Paciente</th>
                <th>Brigada</th>
                <th>Estado</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.slice(0, filas).map((p) => {
                const estado = ESTADOS_PACIENTE[p.estado ?? ""] ?? ESTADOS_PACIENTE.finalizada;
                return (
                  <tr key={p.id}>
                    <td className={styles.cellCode}>{p.codigo}</td>
                    <td className={styles.cellMain}>{p.paciente}</td>
                    <td>{p.brigada || "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[estado.badge]}`}>{estado.label}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={`/administracion/pacientes/${p.id}`}
                          className="btn-ghost btn-xs"
                          aria-label={`Ver expediente de ${p.paciente}`}
                        >
                          <Eye aria-hidden="true" />
                          Ver expediente
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  }
  if (acceso.brigadas) {
    grupos.push({
      id: "brigadas",
      label: "Brigadas",
      icon: <Tent aria-hidden="true" />,
      total: brigadas.length,
      error: !!brig?.error,
      tabla: (filas) => (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Brigada</th>
                <th>Lugar</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {brigadas.slice(0, filas).map((b) => {
                const estado = ESTADOS_BRIGADA[b.estado] ?? { label: b.estado, badge: "badgeNeutral" };
                return (
                  <tr key={b.id}>
                    <td>
                      <span className={styles.cellMain}>{b.nombre}</span>
                      <span className={`${styles.cellSub} ${styles.nowrap}`}>{b.codigo}</span>
                    </td>
                    <td>
                      {b.lugar}
                      <span className={styles.cellSub}>
                        {b.municipio}, {b.departamento}
                      </span>
                    </td>
                    <td className={styles.nowrap}>{formatFecha.format(new Date(b.fecha_brigada))}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[estado.badge]}`}>{estado.label}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={`/administracion/brigadas?brigada=${b.id}`}
                          className="btn-ghost btn-xs"
                          aria-label={`Gestionar ${b.nombre}`}
                        >
                          <Settings2 aria-hidden="true" />
                          Gestionar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  }
  if (acceso.inventario) {
    grupos.push({
      id: "inventario",
      label: "Medicamentos e insumos",
      icon: <Boxes aria-hidden="true" />,
      total: recursos.length,
      error: !!inv?.error,
      tabla: (filas) => (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recurso</th>
                <th>Tipo</th>
                <th className={styles.num}>Stock</th>
                <th>Estado</th>
                <th className={styles.num}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recursos.slice(0, filas).map((r) => {
                const tipoRecurso = TIPOS_RECURSO[r.tipo_recurso ?? ""] ?? TIPOS_RECURSO.medicamento;
                const estadoStock = r.estado_stock || "Sin Existencias";
                return (
                  <tr key={r.medicamento_id}>
                    <td>
                      <span className={styles.cellMain}>{r.nombre}</span>
                      {r.descripcion && (
                        <span className={`${styles.cellSub} ${styles.truncate}`} title={r.descripcion}>
                          {r.descripcion}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[tipoRecurso.badge]}`}>{tipoRecurso.label}</span>
                    </td>
                    <td className={`${styles.num} ${styles.nowrap}`}>
                      {r.stock_total ?? 0} {r.unidad_medida}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeDot} ${styles[stockBadge(estadoStock)]}`}>
                        {estadoStock}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={`/administracion/inventario?lotes=${r.medicamento_id}`}
                          className="btn-ghost btn-xs"
                          aria-label={`Ver lotes de ${r.nombre}`}
                        >
                          <Layers aria-hidden="true" />
                          Ver lotes
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    });
  }

  const tipo = grupos.find((g) => g.id === params.tipo)?.id ?? "todos";
  const total = grupos.reduce((sum, g) => sum + g.total, 0);
  const hrefTipo = (t: string) =>
    `/administracion/buscar?q=${encodeURIComponent(q)}${t === "todos" ? "" : `&tipo=${t}`}`;
  const visibles =
    tipo === "todos" ? grupos.filter((g) => g.total > 0 || g.error) : grupos.filter((g) => g.id === tipo);
  const filas = tipo === "todos" ? VISTA_PREVIA : MAX_FILAS;
  const alcance = new Intl.ListFormat("es", { type: "disjunction" }).format(
    grupos.map((g) => g.label.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Búsqueda"
        description={
          buscar ? (
            <>
              Resultados para <strong>“{q}”</strong> en {alcance}.
            </>
          ) : (
            `Encuentra ${alcance} por nombre o código.`
          )
        }
      />

      <section className={styles.panel} aria-label="Buscar en el sistema">
        <Form action="/administracion/buscar" className={styles.toolbar} role="search">
          <div className={`${styles.filter} ${styles.filterWide}`}>
            <label className={styles.filterLabel} htmlFor="buscar-q">
              Nombre o código
            </label>
            <div className={styles.search}>
              <Search aria-hidden="true" />
              <input
                id="buscar-q"
                name="q"
                type="search"
                className="form-input"
                placeholder="Ej. María López, El Hatillo, acetaminofén..."
                defaultValue={q}
                minLength={2}
                required
                autoFocus={!q}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            <Search aria-hidden="true" />
            Buscar
          </button>
        </Form>
      </section>

      {!buscar ? (
        <EmptyState dashed icon={<Search />} title={q ? "Escribe al menos 2 caracteres" : "¿Qué estás buscando?"}>
          Puedes escribir parte del nombre o del código. No importan las tildes ni las mayúsculas.
        </EmptyState>
      ) : (
        <>
          <nav className={styles.tabs} aria-label="Tipo de resultado">
            <Link href={hrefTipo("todos")} className={styles.tab} aria-current={tipo === "todos" ? "page" : undefined}>
              <Search aria-hidden="true" />
              Todos
              <span className={styles.tabCount}>{total}</span>
            </Link>
            {grupos.map((g) => (
              <Link
                key={g.id}
                href={hrefTipo(g.id)}
                className={styles.tab}
                aria-current={tipo === g.id ? "page" : undefined}
              >
                {g.icon}
                {g.label}
                <span className={styles.tabCount}>{g.total}</span>
              </Link>
            ))}
          </nav>

          {visibles.length === 0 ? (
            <EmptyState dashed icon={<SearchX />} title={`Sin resultados para “${q}”`}>
              Revisa la ortografía o prueba con menos palabras.
            </EmptyState>
          ) : (
            visibles.map((g) => (
              <section key={g.id} className={styles.panel} aria-labelledby={`grupo-${g.id}`}>
                <div className={styles.panelHeader}>
                  <h2 id={`grupo-${g.id}`} className={styles.panelTitle}>
                    {g.label} <span className={styles.count}>{g.total}</span>
                  </h2>
                </div>

                {g.error ? (
                  <div className={styles.panelBody}>
                    <p className="notice notice-bad" role="alert">
                      <CircleAlert aria-hidden="true" />
                      <span>No se pudo buscar en {g.label.toLowerCase()}. Intenta de nuevo en unos minutos.</span>
                    </p>
                  </div>
                ) : g.total === 0 ? (
                  <EmptyState icon={<SearchX />} title={`Ningún resultado en ${g.label.toLowerCase()}`}>
                    Revisa la ortografía o prueba con menos palabras.
                  </EmptyState>
                ) : (
                  g.tabla(filas)
                )}

                {!g.error && g.total > filas && (
                  <div className={styles.panelFooter}>
                    {tipo === "todos" ? (
                      <Link href={hrefTipo(g.id)} className="btn-ghost btn-sm">
                        Ver los {g.total} resultados
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className={styles.pagerInfo}>
                        Mostrando {filas} de {g.total}. Agrega más palabras para afinar la búsqueda.
                      </span>
                    )}
                  </div>
                )}
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
