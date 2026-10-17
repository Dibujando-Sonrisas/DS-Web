"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/lib/auth/permissions";
import { usePermissions } from "./PermissionsProvider";

type CanProps = {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
};

export default function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: CanProps) {
  const { can, canAny, canAll } = usePermissions();

  if (permission && !can(permission)) return fallback;
  if (anyOf && !canAny(anyOf)) return fallback;
  if (allOf && !canAll(allOf)) return fallback;

  return children;
}
