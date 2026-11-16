-- ============================================================================
-- LIMPIAR MOVIMIENTO — deja la app "recién estrenada" para un cliente nuevo.
-- Ejecutar en Supabase > SQL Editor (pegar TODO y darle Run).
-- ----------------------------------------------------------------------------
-- QUÉ BORRA (el movimiento del día a día):
--    reservas, pagos, validaciones_acceso (ingresos por QR),
--    notificaciones, premios ganados y tickets de soporte.
--    → El Dashboard queda en CERO: ingresos $0, reservas 0, gráficos vacíos,
--      "Canchas más reservadas" / "Horarios" / "Clientes frecuentes" en blanco.
--
-- QUÉ *NO* TOCA (queda todo cargado y listo para usar):
--    canchas, productos_tienda, promociones, sponsors, recompensas_catalogo,
--    torneos (con sus equipos, partidos y goleadores) y los USUARIOS/perfiles.
--
-- Es SEGURO correrlo varias veces (idempotente) y no falla si a tu BD le
-- faltara alguna de estas tablas.
-- ============================================================================

BEGIN;

-- ── 1) Borrado en orden (respeta las llaves foráneas) ───────────────────────
DO $$
DECLARE
  t text;
  n bigint;
BEGIN
  -- El orden importa: primero lo que APUNTA a reservas, al final reservas.
  FOREACH t IN ARRAY ARRAY[
    'validaciones_acceso',  -- ingresos registrados al escanear el QR
    'pagos',                -- comprobantes y su estado
    'premios',              -- premios ganados por fidelización
    'notificaciones',       -- campanita de los clientes
    'tickets_soporte',      -- mensajes de soporte
    'reservas'              -- las reservas (va al final)
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabla % no existe, se omite.', t;
      CONTINUE;
    END IF;

    EXECUTE format('DELETE FROM public.%I', t);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'Borradas % filas de %', n, t;

    -- Si la tabla usa id autonumérico (int8), lo reinicia para que la
    -- primera reserva nueva sea la #1 y no la #348.
    IF pg_get_serial_sequence('public.' || t, 'id') IS NOT NULL THEN
      EXECUTE format('SELECT setval(%L, 1, false)', pg_get_serial_sequence('public.' || t, 'id'));
    END IF;
  END LOOP;
END $$;

-- ── 2) Fidelización en cero ────────────────────────────────────────────────
-- Los usuarios NO se borran, pero su contador de reservas queda en 0 (si no,
-- alguien tendría "4 reservas completadas" sin ninguna reserva en la BD).
UPDATE public.perfiles
SET reservas_completadas = 0
WHERE reservas_completadas IS DISTINCT FROM 0;

COMMIT;

-- ── 3) Comprobación (debe dar 0 en todo) ───────────────────────────────────
SELECT 'reservas' AS tabla, count(*) AS filas FROM public.reservas
UNION ALL SELECT 'pagos',               count(*) FROM public.pagos
UNION ALL SELECT 'validaciones_acceso', count(*) FROM public.validaciones_acceso
UNION ALL SELECT 'notificaciones',      count(*) FROM public.notificaciones
UNION ALL SELECT 'premios',             count(*) FROM public.premios
UNION ALL SELECT 'canchas (SE QUEDAN)', count(*) FROM public.canchas
UNION ALL SELECT 'perfiles (SE QUEDAN)',count(*) FROM public.perfiles;

-- ============================================================================
-- OPCIONAL — Borrar las IMÁGENES de los comprobantes de pago del Storage.
-- Los archivos que subieron los clientes siguen ocupando espacio en el bucket
-- `comprobantes`. Si querés vaciarlo, descomentá esta línea y corréla aparte:
--
--   DELETE FROM storage.objects WHERE bucket_id = 'comprobantes';
--
-- (También podés hacerlo a mano en Supabase > Storage > comprobantes.)
-- ============================================================================

-- ============================================================================
-- OPCIONAL — Si además querés vaciar los TORNEOS (no lo hace por defecto):
--
--   DELETE FROM public.torneos;   -- arrastra equipos, partidos y goleadores
--
-- Para borrar solo el torneo de ejemplo, usá `borrar_datos_demo.sql`.
-- ============================================================================
