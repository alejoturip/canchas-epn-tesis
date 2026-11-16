-- ============================================================================
-- HORARIOS POR CANCHA — el admin define la hora de apertura/cierre y qué días
-- atiende cada cancha. Reemplaza el "8:00–22:00 todos los días" que estaba fijo
-- en el código (se veía poco profesional y permitía reservar a cualquier hora).
-- Ejecutar en Supabase > SQL Editor. Idempotente (seguro de correr varias veces).
-- ----------------------------------------------------------------------------
-- dias_atencion: arreglo de números de día tipo Date.getDay() →
--   0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado.
--   Por defecto atiende todos los días, 08:00 a 22:00 (igual que antes).
-- ============================================================================

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS hora_apertura time        NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS hora_cierre   time        NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS dias_atencion smallint[]  NOT NULL DEFAULT '{0,1,2,3,4,5,6}';

-- (Opcional) Verificación:
-- SELECT nombre, hora_apertura, hora_cierre, dias_atencion FROM public.canchas;
