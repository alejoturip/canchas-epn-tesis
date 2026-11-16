-- ============================================================================
-- DIAGNÓSTICO RLS — tablas del motor de torneos (SOLO LECTURA, no cambia nada).
-- Ejecutar en Supabase > SQL Editor. Corré cada bloque por separado: el editor
-- muestra solo el resultado del último.
-- ============================================================================

-- 1) ¿RLS habilitado en las 3 tablas nuevas? (relrowsecurity debe ser true)
SELECT relname AS tabla, relrowsecurity AS rls_activado
FROM pg_class
WHERE relname IN ('equipos_torneo','partidos','goleadores_torneo')
ORDER BY relname;

-- 2) Políticas existentes en las tablas nuevas (qué permite cada una)
SELECT tablename AS tabla, policyname AS politica, cmd AS operacion,
       roles, qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE tablename IN ('equipos_torneo','partidos','goleadores_torneo')
ORDER BY tablename, cmd;

-- 3) Verificación de que torneos solo lo escribe el admin
--    (debería NO haber políticas de INSERT/UPDATE/DELETE sin es_admin())
SELECT policyname, cmd, qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE tablename = 'torneos' AND cmd <> 'SELECT'
ORDER BY cmd;
