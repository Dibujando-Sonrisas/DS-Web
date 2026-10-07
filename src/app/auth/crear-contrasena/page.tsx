import type { Metadata } from "next";
import CrearContrasenaForm from "./CrearContrasenaForm";

export const metadata: Metadata = {
  title: "Crear Contraseña — Dibujando Sonrisas",
  description: "Crea la contraseña de tu cuenta de Dibujando Sonrisas.",
};

export default async function CrearContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string | string[] }>;
}) {
  // ?token_hash=... viene del enlace del correo (lib/cuentas.ts)
  const { token_hash } = await searchParams;
  return <CrearContrasenaForm tokenHash={typeof token_hash === "string" ? token_hash : null} />;
}
