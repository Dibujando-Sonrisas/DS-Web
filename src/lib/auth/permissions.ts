/**
 * CATÁLOGO DE PERMISOS DEL SISTEMA
 * Los permisos viven en código: cada apartado nuevo agrega aquí los suyos.
 * Qué permisos tiene cada rol se guarda en la base (tablas roles y rol_permisos)
 * y se edita desde Usuarios → Roles. El rol con es_superadmin recibe siempre
 * el catálogo completo, también los permisos que se agreguen después.
 * Las políticas RLS de la base usan las mismas claves "modulo.accion".
 */
export const PERMISSIONS = {
  // Panel principal
  DASHBOARD_RESUMEN: "dashboard.resumen",

  // Módulo de Inventario
  INVENTARIO_READ: "inventario.read",
  INVENTARIO_CREATE: "inventario.create",
  INVENTARIO_UPDATE: "inventario.update",
  INVENTARIO_DELETE: "inventario.delete",

  // Módulo de Farmacia
  FARMACIA_READ: "farmacia.read",
  FARMACIA_CREATE: "farmacia.create",
  FARMACIA_UPDATE: "farmacia.update",
  FARMACIA_DELETE: "farmacia.delete",
  FARMACIA_PROCESS: "farmacia.process",

  // Módulo de Pacientes y Consultas
  PACIENTES_READ: "pacientes.read",
  PACIENTES_CREATE: "pacientes.create",
  PACIENTES_UPDATE: "pacientes.update",
  PACIENTES_DELETE: "pacientes.delete",

  // Módulo de Brigadas Médicas
  BRIGADAS_READ: "brigadas.read",
  BRIGADAS_CREATE: "brigadas.create",
  BRIGADAS_UPDATE: "brigadas.update",
  BRIGADAS_DELETE: "brigadas.delete",

  // Módulo de Reportes y Analítica
  REPORTES_READ: "reportes.read",
  REPORTES_PROCESS: "reportes.process",

  // Módulo de Usuarios y Perfiles
  USUARIOS_READ: "usuarios.read",
  USUARIOS_CREATE: "usuarios.create",
  USUARIOS_UPDATE: "usuarios.update",
  USUARIOS_DELETE: "usuarios.delete",

  // Roles y permisos (pestaña Roles dentro de Usuarios)
  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",

  // Módulo de Voluntariado
  VOLUNTARIADO_READ: "voluntariado.read",
  VOLUNTARIADO_CREATE: "voluntariado.create",
  VOLUNTARIADO_UPDATE: "voluntariado.update",
  VOLUNTARIADO_DELETE: "voluntariado.delete",

  // Módulo de Donaciones de Ropa
  DONACIONES_READ: "donaciones.read",
  DONACIONES_CREATE: "donaciones.create",
  DONACIONES_UPDATE: "donaciones.update",
  DONACIONES_DELETE: "donaciones.delete",

  // Módulo de Actividades Infantiles
  ACTIVIDADES_READ: "actividades.read",
  ACTIVIDADES_CREATE: "actividades.create",
  ACTIVIDADES_UPDATE: "actividades.update",
  ACTIVIDADES_DELETE: "actividades.delete",

  // Módulo de Ventas y Presupuestos
  VENTAS_READ: "ventas.read",
  VENTAS_CREATE: "ventas.create",
  VENTAS_UPDATE: "ventas.update",
  VENTAS_DELETE: "ventas.delete",

  // Mensajes del formulario de contacto del sitio
  CONTACTO_READ: "contacto.read",
  CONTACTO_UPDATE: "contacto.update",
  CONTACTO_DELETE: "contacto.delete",

  // Ajustes del sistema (menú del usuario → Ajustes)
  AJUSTES_READ: "ajustes.read",
  AJUSTES_UPDATE: "ajustes.update",

  // Módulo de Perfil de Usuario (Permiso Mínimo)
  PERFIL_READ: "perfil.read",
  PERFIL_UPDATE: "perfil.update",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

/** Descarta claves que ya no existen en el catálogo (p. ej. guardadas antes de quitar un permiso). */
export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** Rol tal como lo trae la base, con sus permisos anidados. */
export type RolConPermisos = {
  es_superadmin: boolean;
  rol_permisos?: { permiso: string }[] | null;
};

/**
 * Permisos efectivos de un rol: el superadmin tiene el catálogo completo y todos
 * tienen perfil.read (entrar al panel); igual que tiene_permiso() en la base.
 */
export function resolvePermissions(rol: RolConPermisos | null | undefined): Permission[] {
  if (!rol) return [];
  if (rol.es_superadmin) return [...ALL_PERMISSIONS];
  const propios = (rol.rol_permisos ?? []).map((p) => p.permiso).filter(isPermission);
  return [...new Set<Permission>([PERMISSIONS.PERFIL_READ, ...propios])];
}

/** Permisos que todo rol tiene sin poder quitarlos. */
export const IMPLICIT_PERMISSIONS: readonly Permission[] = [PERMISSIONS.PERFIL_READ];

/* ── ETIQUETAS PARA LA PANTALLA DE ROLES ── */

/** Módulos en el orden en que se muestran en la matriz de permisos. */
export const PERMISSION_MODULES: { id: string; label: string }[] = [
  { id: "dashboard", label: "Panel principal" },
  { id: "pacientes", label: "Atención de Pacientes" },
  { id: "farmacia", label: "Farmacia" },
  { id: "inventario", label: "Inventario Médico" },
  { id: "brigadas", label: "Brigadas" },
  { id: "voluntariado", label: "Voluntariado" },
  { id: "donaciones", label: "Donaciones y Ropa" },
  { id: "actividades", label: "Actividades Infantiles" },
  { id: "ventas", label: "Ventas de Apoyo" },
  { id: "reportes", label: "Reportes y Estadísticas" },
  { id: "contacto", label: "Mensajes de Contacto" },
  { id: "usuarios", label: "Usuarios" },
  { id: "roles", label: "Roles y Permisos" },
  { id: "ajustes", label: "Ajustes" },
  { id: "perfil", label: "Mi Perfil" },
];

/** Acciones con columna propia en la matriz; el resto va en "Otros" con su etiqueta. */
export const STANDARD_ACTIONS = ["read", "create", "update", "delete"] as const;

export const ACTION_LABELS: Record<string, string> = {
  read: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

/** Etiqueta de los permisos que no son ver/crear/editar/eliminar. */
export const SPECIAL_PERMISSION_LABELS: Partial<Record<Permission, string>> = {
  "dashboard.resumen": "Ver resumen general",
  "farmacia.process": "Entregar recetas",
  "reportes.process": "Generar reportes",
};

/** Nombre legible de un permiso, p. ej. "Farmacia · Entregar recetas". */
export function permissionLabel(permission: Permission): string {
  const [modulo, accion] = permission.split(".");
  const moduleLabel = PERMISSION_MODULES.find((m) => m.id === modulo)?.label ?? modulo;
  const actionLabel = SPECIAL_PERMISSION_LABELS[permission] ?? ACTION_LABELS[accion] ?? accion;
  return `${moduleLabel} · ${actionLabel}`;
}

/* ── ACCESO A RUTAS ── */

/**
 * Permiso requerido mínimo para acceder a una ruta de navegación
 */
export const MODULE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  "/administracion": PERMISSIONS.PERFIL_READ,
  "/administracion/perfil": PERMISSIONS.PERFIL_READ,
  "/administracion/usuarios": PERMISSIONS.USUARIOS_READ,
  "/administracion/brigadas": PERMISSIONS.BRIGADAS_READ,
  "/administracion/voluntarios": PERMISSIONS.VOLUNTARIADO_READ,
  "/administracion/inventario": PERMISSIONS.INVENTARIO_READ,
  "/administracion/pacientes": PERMISSIONS.PACIENTES_READ,
  "/administracion/farmacia": PERMISSIONS.FARMACIA_READ,
  "/administracion/donaciones": PERMISSIONS.DONACIONES_READ,
  "/administracion/actividades-infantiles": PERMISSIONS.ACTIVIDADES_READ,
  "/administracion/ventas": PERMISSIONS.VENTAS_READ,
  "/administracion/contacto": PERMISSIONS.CONTACTO_READ,
  "/administracion/ajustes": PERMISSIONS.AJUSTES_READ,
  "/administracion/reportes": [
    PERMISSIONS.REPORTES_READ,
    PERMISSIONS.REPORTES_PROCESS,
  ],
};

/**
 * ¿Los permisos dados abren esta ruta? Las rutas sin entrada propia piden el permiso mínimo (perfil.read).
 */
export function canAccessRoute(permissions: readonly Permission[], pathname: string): boolean {
  const entry = Object.entries(MODULE_PERMISSIONS).find(([route]) =>
    route === "/administracion" ? pathname === "/administracion" : pathname.startsWith(route)
  );
  const required = entry ? entry[1] : PERMISSIONS.PERFIL_READ;
  return (Array.isArray(required) ? required : [required]).some((p) => permissions.includes(p));
}
