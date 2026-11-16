-- ============================================================================
-- VERIFICAR PUSH — corré los bloques DE A UNO en Supabase > SQL Editor.
-- (El editor solo muestra el resultado del ÚLTIMO SELECT, por eso de a uno.)
-- ============================================================================

-- ── CHEQUEO 1) ¿Está todo instalado en la BD? ───────────────────────────────
-- Esperado: 5 filas, todas con estado ✅
SELECT 'tabla push_subscriptions' AS pieza,
       CASE WHEN to_regclass('public.push_subscriptions') IS NOT NULL THEN '✅ existe' ELSE '❌ FALTA (no corriste el SQL)' END AS estado
UNION ALL
SELECT 'extension pg_net',
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN '✅ instalada' ELSE '❌ FALTA' END
UNION ALL
SELECT 'trigger nueva reserva → admin',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notificar_admin_nueva_reserva') THEN '✅ activo' ELSE '❌ FALTA' END
UNION ALL
SELECT 'trigger comprobante → admin',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notificar_admin_comprobante') THEN '✅ activo' ELSE '❌ FALTA' END
UNION ALL
SELECT 'trigger dispara push',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_disparar_push') THEN '✅ activo' ELSE '❌ FALTA' END;


-- ── CHEQUEO 2) ¿Hay algún admin? (si no, nadie recibe los avisos) ───────────
-- SELECT id, nombre, email, rol FROM public.perfiles WHERE rol = 'admin';


-- ── CHEQUEO 3) ¿Se registró tu aparato al tocar "Activar avisos"? ───────────
-- Tiene que aparecer 1 fila por cada navegador/celular donde lo activaste.
-- SELECT s.id, p.nombre, p.rol, left(s.endpoint, 45) || '…' AS endpoint, s.created_at
-- FROM public.push_subscriptions s
-- LEFT JOIN public.perfiles p ON p.id = s.usuario_id
-- ORDER BY s.created_at DESC;


-- ── CHEQUEO 4) PRUEBA DE FUEGO: mandarte un push a vos mismo ────────────────
-- Reemplazá el email por el tuyo (el del usuario donde activaste los avisos).
-- Si todo está bien, en 1-2 segundos te salta la notificación.
--
-- INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
-- SELECT id, 'Prueba 🔔', 'Si ves esto, el push funciona.', 'info', '/'
-- FROM public.perfiles WHERE email = 'TU-EMAIL@gmail.com';


-- ── CHEQUEO 5) ¿Qué contestó la Edge Function? (si no llegó nada) ───────────
-- Corré esto JUSTO DESPUÉS del chequeo 4.
-- SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 3;
--
--   200 + {"enviados":1}      → el push salió bien. Si igual no lo viste, el
--                               problema está en el navegador (permiso/SW).
--   200 + {"enviados":0}      → no hay dispositivos: no activaste los avisos
--                               con ESE usuario, o falló el chequeo 3.
--   401                       → la service_role key del PASO 4 del SQL está mal.
--   404                       → la URL del proyecto está mal escrita.
--   500                       → error dentro de la función: revisá los logs en
--                               Supabase > Edge Functions > enviar-push > Logs
--                               (casi siempre es una llave VAPID mal cargada).
--   (sin filas)               → el trigger trg_disparar_push no se ejecutó, o
--                               pg_net no está instalada.
