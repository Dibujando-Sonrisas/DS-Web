"use client";

import { useState, type CSSProperties } from "react";
import styles from "@/styles/pages/admin.module.css";

type UserAvatarProps = {
  avatarUrl?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  size?: number; // size in px
};

/** Iniciales: "Urias Flores" → "UF"; sin nombre, la primera letra del correo. */
function getInitials(nombres?: string | null, apellidos?: string | null, email?: string | null) {
  if (nombres || apellidos) {
    if (nombres && !apellidos) {
      const parts = nombres.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return nombres.trim().charAt(0).toUpperCase();
    }
    const firstInitial = nombres?.trim().charAt(0) || "";
    const lastInitial = apellidos?.trim().charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "U";
  }
  if (email) return email.trim().charAt(0).toUpperCase();
  return "U";
}

export default function UserAvatar({
  avatarUrl,
  nombres,
  apellidos,
  email,
  size = 36,
}: UserAvatarProps) {
  // si la foto no carga, quedan las iniciales
  const [failed, setFailed] = useState(false);
  const initials = getInitials(nombres, apellidos, email);

  return (
    <span className={styles.avatar} style={{ "--size": `${size / 10}rem` } as CSSProperties}>
      {avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={nombres ? `${nombres} ${apellidos || ""}`.trim() : "Avatar de usuario"}
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
