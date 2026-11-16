-- ============================================================================
-- FIX DE SEGURIDAD (RLS) — CATÁLOGOS que edita el admin.
-- Blinda: canchas, productos_tienda, promociones, sponsors, recompensas_catalogo.
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces (idempotente).
-- ----------------------------------------------------------------------------
-- ¿Por qué? Estas tablas las escribe SOLO el panel admin (crear/editar/borrar),
-- pero quien manda el "candado" real es la base, no el frontend. Si una de estas
-- tablas tuviera el RLS apagado o una política "permitir todo", CUALQUIERA con la
-- anon key (que es pública) podría modificar tus canchas, precios o productos.
--
-- Este script deja en cada tabla EXACTAMENTE 2 reglas:
--   • lectura PÚBLICA  (los clientes ven canchas, productos, promos, sponsors)
--   • escritura SOLO admin (es_admin()) → crear/editar/borrar
-- y borra cualquier política vieja/insegura que hubiera.
--
-- ⚠️ Requiere que exista la función public.es_admin() (ya la usás en torneos).
--    Verificación rápida:  SELECT public.es_admin();
-- ============================================================================

DO $$
DECLARE
  t    text;
  pol  text;
  tablas text[] := ARRAY['canchas','productos_tienda','promociones','sponsors','recompensas_catalogo'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Saltar si la tabla todavía no existe (ej: recompensas_catalogo sin crear)
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabla % no existe, se omite.', t;
      CONTINUE;
    END IF;

    -- 1) Activar RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- 2) Borrar TODAS las políticas existentes (limpia las inseguras desconocidas)
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol, t);
    END LOOP;

    -- 3) Lectura pública
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', t || '_select_publico', t);

    -- 4) Escritura solo admin
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());',
      t || '_admin_rw', t);

    RAISE NOTICE 'OK: % asegurada (lectura pública, escritura solo admin).', t;
  END LOOP;
END $$;

-- ── Verificación (opcional): debe mostrar 2 políticas por tabla ─────────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public'
--   AND tablename IN ('canchas','productos_tienda','promociones','sponsors','recompensas_catalogo')
-- ORDER BY tablename, cmd;
