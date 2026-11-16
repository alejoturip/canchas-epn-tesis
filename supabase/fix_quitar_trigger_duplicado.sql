-- ============================================================================
-- FIX: doble notificación al aprobar un pago (dos triggers hacían lo mismo).
-- ----------------------------------------------------------------------------
-- En la tabla pagos había DOS triggers activos:
--   - trg_pago_cambia_estado  → fn_pago_cambia_estado()  (el de la migración, mejor)
--   - trg_procesar_pago       → procesar_pago()          (viejo, duplicado)
-- Dejamos solo el de la migración y eliminamos el duplicado.
-- (Solo se borra el TRIGGER; la función procesar_pago queda inerte, sin daño.)
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_procesar_pago ON public.pagos;

-- Verificación: debe quedar SOLO trg_pago_cambia_estado
SELECT tgname, p.proname AS funcion
FROM   pg_trigger t
JOIN   pg_proc p ON p.oid = t.tgfoid
WHERE  NOT t.tgisinternal
  AND  tgrelid = 'public.pagos'::regclass;
