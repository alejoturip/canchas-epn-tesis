-- ============================================================================
-- FIX DE SEGURIDAD (RLS) — cierra 3 agujeros de escalación de privilegios.
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- No rompe el flujo normal: reservar, subir comprobante, cancelar, y la
-- aprobación del admin siguen funcionando igual. Los triggers (SECURITY DEFINER)
-- no se ven afectados.
-- ============================================================================

-- ── 1) PAGOS: el usuario solo puede crear/editar pagos en estado 'pendiente' ──
--    (antes podía ponerse estado='aprobado' y auto-confirmar la reserva)
DROP POLICY IF EXISTS pagos_insert ON public.pagos;
CREATE POLICY pagos_insert ON public.pagos
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND estado = 'pendiente');

DROP POLICY IF EXISTS pagos_update_user ON public.pagos;
CREATE POLICY pagos_update_user ON public.pagos
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() AND estado = 'pendiente')
  WITH CHECK (usuario_id = auth.uid() AND estado = 'pendiente');
-- (la política pagos_update_admin, que aprueba/rechaza, queda intacta)

-- ── 2) RESERVAS: el usuario solo crea en 'pendiente' y solo puede CANCELAR ────
--    (antes podía ponerse 'confirmada'/'completada' y fabricarse premios)
DROP POLICY IF EXISTS "Usuarios crean sus reservas" ON public.reservas;
CREATE POLICY "Usuarios crean sus reservas" ON public.reservas
  FOR INSERT
  WITH CHECK ((auth.uid() = perfil_id AND estado = 'pendiente') OR es_admin());

DROP POLICY IF EXISTS "Usuarios actualizan sus reservas" ON public.reservas;
CREATE POLICY "Usuarios actualizan sus reservas" ON public.reservas
  FOR UPDATE
  USING ((auth.uid() = perfil_id) OR es_admin())
  WITH CHECK ((auth.uid() = perfil_id AND estado = 'cancelada') OR es_admin());

-- ── 3) PERFILES: un usuario NO puede cambiarse el rol (anti "hacerse admin") ──
--    RLS no puede comparar el valor viejo vs nuevo, así que se usa un trigger.
CREATE OR REPLACE FUNCTION public.proteger_rol_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si hay un usuario logueado (no es operación de servidor) que NO es admin
  -- e intenta cambiar el rol, se revierte al valor anterior.
  IF auth.uid() IS NOT NULL
     AND NEW.rol IS DISTINCT FROM OLD.rol
     AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin') THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_rol ON public.perfiles;
CREATE TRIGGER trg_proteger_rol
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_rol_perfil();

-- ============================================================================
-- OPCIONAL (privacidad): que los correos/nombres de TODOS no sean visibles
-- para cualquiera. Hoy "Perfiles visibles para todos" deja leer toda la tabla.
-- Esto lo limita a: tu propio perfil o si eres admin. El panel admin sigue
-- funcionando (es_admin). Si notaras que falta un nombre en algún lado del
-- cliente, podés revertir SOLO este bloque.
-- ----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "Perfiles visibles para todos" ON public.perfiles;
-- CREATE POLICY "Perfil propio o admin" ON public.perfiles
--   FOR SELECT USING ((auth.uid() = id) OR es_admin());
