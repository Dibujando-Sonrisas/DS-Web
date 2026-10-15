"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { canAccessRoute, type Permission } from "@/lib/auth/permissions";
import type { RolResumen } from "@/lib/auth/session";

type PermissionsContextValue = {
  role: RolResumen;
  permissions: readonly Permission[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  /** ¿puede abrir esta ruta del panel? (misma regla que el proxy) */
  canRoute: (pathname: string) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/** Recibe del layout el rol y los permisos ya resueltos en el servidor (getAuthContext). */
export function PermissionsProvider({
  role,
  permissions,
  children,
}: {
  role: RolResumen;
  permissions: Permission[];
  children: ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set(permissions);
    return {
      role,
      permissions,
      can: (permission) => set.has(permission),
      canAny: (perms) => perms.some((p) => set.has(p)),
      canAll: (perms) => perms.every((p) => set.has(p)),
      canRoute: (pathname) => canAccessRoute(permissions, pathname),
    };
  }, [role, permissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider.");
  }
  return ctx;
}
