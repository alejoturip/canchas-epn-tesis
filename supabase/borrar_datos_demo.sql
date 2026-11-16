-- ============================================================================
-- BORRAR DATOS DEMO — elimina exactamente lo que insertó `datos_demo.sql`.
-- Ejecutar en Supabase > SQL Editor cuando ya no quieras los datos de ejemplo.
-- Borrar el torneo arrastra (CASCADE) sus equipos, partidos y goleadores.
-- ============================================================================

-- Torneo demo (cascada: equipos_torneo, partidos, goleadores_torneo)
DELETE FROM public.torneos WHERE nombre = 'Copa La Fija - Apertura';

-- Promociones demo
DELETE FROM public.promociones WHERE titulo IN ('2x1 los Martes', 'Copa Apertura abierta', 'Descuento Madrugador');

-- Productos demo
DELETE FROM public.productos_tienda WHERE nombre IN (
  'Agua sin gas 600ml', 'Bebida hidratante', 'Balón de fútbol #5', 'Camiseta La Fija', 'Medias deportivas'
);

-- Canchas demo
DELETE FROM public.canchas WHERE nombre IN (
  'Cancha La Fija — Cumbayá', 'Indoor Sangolquí Pro', 'Estadio Sintético Tumbaco'
);

-- Catálogo de recompensas demo (si existe la tabla)
DO $$
BEGIN
  IF to_regclass('public.recompensas_catalogo') IS NOT NULL THEN
    DELETE FROM public.recompensas_catalogo WHERE titulo IN ('Hora de cancha GRATIS', 'Camiseta La Fija');
  END IF;
END $$;
