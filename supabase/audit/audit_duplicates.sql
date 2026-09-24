-- SCRIPT DE AUDITORÍA DE REGISTROS DUPLICADOS
-- Propósito: Identificar posibles registros duplicados en los módulos críticos
-- para depuración manual posterior.

-- 1. Auditoría de Inventario (Medicamentos e Insumos)
-- Busca recursos (medicamentos, insumos) que compartan el mismo nombre ignorando mayúsculas.
SELECT 
    UPPER(TRIM(nombre)) as nombre_normalizado,
    COUNT(id) as cantidad_registros,
    ARRAY_AGG(codigo) as codigos_asociados
FROM public.medicamentos
GROUP BY UPPER(TRIM(nombre))
HAVING COUNT(id) > 1
ORDER BY cantidad_registros DESC;

-- 2. Auditoría de Donantes Recurrentes o Duplicados
-- Busca donantes que hayan sido ingresados de forma ligeramente distinta.
SELECT 
    UPPER(TRIM(nombre_donante)) as donante_normalizado,
    COUNT(id) as cantidad_donaciones,
    SUM(cantidad_prendas) as total_aportado
FROM public.donaciones_ropa
WHERE nombre_donante IS NOT NULL AND TRIM(nombre_donante) != ''
GROUP BY UPPER(TRIM(nombre_donante))
HAVING COUNT(id) > 1
ORDER BY cantidad_donaciones DESC;

-- 3. Auditoría de Participantes/Pacientes en Actividades Infantiles
-- Busca pacientes de la misma brigada que hayan recibido más de 2 prendas
SELECT 
    p.id,
    p.nombres,
    p.apellidos,
    p.brigada_id,
    SUM(er.cantidad_prendas) as total_prendas_recibidas
FROM public.pacientes p
JOIN public.entregas_ropa er ON p.id = er.paciente_id
GROUP BY p.id, p.nombres, p.apellidos, p.brigada_id
HAVING SUM(er.cantidad_prendas) > 2;

-- FIN DE AUDITORÍA
