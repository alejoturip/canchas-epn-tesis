-- ============================================================================
-- Agrega la columna `categoria` (opcional) a productos_tienda, para poder
-- filtrar la tienda por categoría. Ejecutar en Supabase > SQL Editor.
-- Seguro de correr varias veces.
-- ============================================================================
ALTER TABLE public.productos_tienda
  ADD COLUMN IF NOT EXISTS categoria text;
