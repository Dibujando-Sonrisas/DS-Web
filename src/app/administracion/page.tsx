import styles from "@/styles/pages/admin.module.css";
import dash from "@/styles/pages/admin-dashboard.module.css";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import RoleBadge from "./components/RoleBadge";
import UserAvatar from "./components/UserAvatar";
import { Suspense } from "react";
import CountdownBrigada from "./components/dashboard/CountdownBrigada";
import ActividadReciente from "./components/dashboard/ActividadReciente";
import AlertasSistema from "./components/dashboard/AlertasSistema";
import QuickActions from "./components/dashboard/QuickActions";
import SolicitudesRecientesWidget from "./components/dashboard/SolicitudesRecientesWidget";
import { AdminStats, ClinicoStats, FarmaciaStats, VoluntarioStats } from "./components/dashboard/TarjetasDashboard";

/** Tres tarjetas vacías mientras llegan las métricas. */
function StatsSkeleton() {
  return (
    <>
      <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
      <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
      <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
    </>
  );
}

export default async function DashboardPage() {
  const ctx = await requirePermission(PERMISSIONS.PERFIL_READ);
  const specialtyName = ctx.specialtyName ?? "Ninguna / Administrativo";
  const nameDisplay = ctx.profile.nombre_completo || "Usuario";
  const can = (p: Permission) => ctx.permissions.includes(p);

  // la vista sale de los permisos, nunca del nombre del rol: un rol nuevo cae en "voluntario"
  // (bodega usa la de voluntario mientras no tenga tarjetas propias)
  const view = can(PERMISSIONS.DASHBOARD_RESUMEN)
    ? "admin"
    : can(PERMISSIONS.PACIENTES_CREATE)
    ? "clinico"
    : can(PERMISSIONS.FARMACIA_PROCESS)
    ? "farmacia"
    : "voluntario";

  return (
    <div className={styles.page}>
      {/* Bienvenida + perfil activo */}
      <header className={dash.welcome}>
        <div className={dash.welcomeMain}>
          <UserAvatar
            avatarUrl={ctx.profile.avatar_url}
            nombres={ctx.profile.nombre_completo}
            email={ctx.user.email}
            size={72}
          />
          <div className={styles.pageHeading}>
            <h1 className={styles.pageTitle}>Bienvenido, {nameDisplay}</h1>
            <div className="crayons" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className={styles.pageLead}>
              Llevando salud, amor y esperanza a las comunidades de Honduras.
            </p>
          </div>
        </div>

        <dl className={`${styles.kv} ${dash.profileCard}`}>
          <dt>Rol</dt>
          <dd>
            <RoleBadge role={ctx.role} />
          </dd>
          <dt>Especialidad</dt>
          <dd>
            <span className={`${styles.badge} ${styles.badgeInfo}`}>{specialtyName}</span>
          </dd>
        </dl>
      </header>

      <QuickActions permissions={ctx.permissions} />

      <Suspense fallback={<div className={`${styles.skeleton} ${styles.skeletonStat}`} />}>
        <CountdownBrigada />
      </Suspense>

      <section className={styles.stackSm} aria-labelledby="resumen-general">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="resumen-general" className={styles.sectionTitle}>
              Resumen General
            </h2>
            <p className={styles.sectionLead}>
              Vistazo rápido a las actividades de Dibujando Sonrisas.
            </p>
          </div>
        </div>

        <div className={`${styles.statGrid} ${styles.statGridThree} tone-rotate`}>
          <Suspense fallback={<StatsSkeleton />}>
            {view === "admin" && <AdminStats />}
            {view === "clinico" && <ClinicoStats />}
            {view === "farmacia" && <FarmaciaStats />}
            {view === "voluntario" && <VoluntarioStats />}
          </Suspense>
        </div>
      </section>

      {/* Solicitudes de Inscripción para la Brigada Activa */}
      {view === "admin" && (
        <Suspense fallback={<div className={`${styles.skeleton} ${styles.skeletonBlock}`} />}>
          <SolicitudesRecientesWidget />
        </Suspense>
      )}

      {/* Alertas y Actividad Reciente solo con el resumen general */}
      {view === "admin" && (
        <div className={styles.grid2}>
          <Suspense fallback={<div className={`${styles.skeleton} ${styles.skeletonBlock}`} />}>
            <AlertasSistema />
          </Suspense>
          <Suspense fallback={<div className={`${styles.skeleton} ${styles.skeletonBlock}`} />}>
            <ActividadReciente />
          </Suspense>
        </div>
      )}
    </div>
  );
}
