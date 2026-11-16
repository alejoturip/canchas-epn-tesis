-- ============================================================================
-- MIGRACIÓN: Flujo de pagos automático (ejecutar en Supabase > SQL Editor)
-- ----------------------------------------------------------------------------
-- Qué hace:
--   1. Al APROBAR un pago  → la reserva se confirma sola, se genera el QR
--      (acceso_token) con su expiración, y se notifica al cliente.
--   2. Al RECHAZAR un pago → la reserva se cancela (libera el horario)
--      y se notifica al cliente.
--
-- Con esto el admin solo necesita UN click en "Gestión de Pagos".
-- El botón "Confirmar" de Gestión de Reservas ya fue eliminado de la app.
-- Es seguro ejecutarlo varias veces (usa CREATE OR REPLACE / DROP IF EXISTS).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_pago_cambia_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- corre con permisos del dueño: ignora RLS
SET search_path = public
AS $$
BEGIN
  -- ── PAGO APROBADO ─────────────────────────────────────────────────────────
  IF NEW.estado = 'aprobado' AND OLD.estado IS DISTINCT FROM 'aprobado' THEN

    UPDATE public.reservas
    SET estado        = 'confirmada',
        acceso_token  = COALESCE(acceso_token, gen_random_uuid()),
        -- El QR vence cuando termina el horario reservado (hora de Ecuador)
        acceso_expira = (fecha + hora_fin) AT TIME ZONE 'America/Guayaquil'
    WHERE id = NEW.reserva_id
      AND estado = 'pendiente';

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.usuario_id,
      'Pago aprobado ✅',
      'Tu reserva está confirmada. Ya puedes ver tu QR de acceso en el detalle de la reserva.',
      'reserva',
      '/reserva/' || NEW.reserva_id
    );

  END IF;

  -- ── PAGO RECHAZADO ────────────────────────────────────────────────────────
  IF NEW.estado = 'rechazado' AND OLD.estado IS DISTINCT FROM 'rechazado' THEN

    -- Se cancela la reserva pendiente para liberar el horario
    UPDATE public.reservas
    SET estado = 'cancelada'
    WHERE id = NEW.reserva_id
      AND estado = 'pendiente';

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.usuario_id,
      'Pago rechazado ❌',
      'No pudimos validar tu comprobante y el horario fue liberado. Puedes intentar reservar de nuevo.',
      'cancelada',
      '/mis-reservas'
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pago_cambia_estado ON public.pagos;

CREATE TRIGGER trg_pago_cambia_estado
AFTER UPDATE OF estado ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.fn_pago_cambia_estado();

-- ============================================================================
-- VERIFICACIÓN RÁPIDA (opcional): después de ejecutar, esto debe devolver 1 fila
-- ============================================================================
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_pago_cambia_estado';
