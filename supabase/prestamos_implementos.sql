-- ============================================================================
-- prestamos_implementos.sql — Préstamo de implementos deportivos (VERSIÓN TESIS)
-- ----------------------------------------------------------------------------
-- Reemplaza la lógica de VENTA heredada de "La Fija" por un PRÉSTAMO con
-- devolución, que es lo que corresponde al alcance de la tesis (EPN).
--
-- Modelo:
--   · El préstamo va SIEMPRE atado a una reserva de cancha del propio
--     estudiante. El retiro es al inicio del horario y la devolución al final;
--     por eso no hay campos de fecha propios: se leen de `reservas`.
--   · Flujo:  solicitado → aprobado → prestado → devuelto
--                       ↘ rechazado        (el estudiante puede → cancelado)
--   · El stock de `productos_tienda` se descuenta al ENTREGAR y se repone al
--     DEVOLVER (solo las unidades que efectivamente volvieron).
--   · `productos_tienda.precio` deja de ser precio de venta: pasa a ser el
--     VALOR DE REPOSICIÓN del implemento (referencial, no se cobra nada).
--
-- Idempotente: se puede correr más de una vez sin romper nada.
-- Correr en Supabase → SQL Editor.
-- ============================================================================

-- ── PASO 1: tablas ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prestamos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  reserva_id      uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  estado          text NOT NULL DEFAULT 'solicitado',
  observaciones   text,          -- nota que deja el estudiante al pedir
  motivo_rechazo  text,          -- por qué el admin lo rechazó
  nota_devolucion text,          -- en qué estado volvieron los implementos
  aprobado_at     timestamptz,
  entregado_at    timestamptz,
  devuelto_at     timestamptz,
  atendido_por    uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prestamos_estado_check CHECK (
    estado = ANY (ARRAY['solicitado','aprobado','rechazado','prestado','devuelto','cancelado'])
  )
);

CREATE TABLE IF NOT EXISTS public.prestamo_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id      uuid NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
  producto_id      uuid REFERENCES public.productos_tienda(id) ON DELETE SET NULL,
  nombre           text NOT NULL,                    -- copia: si borran el producto, el historial sobrevive
  valor_reposicion numeric(10,2) NOT NULL DEFAULT 0, -- copia del precio al momento de pedir
  cantidad         integer NOT NULL,
  devueltos        integer NOT NULL DEFAULT 0,       -- cuántas unidades volvieron
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prestamo_items_cantidad_check  CHECK (cantidad > 0),
  CONSTRAINT prestamo_items_devueltos_check CHECK (devueltos >= 0 AND devueltos <= cantidad)
);

