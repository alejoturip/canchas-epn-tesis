-- ============================================================================
-- FIX: error "column 'puntos' does not exist" al APROBAR un pago.
-- ----------------------------------------------------------------------------
-- Causa: la función trigger procesar_pago() intentaba hacer
--        UPDATE perfiles SET puntos = ...  (columna que NO existe).
-- Los puntos de fidelización ya los maneja la función actualizar_fidelizacion()
-- cuando una reserva pasa a 'completada' (usa perfiles.reservas_completadas).
-- Solución: redefinir procesar_pago() SIN la línea de puntos.
-- Ejecutar en Supabase > SQL Editor. Es seguro correrlo varias veces.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.procesar_pago()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.estado = 'aprobado' and coalesce(old.estado, '') <> 'aprobado' then
    -- Confirmar reserva + generar QR de acceso único con expiración
    update public.reservas
      set estado        = 'confirmada',
          acceso_token  = coalesce(acceso_token, gen_random_uuid()),
          acceso_expira = (fecha + interval '1 day')
      where id = new.reserva_id;

    -- (Fidelización: la maneja actualizar_fidelizacion() al completar la reserva)

    -- Notificar al cliente
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    values (new.usuario_id, '✅ Pago aprobado',
      'Tu pago fue aprobado y tu reserva está confirmada. ¡Ya tienes tu QR de acceso!',
      'reserva', '/mis-reservas');

  elsif new.estado = 'rechazado' and coalesce(old.estado, '') <> 'rechazado' then
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    values (new.usuario_id, '❌ Pago rechazado',
      'Tu comprobante fue rechazado. Súbelo nuevamente o contacta soporte.',
      'cancelada', '/mis-reservas');
  end if;
  return new;
end; $function$;
