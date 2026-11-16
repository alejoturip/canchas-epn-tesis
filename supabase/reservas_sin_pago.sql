-- ============================================================================
-- reservas_sin_pago.sql — El QR se genera al CONFIRMAR la reserva
-- ----------------------------------------------------------------------------
-- ⚠️ POR QUÉ EXISTE
-- En "La Fija" (app comercial) el QR de acceso lo generaba `fn_pago_cambia_estado()`
-- cuando el admin aprobaba el comprobante de pago. En la versión TESIS **no se
-- cobra**: los escenarios son de la universidad. Al apagar el módulo de pagos,
-- nadie generaba el `acceso_token` → la reserva se quedaba en `pendiente` para
-- siempre y el QR no aparecía nunca.
--
-- Este trigger mueve esa responsabilidad a la reserva misma: cuando el admin la
-- pasa a `confirmada` (botón "Confirmar" en /admin/reservas), se genera el token,
-- se calcula el vencimiento y se le avisa al estudiante. El resto del flujo
-- (escanear en la puerta, marcar jugada) no cambia en nada.
--
-- Idempotente. Correr en Supabase → SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_reserva_confirmada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_cancha text;
BEGIN
  IF NEW.estado <> 'confirmada' OR OLD.estado IS NOT DISTINCT FROM 'confirmada' THEN
    RETURN NEW;
  END IF;

  -- El QR: mismo cálculo que usaba el trigger de pagos. Vence cuando termina el
  -- horario reservado, en hora de Ecuador.
  NEW.acceso_token  := COALESCE(NEW.acceso_token, gen_random_uuid());
  NEW.acceso_expira := COALESCE(
    NEW.acceso_expira,
    (NEW.fecha + NEW.hora_fin) AT TIME ZONE 'America/Guayaquil'
  );

  -- ⚠️ Guarda contra la notificación doble: si esta reserva TIENE un pago, quien
  -- confirmó fue `fn_pago_cambia_estado()`, que ya insertó su propio aviso. Sin
  -- este IF, al reactivar el módulo de pagos el estudiante recibiría dos avisos
  -- por la misma reserva — el mismo bug que hubo en junio con `trg_procesar_pago`.
  IF NOT EXISTS (SELECT 1 FROM public.pagos p WHERE p.reserva_id = NEW.id) THEN
    SELECT nombre INTO v_cancha FROM public.canchas WHERE id = NEW.cancha_id;

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.perfil_id,
      'Reserva confirmada ✅',
      'Tu reserva en ' || COALESCE(v_cancha, 'la cancha') || ' para el '
        || to_char(NEW.fecha, 'DD/MM') || ' a las ' || to_char(NEW.hora_inicio, 'HH24:MI')
        || ' quedó confirmada. Ya podés ver tu QR de acceso.',
      'reserva',
      '/reserva/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_reserva_confirmada ON public.reservas;

CREATE TRIGGER trg_reserva_confirmada
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.fn_reserva_confirmada();

-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- 1) Los triggers de `reservas` (deben ser 5 contando este):
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'public.reservas'::regclass AND NOT tgisinternal ORDER BY tgname;
--   → trg_notif_reserva_cancelada, trg_notif_reserva_creada,
--     trg_notificar_admin_nueva_reserva, trg_reserva_confirmada, trigger_fidelizacion
--
-- 2) Prueba real: reservá con una cuenta de estudiante, confirmala desde
--    /admin/reservas y comprobá que aparece el token:
-- SELECT id, estado, acceso_token, acceso_expira FROM public.reservas
--  ORDER BY created_at DESC LIMIT 3;
--
-- 3) Si algún día se vuelve a prender el módulo de pagos (FEATURES.PAGOS = true),
--    este trigger NO estorba: `fn_pago_cambia_estado` sigue confirmando la reserva
--    y acá el COALESCE respeta el token que aquel ya puso, mientras el IF de arriba
--    evita el aviso duplicado. Los dos caminos conviven.
