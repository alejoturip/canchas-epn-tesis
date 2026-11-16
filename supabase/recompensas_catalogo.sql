-- ============================================================================
-- CATÁLOGO DE RECOMPENSAS — premios de fidelidad configurables por el admin.
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ----------------------------------------------------------------------------
-- El cliente, en /premios, verá QUÉ gana al llegar a cada cantidad de reservas
-- (nivel), con su foto, descripción y vigencia. El admin lo gestiona desde la
-- pestaña "Catálogo" en Premios.
-- (Los premios siguen otorgándose solos a las 5 y 12 reservas; esto es lo que
--  el cliente ve como "lo que podés ganar".)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recompensas_catalogo (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel        int NOT NULL,                 -- reservas necesarias (ej: 5, 12, 20)
  titulo       text NOT NULL,
  descripcion  text,
  imagen_url   text,
  fecha_inicio date,
  fecha_fin    date,
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recompensas_catalogo_nivel ON public.recompensas_catalogo(nivel);

-- ── RLS: lectura pública, escritura solo admin ──────────────────────────────
ALTER TABLE public.recompensas_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recompensas_catalogo_select ON public.recompensas_catalogo;
CREATE POLICY recompensas_catalogo_select ON public.recompensas_catalogo
  FOR SELECT USING (true);

DROP POLICY IF EXISTS recompensas_catalogo_admin ON public.recompensas_catalogo;
CREATE POLICY recompensas_catalogo_admin ON public.recompensas_catalogo
  FOR ALL TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

-- ── Realtime (para que el cliente vea los cambios al instante) ──────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.recompensas_catalogo;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
