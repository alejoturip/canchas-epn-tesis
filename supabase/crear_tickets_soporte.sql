-- ============================================================================
-- TABLA: tickets_soporte  (mensajes que los clientes envían desde /soporte)
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tickets_soporte (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email      text,
  asunto     text NOT NULL,
  mensaje    text NOT NULL,
  estado     text NOT NULL DEFAULT 'abierto',   -- 'abierto' | 'resuelto'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;

-- Cliente autenticado: puede CREAR su propio ticket
DROP POLICY IF EXISTS "tickets_insert_propio" ON public.tickets_soporte;
CREATE POLICY "tickets_insert_propio" ON public.tickets_soporte
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin: puede VER todos los tickets
DROP POLICY IF EXISTS "tickets_admin_select" ON public.tickets_soporte;
CREATE POLICY "tickets_admin_select" ON public.tickets_soporte
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'admin'
  ));

-- Admin: puede ACTUALIZAR el estado (marcar resuelto)
DROP POLICY IF EXISTS "tickets_admin_update" ON public.tickets_soporte;
CREATE POLICY "tickets_admin_update" ON public.tickets_soporte
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'admin'
  ));

-- Índice para ordenar/filtrar por estado y fecha
CREATE INDEX IF NOT EXISTS idx_tickets_soporte_estado_fecha
  ON public.tickets_soporte (estado, created_at DESC);