CREATE INDEX IF NOT EXISTS idx_prestamos_perfil  ON public.prestamos (perfil_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_reserva ON public.prestamos (reserva_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado  ON public.prestamos (estado);
CREATE INDEX IF NOT EXISTS idx_prestamo_items_prestamo ON public.prestamo_items (prestamo_id);

-- Una sola solicitud viva por reserva (evita pedidos duplicados por error).
CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamos_reserva_activo
  ON public.prestamos (reserva_id)
  WHERE estado IN ('solicitado','aprobado','prestado');

-- ── PASO 2: stock + timestamps al cambiar de estado ─────────────────────────
-- El stock NO se toca al solicitar ni al aprobar: recién al ENTREGAR sale de
-- bodega. Al devolver vuelve solo lo que el admin marcó como devuelto (si un
-- balón se perdió, el stock queda bajo y eso es correcto).

CREATE OR REPLACE FUNCTION public.fn_prestamo_cambia_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  it RECORD;
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  -- ENTREGA: descuenta stock (y frena si no alcanza)
  IF NEW.estado = 'prestado' AND OLD.estado <> 'prestado' THEN
    FOR it IN
      SELECT i.producto_id, i.nombre, i.cantidad
      FROM public.prestamo_items i
      WHERE i.prestamo_id = NEW.id AND i.producto_id IS NOT NULL
    LOOP
      UPDATE public.productos_tienda
      SET stock = stock - it.cantidad
      WHERE id = it.producto_id AND stock >= it.cantidad;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay stock suficiente de "%" para entregar este préstamo.', it.nombre;
      END IF;
    END LOOP;

    NEW.entregado_at := COALESCE(NEW.entregado_at, now());

  -- DEVOLUCIÓN: repone únicamente lo que volvió
  ELSIF NEW.estado = 'devuelto' AND OLD.estado = 'prestado' THEN
    FOR it IN
      SELECT i.producto_id, i.devueltos
      FROM public.prestamo_items i
      WHERE i.prestamo_id = NEW.id AND i.producto_id IS NOT NULL AND i.devueltos > 0
    LOOP
      UPDATE public.productos_tienda
      SET stock = stock + it.devueltos
      WHERE id = it.producto_id;
    END LOOP;

    NEW.devuelto_at := COALESCE(NEW.devuelto_at, now());

  ELSIF NEW.estado = 'aprobado' THEN
    NEW.aprobado_at := COALESCE(NEW.aprobado_at, now());
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prestamo_cambia_estado ON public.prestamos;
CREATE TRIGGER trg_prestamo_cambia_estado
  BEFORE UPDATE ON public.prestamos
  FOR EACH ROW EXECUTE FUNCTION public.fn_prestamo_cambia_estado();

-- ── PASO 3: notificaciones (campana in-app; con PUSH prendido salen al celu) ─
-- Cualquier INSERT en `notificaciones` dispara push si ese módulo está activo,
-- así que acá no hay que hacer nada más.

CREATE OR REPLACE FUNCTION public.fn_prestamo_solicitado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_cliente text;
  v_fecha   date;
BEGIN
  SELECT nombre INTO v_cliente FROM public.perfiles WHERE id = NEW.perfil_id;
  SELECT fecha  INTO v_fecha   FROM public.reservas WHERE id = NEW.reserva_id;

  INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  SELECT
    p.id,
    'Pedido de implementos 🎒',
    COALESCE(v_cliente, 'Un estudiante') || ' pidió implementos para su reserva del '
      || COALESCE(to_char(v_fecha, 'DD/MM'), 'próximo partido') || '.',
    'info',
    '/admin/prestamos'
  FROM public.perfiles p
  WHERE p.rol = 'admin';

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prestamo_solicitado ON public.prestamos;
CREATE TRIGGER trg_prestamo_solicitado
  AFTER INSERT ON public.prestamos
  FOR EACH ROW EXECUTE FUNCTION public.fn_prestamo_solicitado();


CREATE OR REPLACE FUNCTION public.fn_prestamo_avisa_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_titulo  text;
  v_mensaje text;
  v_tipo    text := 'info';
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado = 'aprobado' THEN
    v_titulo  := 'Implementos aprobados ✅';
    v_mensaje := 'Retirá tus implementos en bodega al llegar a la cancha.';
    v_tipo    := 'reserva';
  ELSIF NEW.estado = 'rechazado' THEN
    v_titulo  := 'Pedido de implementos rechazado';
    v_mensaje := COALESCE(NULLIF(NEW.motivo_rechazo, ''), 'No hay disponibilidad para ese horario.');
    v_tipo    := 'cancelada';
  ELSIF NEW.estado = 'prestado' THEN
    v_titulo  := 'Implementos entregados 🎒';
    v_mensaje := 'Acordate de devolverlos al terminar tu horario.';
    v_tipo    := 'reserva';
  ELSIF NEW.estado = 'devuelto' THEN
    v_titulo  := 'Devolución registrada 👍';
    v_mensaje := COALESCE(NULLIF(NEW.nota_devolucion, ''), 'Gracias por devolver todo a tiempo.');
    v_tipo    := 'info';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  VALUES (NEW.perfil_id, v_titulo, v_mensaje, v_tipo, '/tienda');

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_prestamo_avisa_cliente ON public.prestamos;
CREATE TRIGGER trg_prestamo_avisa_cliente
  AFTER UPDATE ON public.prestamos
  FOR EACH ROW EXECUTE FUNCTION public.fn_prestamo_avisa_cliente();

-- ── PASO 4: RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.prestamos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prestamos_select_propio   ON public.prestamos;
DROP POLICY IF EXISTS prestamos_insert_propio   ON public.prestamos;
DROP POLICY IF EXISTS prestamos_cancelar_propio ON public.prestamos;
DROP POLICY IF EXISTS prestamos_admin_rw        ON public.prestamos;

-- El estudiante ve los suyos; el admin ve todo.
CREATE POLICY prestamos_select_propio ON public.prestamos
  FOR SELECT TO authenticated
  USING (perfil_id = auth.uid() OR public.es_admin());

-- Solo puede pedir para SÍ MISMO y sobre una reserva SUYA, y nace 'solicitado'.
CREATE POLICY prestamos_insert_propio ON public.prestamos
  FOR INSERT TO authenticated
  WITH CHECK (
    perfil_id = auth.uid()
    AND estado = 'solicitado'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.perfil_id = auth.uid()
    )
  );

-- Lo único que puede hacer después es cancelarlo, y solo si todavía no lo tocaron.
CREATE POLICY prestamos_cancelar_propio ON public.prestamos
  FOR UPDATE TO authenticated
  USING (perfil_id = auth.uid() AND estado = 'solicitado')
  WITH CHECK (perfil_id = auth.uid() AND estado IN ('solicitado','cancelado'));

CREATE POLICY prestamos_admin_rw ON public.prestamos
  FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());


DROP POLICY IF EXISTS prestamo_items_select_propio ON public.prestamo_items;
DROP POLICY IF EXISTS prestamo_items_insert_propio ON public.prestamo_items;
DROP POLICY IF EXISTS prestamo_items_admin_rw      ON public.prestamo_items;

CREATE POLICY prestamo_items_select_propio ON public.prestamo_items
  FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR EXISTS (SELECT 1 FROM public.prestamos p WHERE p.id = prestamo_id AND p.perfil_id = auth.uid())
  );

-- Solo puede cargar ítems en un préstamo propio que siga 'solicitado'.
CREATE POLICY prestamo_items_insert_propio ON public.prestamo_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND p.perfil_id = auth.uid() AND p.estado = 'solicitado'
    )
  );

CREATE POLICY prestamo_items_admin_rw ON public.prestamo_items
  FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ── PASO 5: realtime ────────────────────────────────────────────────────────

DO $do$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prestamos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

DO $do$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prestamo_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- ── Verificación ────────────────────────────────────────────────────────────
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'public.prestamos'::regclass AND NOT tgisinternal;
--   → trg_prestamo_cambia_estado, trg_prestamo_solicitado, trg_prestamo_avisa_cliente
