-- ============================================================================
-- DIAGNÓSTICO DE SEGURIDAD (RLS) — SOLO LECTURA, no cambia nada.
-- Correr cada bloque por separado en Supabase > SQL Editor y pegar el resultado.
-- ============================================================================

-- 1) ¿Qué tablas tienen RLS activado?  (rls_activado = false → TABLA ABIERTA = peligro)
SELECT tablename, rowsecurity AS rls_activado
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY rowsecurity ASC, tablename;

-- 2) ¿Qué políticas existen y qué permiten?
SELECT tablename,
       policyname,
       cmd          AS operacion,   -- SELECT/INSERT/UPDATE/DELETE/ALL
       roles,
       qual         AS regla_using, -- condición para leer/usar
       with_check   AS regla_check  -- condición para escribir
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, cmd;

-- 3) ¿Cómo se identifica a un admin? (debe existir perfiles.rol con algún 'admin')
SELECT rol, COUNT(*) AS cuantos
FROM   public.perfiles
GROUP  BY rol;
