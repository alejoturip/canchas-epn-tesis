-- ============================================================================
-- DIAGNÓSTICO: encontrar qué trigger/función usa la columna inexistente "puntos"
-- Ejecutar en Supabase > SQL Editor. Correr cada bloque y pegar el resultado.
-- (Filtramos prokind='f' para evitar el error de funciones de agregación.)
-- ============================================================================

-- 1) Funciones normales cuyo cuerpo menciona "puntos"  ← LO MÁS IMPORTANTE
SELECT p.proname AS funcion,
       pg_get_functiondef(p.oid) AS definicion
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public'
  AND  p.prokind = 'f'
  AND  pg_get_functiondef(p.oid) ILIKE '%puntos%';

-- 2) Triggers sobre reservas / pagos / perfiles (con la función que ejecutan)
SELECT tgrelid::regclass AS tabla,
       tgname            AS trigger,
       p.proname         AS funcion
FROM   pg_trigger t
JOIN   pg_proc p ON p.oid = t.tgfoid
WHERE  NOT t.tgisinternal
  AND  tgrelid IN ('public.reservas'::regclass,
                   'public.pagos'::regclass,
                   'public.perfiles'::regclass);

-- 3) ¿Qué columnas de "puntos" existen en perfiles? (esperado: solo reservas_completadas)
SELECT column_name
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'perfiles'
  AND  column_name IN ('puntos', 'reservas_completadas');
