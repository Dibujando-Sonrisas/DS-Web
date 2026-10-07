import { redirect } from "next/navigation";

// /administracion/ajustes abre la primera sección del menú (AjustesNav)
export default function AjustesPage() {
  redirect("/administracion/ajustes/correos");
}
