-- ============================================================================
-- Promociones: columna para destacarlas en la página principal (Home).
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ============================================================================

ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS mostrar_en_inicio boolean NOT NULL DEFAULT false;

-- Índice para que el Home filtre rápido las destacadas
CREATE INDEX IF NOT EXISTS idx_promociones_inicio
  ON public.promociones (mostrar_en_inicio, activa);
