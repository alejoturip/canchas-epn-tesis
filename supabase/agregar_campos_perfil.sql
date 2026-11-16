-- ============================================================================
-- Perfil avanzado: campos personales + deportivos.
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ============================================================================

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS apellido    text,
  ADD COLUMN IF NOT EXISTS telefono    text,
  ADD COLUMN IF NOT EXISTS ciudad      text,
  ADD COLUMN IF NOT EXISTS posicion    text,   -- Arquero | Defensa | Mediocampista | Delantero
  ADD COLUMN IF NOT EXISTS nivel_juego text;   -- Principiante | Intermedio | Avanzado
