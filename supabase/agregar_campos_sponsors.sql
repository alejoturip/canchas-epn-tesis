-- ============================================================================
-- Sponsors: descripción y enlace externo (para las tarjetas pro).
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ============================================================================

ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS enlace      text;   -- URL del sitio/red del sponsor
