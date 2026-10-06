// fuera del componente cliente para que también lo usen las páginas del servidor (búsqueda)
export const ESTADOS: Record<string, { label: string; badge: string; siguiente?: string }> = {
  ingresado: { label: "Ingresado", badge: "badgeNeutral", siguiente: "Tomar preclínica" },
  preclinica: { label: "Preclínica", badge: "badgeWarning", siguiente: "Iniciar consulta" },
  consulta: { label: "En consulta", badge: "badgeInfo", siguiente: "Continuar consulta" },
  finalizada: { label: "Finalizada", badge: "badgeSuccess" },
};
