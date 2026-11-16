-- ============================================================================
-- verificar_instalacion.sql — ¿Quedó bien montada la base?
-- ----------------------------------------------------------------------------
-- Solo LECTURA: no crea ni modifica nada. Pegalo entero en el SQL Editor y dale
-- Run. Devuelve una fila por cada cosa que tiene que estar, con ✅ o ❌ y, si
-- falla, qué script te falta correr.
--
-- Nota del SQL Editor de Supabase: si pegás varias consultas separadas, solo te
-- muestra el resultado de la última. Por eso esto es UNA sola consulta.
-- ============================================================================

SELECT n, revision, estado, detalle FROM (

  -- ── Paso 2: instalador_completo.sql ──────────────────────────────────────
  SELECT 1 AS n, 'Estructura base (perfiles, canchas, reservas, pagos)' AS revision,
    CASE WHEN to_regclass('public.perfiles') IS NOT NULL
          AND to_regclass('public.canchas')  IS NOT NULL
          AND to_regclass('public.reservas') IS NOT NULL
          AND to_regclass('public.pagos')    IS NOT NULL
      THEN '✅' ELSE '❌' END AS estado,
    'Si falla: instalador_completo.sql' AS detalle

  UNION ALL
  SELECT 2, 'Función es_admin()',
    CASE WHEN to_regprocedure('public.es_admin()') IS NOT NULL THEN '✅' ELSE '❌' END,
    'Si falla: instalador_completo.sql'

  -- ── Paso 3: crear_perfil_al_registrarse.sql ──────────────────────────────
  UNION ALL
  SELECT 3, 'Trigger de alta de perfil (al_registrar_usuario)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'auth.users'::regclass AND tgname = 'al_registrar_usuario')
      THEN '✅' ELSE '❌' END,
    'Si falla: crear_perfil_al_registrarse.sql — SIN ESTO NADIE PUEDE REGISTRARSE'

  -- ── Paso 4: storage_buckets_politicas.sql ────────────────────────────────
  UNION ALL
  SELECT 4, 'Buckets de Storage',
    CASE WHEN (SELECT count(*) FROM storage.buckets
                WHERE id IN ('canchas','productos','promociones','comprobantes','avatars','sponsors')) = 6
      THEN '✅' ELSE '❌' END,
    'Hay ' || (SELECT count(*) FROM storage.buckets
                WHERE id IN ('canchas','productos','promociones','comprobantes','avatars','sponsors'))
           || ' de 6 · Si falla: storage_buckets_politicas.sql'

  UNION ALL
  SELECT 5, 'Buckets marcados como públicos',
    CASE WHEN NOT EXISTS (SELECT 1 FROM storage.buckets
                           WHERE id IN ('canchas','productos','promociones','comprobantes','avatars','sponsors')
                             AND public IS NOT TRUE)
      THEN '✅' ELSE '❌' END,
    'Si falla: Storage → el bucket → Settings → marcar Public'

  UNION ALL
  SELECT 6, 'Permisos de subida (políticas en storage.objects)',
    CASE WHEN (SELECT count(*) FROM pg_policies
                WHERE schemaname = 'storage' AND tablename = 'objects') >= 11
      THEN '✅' ELSE '❌' END,
    'Hay ' || (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
           || ' políticas (se esperan 11+) · Si falla: storage_buckets_politicas.sql'

  -- ── Paso 5: prestamos_implementos.sql ────────────────────────────────────
  UNION ALL
  SELECT 7, 'Tablas de préstamos',
    CASE WHEN to_regclass('public.prestamos') IS NOT NULL
          AND to_regclass('public.prestamo_items') IS NOT NULL
      THEN '✅' ELSE '❌' END,
    'Si falla: prestamos_implementos.sql'

  UNION ALL
  SELECT 8, 'Triggers de préstamos (stock + avisos)',
    CASE WHEN (SELECT count(*) FROM pg_trigger
                WHERE tgrelid = 'public.prestamos'::regclass AND NOT tgisinternal) = 3
      THEN '✅' ELSE '❌' END,
    'Deben ser 3: cambia_estado, solicitado, avisa_cliente · Si falla: prestamos_implementos.sql'

  -- ── Paso 5-bis: reservas_sin_pago.sql ────────────────────────────────────
  UNION ALL
  SELECT 15, 'El QR se genera al confirmar la reserva',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'public.reservas'::regclass AND tgname = 'trg_reserva_confirmada')
      THEN '✅' ELSE '❌' END,
    'Si falla: reservas_sin_pago.sql — SIN ESTO LA RESERVA NUNCA MUESTRA SU QR'

  UNION ALL
  SELECT 16, 'Reglas de reserva (sin precio, 1 hora por día)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'public.reservas'::regclass AND tgname = 'trg_validar_reserva_estudiante')
      THEN '✅' ELSE '❌' END,
    'Si falla: politica_uso_escenarios.sql'

  UNION ALL
  SELECT 17, 'Ausencias y sanciones',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'public.reservas'::regclass AND tgname = 'trg_registrar_ausencia')
      THEN '✅' ELSE '❌' END,
    'Si falla: politica_uso_escenarios.sql'

  UNION ALL
  SELECT 18, 'Bloqueos de horario',
    CASE WHEN to_regclass('public.bloqueos') IS NOT NULL THEN '✅' ELSE '❌' END,
    'Si falla: politica_uso_escenarios.sql'

  UNION ALL
  SELECT 19, 'Perfil académico (facultad / carrera / código)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='perfiles' AND column_name='facultad')
      THEN '✅' ELSE '❌' END,
    'Si falla: politica_uso_escenarios.sql'

  UNION ALL
  SELECT 20, 'Rol guardia habilitado',
    CASE WHEN to_regprocedure('public.es_personal()') IS NOT NULL THEN '✅' ELSE '❌' END,
    'Si falla: rol_guardia_y_sanciones.sql'

  UNION ALL
  SELECT 21, 'Interruptor de sanciones',
    CASE WHEN to_regclass('public.configuracion') IS NOT NULL THEN '✅' ELSE '❌' END,
    CASE WHEN to_regclass('public.configuracion') IS NULL THEN 'Si falla: rol_guardia_y_sanciones.sql'
         ELSE 'Sanciones automáticas: ' ||
              CASE WHEN (SELECT sanciones_activas FROM public.configuracion WHERE id) THEN 'ACTIVAS'
                   ELSE 'apagadas (correcto hasta que haya un guardia escaneando)' END END

  -- ── Paso 7: restringir_registro_epn.sql ──────────────────────────────────
  UNION ALL
  SELECT 9, 'Registro cerrado a @epn.edu.ec',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                       WHERE tgrelid = 'auth.users'::regclass AND tgname = 'validar_correo_institucional')
      THEN '✅' ELSE '❌' END,
    'Si falla: restringir_registro_epn.sql'

  -- ── Tu cuenta ────────────────────────────────────────────────────────────
  UNION ALL
  SELECT 10, 'Hay al menos un administrador',
    CASE WHEN (SELECT count(*) FROM public.perfiles WHERE rol = 'admin') > 0
      THEN '✅' ELSE '❌' END,
    'Admins: ' || (SELECT count(*) FROM public.perfiles WHERE rol = 'admin')
      || ' · Si es 0: UPDATE public.perfiles SET rol=''admin'' WHERE email=''tu@correo.com'';'

  -- ── Trampas conocidas ────────────────────────────────────────────────────
  -- Ojo: lo correcto son DOS triggers en `pagos` — `trg_pago_cambia_estado`
  -- (confirma la reserva y genera el QR) y `trg_notificar_admin_comprobante`
  -- (avisa al admin, vino con el módulo de push). El que NO debe estar es el
  -- viejo `trg_procesar_pago`, que duplicaba notificaciones y reventaba con
  -- "column puntos does not exist". Por eso se busca por nombre y no por cantidad.
  UNION ALL
  SELECT 11, 'Sin el trigger duplicado viejo en pagos',
    CASE WHEN NOT EXISTS (SELECT 1 FROM pg_trigger
                           WHERE tgrelid = 'public.pagos'::regclass
                             AND NOT tgisinternal AND tgname = 'trg_procesar_pago')
      THEN '✅' ELSE '❌' END,
    'Triggers: ' || (SELECT string_agg(tgname, ', ' ORDER BY tgname) FROM pg_trigger
                      WHERE tgrelid = 'public.pagos'::regclass AND NOT tgisinternal)
           || ' · Si aparece trg_procesar_pago → fix_quitar_trigger_duplicado.sql'

  UNION ALL
  SELECT 12, 'RLS activo en las tablas sensibles',
    CASE WHEN NOT EXISTS (SELECT 1 FROM pg_tables
                           WHERE schemaname = 'public'
                             AND tablename IN ('perfiles','reservas','pagos','prestamos','prestamo_items')
                             AND NOT rowsecurity)
      THEN '✅' ELSE '❌' END,
    'Si falla: fix_seguridad_rls.sql'

  -- ── Datos cargados (no es error, es para saber dónde estás parado) ───────
  UNION ALL
  SELECT 13, 'Canchas cargadas',
    CASE WHEN (SELECT count(*) FROM public.canchas) > 0 THEN '✅' ELSE '⚪' END,
    (SELECT count(*) FROM public.canchas)::text || ' · Se cargan desde /admin/canchas'

  UNION ALL
  SELECT 14, 'Implementos cargados',
    CASE WHEN (SELECT count(*) FROM public.productos_tienda) > 0 THEN '✅' ELSE '⚪' END,
    (SELECT count(*) FROM public.productos_tienda)::text || ' · Se cargan desde /admin/productos'

) t ORDER BY n;
