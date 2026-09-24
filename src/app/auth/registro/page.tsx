import { Metadata } from "next";
import RegistroForm from "./RegistroForm";

export const metadata: Metadata = {
  title: "Registro de Usuario | Fundación Dibujando Sonrisas",
  description: "Crea una cuenta en el sistema administrativo de la Fundación Dibujando Sonrisas.",
};

export default function RegistroPage() {
  return <RegistroForm />;
}
