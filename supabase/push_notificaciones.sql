-- ============================================================================
-- PUSH NOTIFICATIONS — avisos que llegan con la app CERRADA (cliente y admin).
-- Ejecutar en Supabase > SQL Editor.
-- ----------------------------------------------------------------------------
-- ⚠️ ESTE ARCHIVO ES LA PLANTILLA (se sube a GitHub) — NO le pongas tus claves.
--    Copialo a `push_notificaciones.local.sql` (git lo ignora), y AHÍ reemplazá
--    los dos placeholders del PASO 4. Ese es el que pegás en el SQL Editor.
--      <TU-PROJECT-REF>   → lo sacás de la URL de Supabase (xxxx.supabase.co)
--      <TU-SERVICE-ROLE-KEY> → Settings > API > service_role (¡es SECRETA!)
--
-- Qué crea:
--   1. Tabla `push_subscriptions` — el "buzón" de cada dispositivo.
--   2. Trigger: avisa a los ADMINS cuando entra una NUEVA RESERVA.
--   3. Trigger: avisa a los ADMINS cuando el cliente SUBE UN COMPROBANTE.
--   4. Trigger: cada fila nueva en `notificaciones` dispara la Edge Function
--      `enviar-push`, que es la que manda el push al celular.
--
-- El aviso al CLIENTE de pago aprobado/rechazado YA existe (lo hace
-- `fn_pago_cambia_estado` en migracion_flujo_pagos.sql): como ese trigger
-- inserta en `notificaciones`, el push le sale gratis con el paso 4.
--
-- Es seguro correrlo varias veces (CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ============================================================================


-- ── PASO 1) Tabla de suscripciones push ─────────────────────────────────────
-- Una fila por DISPOSITIVO (el mismo usuario puede tener celular + compu).
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          bigserial PRIMARY KEY,
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,   -- URL única que da el navegador
  p256dh      text NOT NULL,          -- clave pública del dispositivo
  auth        text NOT NULL,          -- secreto del dispositivo
  user_agent  text,                   -- para saber qué aparato es
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_usuario ON public.push_subscriptions(usuario_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada usuario administra SOLO sus propios dispositivos.
-- (La Edge Function usa la service_role key, que ignora RLS y puede leerlas todas.)
DROP POLICY IF EXISTS "push_subs_select_propias"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_insert_propias"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_delete_propias"  ON public.push_subscriptions;

CREATE POLICY "push_subs_select_propias" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "push_subs_insert_propias" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "push_subs_delete_propias" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = usuario_id);


-- ── PASO 2) Avisar a los ADMINS: NUEVA RESERVA ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notificar_admin_nueva_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- ignora RLS: puede insertar notificaciones para otros
SET search_path = public
AS $$
DECLARE
  v_cancha  text;
  v_cliente text;
BEGIN
  SELECT nombre INTO v_cancha  FROM public.canchas  WHERE id = NEW.cancha_id;
  SELECT nombre INTO v_cliente FROM public.perfiles WHERE id = NEW.perfil_id;

  -- Una notificación para CADA administrador.
  INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  SELECT
    p.id,
    'Nueva reserva 📅',
    COALESCE(v_cliente, 'Un cliente') || ' reservó ' || COALESCE(v_cancha, 'una cancha')
      || ' el ' || to_char(NEW.fecha, 'DD/MM') || ' a las ' || to_char(NEW.hora_inicio, 'HH24:MI') || '.',
    'reserva',
    '/admin/reservas'
  FROM public.perfiles p
  WHERE p.rol = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_admin_nueva_reserva ON public.reservas;

CREATE TRIGGER trg_notificar_admin_nueva_reserva
AFTER INSERT ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.fn_notificar_admin_nueva_reserva();


-- ── PASO 3) Avisar a los ADMINS: COMPROBANTE SUBIDO ─────────────────────────
-- El pago nace 'pendiente' SIN comprobante; el cliente lo sube después.
-- Avisamos justo cuando `comprobante_url` pasa de vacío a tener una imagen.
CREATE OR REPLACE FUNCTION public.fn_notificar_admin_comprobante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente text;
BEGIN
  IF NEW.comprobante_url IS NOT NULL AND OLD.comprobante_url IS DISTINCT FROM NEW.comprobante_url THEN

    SELECT nombre INTO v_cliente FROM public.perfiles WHERE id = NEW.usuario_id;

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    SELECT
      p.id,
      'Comprobante por aprobar 💳',
      COALESCE(v_cliente, 'Un cliente') || ' subió un comprobante de $'
        || to_char(COALESCE(NEW.monto, 0), 'FM999999990.00') || '. Revisalo para confirmar la reserva.',
      'info',
      '/admin/pagos'
    FROM public.perfiles p
    WHERE p.rol = 'admin';

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_admin_comprobante ON public.pagos;

CREATE TRIGGER trg_notificar_admin_comprobante
AFTER UPDATE OF comprobante_url ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.fn_notificar_admin_comprobante();


-- ── PASO 4) Disparar el PUSH ────────────────────────────────────────────────
-- Cada fila nueva en `notificaciones` llama a la Edge Function `enviar-push`,
-- que busca los dispositivos de ese usuario y les manda el aviso.
-- Usa pg_net (HTTP asíncrono desde Postgres).

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.fn_disparar_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- ⚠️⚠️ NO edites este archivo (se sube a GitHub y la key es SECRETA).
  -- Trabajá sobre `push_notificaciones.local.sql`, que git ignora. ⚠️⚠️
  v_url  text := 'https://<TU-PROJECT-REF>.supabase.co/functions/v1/enviar-push';
  v_key  text := '<TU-SERVICE-ROLE-KEY>';
BEGIN
  -- ⚠️ IMPORTANTE: el push va dentro de su propio BEGIN/EXCEPTION.
  -- Si falla (URL mal, Supabase caído, sin internet), el aviso se pierde pero
  -- la RESERVA SE GUARDA IGUAL. Sin esto, un error del push aborta la
  -- transacción entera y el cliente no puede reservar.
  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || v_key
                 ),
      body    := jsonb_build_object('record', to_jsonb(NEW)),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo disparar el push (la notificación igual se guardó): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disparar_push ON public.notificaciones;

CREATE TRIGGER trg_disparar_push
AFTER INSERT ON public.notificaciones
FOR EACH ROW
EXECUTE FUNCTION public.fn_disparar_push();


-- ============================================================================
-- VERIFICACIÓN — debe devolver los 3 triggers nuevos.
-- ============================================================================
SELECT c.relname AS tabla, t.tgname AS trigger
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND t.tgname IN ('trg_notificar_admin_nueva_reserva',
                   'trg_notificar_admin_comprobante',
                   'trg_disparar_push')
ORDER BY 1;

-- ============================================================================
-- PARA PROBAR el push a mano (reemplazá el UUID por el de tu usuario):
--
--   INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
--   VALUES ('TU-USER-UUID', 'Prueba 🔔', 'Si ves esto en el celular, funciona.', 'info', '/');
--
-- Para ver si el HTTP salió bien:
--   SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
-- ============================================================================
