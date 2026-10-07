import type { Metadata } from "next";
import RecuperarForm from "./RecuperarForm";

export const metadata: Metadata = {
  title: "Recuperar Contraseña — Dibujando Sonrisas",
  description:
    "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.",
};

export default function RecuperarContrasenaPage() {
  return <RecuperarForm />;
}
