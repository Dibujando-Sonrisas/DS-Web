const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Búsqueda sin tildes ni mayúsculas, palabra por palabra: "jose lopez" encuentra a "José Antonio López". */
export const coincide = (texto: string, busqueda: string) => {
  const t = normalizar(texto);
  return normalizar(busqueda).split(/\s+/).every((palabra) => t.includes(palabra));
};
