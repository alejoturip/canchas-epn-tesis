-- ============================================================================
-- DATOS DEMO — Llena la app con canchas, productos, promos y un torneo de
-- ejemplo para que se vea VIVA en las reuniones de venta.
-- Ejecutar en Supabase > SQL Editor. Es IDEMPOTENTE (puedes correrlo varias
-- veces, no duplica). Para borrarlo todo: corre `borrar_datos_demo.sql`.
-- ----------------------------------------------------------------------------
-- Las imágenes usan placehold.co (siempre cargan, con los colores de La Fija).
-- Para que se vea aún mejor, después subí fotos reales desde el panel admin.
-- ============================================================================

-- ── 1) CANCHAS (zona Pichincha) ─────────────────────────────────────────────
INSERT INTO public.canchas (nombre, descripcion, precio_hora, activa, imagen_url, direccion, latitud, longitud)
SELECT 'Cancha La Fija — Cumbayá', 'Césped sintético de última generación, iluminación LED y graderío cubierto. Fútbol 7.', 25, true,
       'https://placehold.co/800x500/0c0f10/19C37D?text=La+Fija+Cumbaya', 'Av. Interoceánica, Cumbayá', -0.2059, -78.4264
WHERE NOT EXISTS (SELECT 1 FROM public.canchas WHERE nombre = 'Cancha La Fija — Cumbayá');

INSERT INTO public.canchas (nombre, descripcion, precio_hora, activa, imagen_url, direccion, latitud, longitud)
SELECT 'Indoor Sangolquí Pro', 'Cancha indoor cubierta, ideal para jugar con lluvia o sol. Camerinos y parqueo seguro.', 30, true,
       'https://placehold.co/800x500/0c0f10/4aa3ff?text=Indoor+Sangolqui', 'Av. General Enríquez, Sangolquí', -0.3340, -78.4509
WHERE NOT EXISTS (SELECT 1 FROM public.canchas WHERE nombre = 'Indoor Sangolquí Pro');

INSERT INTO public.canchas (nombre, descripcion, precio_hora, activa, imagen_url, direccion, latitud, longitud)
SELECT 'Estadio Sintético Tumbaco', 'Cancha grande de fútbol 8 con tribuna. Perfecta para torneos y eventos.', 28, true,
       'https://placehold.co/800x500/0c0f10/E9B949?text=Sintetico+Tumbaco', 'Ruta Viva, Tumbaco', -0.2110, -78.4010
WHERE NOT EXISTS (SELECT 1 FROM public.canchas WHERE nombre = 'Estadio Sintético Tumbaco');

-- ── 2) PRODUCTOS DE LA TIENDA ───────────────────────────────────────────────
-- (sin la columna `categoria` para que funcione aunque no hayas corrido
--  agregar_categoria_productos.sql)
INSERT INTO public.productos_tienda (nombre, descripcion, precio, stock, activa, imagen_url)
SELECT 'Agua sin gas 600ml', 'Hidratate antes del partido.', 0.75, 50, true,
       'https://placehold.co/600x600/13181a/9aa3a8?text=Agua'
WHERE NOT EXISTS (SELECT 1 FROM public.productos_tienda WHERE nombre = 'Agua sin gas 600ml');

INSERT INTO public.productos_tienda (nombre, descripcion, precio, stock, activa, imagen_url)
SELECT 'Bebida hidratante', 'Recupera energía con sabor.', 1.50, 40, true,
       'https://placehold.co/600x600/13181a/19C37D?text=Hidratante'
WHERE NOT EXISTS (SELECT 1 FROM public.productos_tienda WHERE nombre = 'Bebida hidratante');

INSERT INTO public.productos_tienda (nombre, descripcion, precio, stock, activa, imagen_url)
SELECT 'Balón de fútbol #5', 'Balón profesional cosido a máquina.', 22.00, 10, true,
       'https://placehold.co/600x600/13181a/E5142A?text=Balon'
WHERE NOT EXISTS (SELECT 1 FROM public.productos_tienda WHERE nombre = 'Balón de fútbol #5');

INSERT INTO public.productos_tienda (nombre, descripcion, precio, stock, activa, imagen_url)
SELECT 'Camiseta La Fija', 'Camiseta oficial, tela deportiva transpirable.', 18.00, 25, true,
       'https://placehold.co/600x600/13181a/E5142A?text=Camiseta'
WHERE NOT EXISTS (SELECT 1 FROM public.productos_tienda WHERE nombre = 'Camiseta La Fija');

INSERT INTO public.productos_tienda (nombre, descripcion, precio, stock, activa, imagen_url)
SELECT 'Medias deportivas', 'Medias largas antideslizantes.', 5.00, 30, true,
       'https://placehold.co/600x600/13181a/4aa3ff?text=Medias'
WHERE NOT EXISTS (SELECT 1 FROM public.productos_tienda WHERE nombre = 'Medias deportivas');

-- ── 3) PROMOCIONES (aparecen en el carrusel del inicio) ─────────────────────
INSERT INTO public.promociones (titulo, descripcion, fecha_inicio, fecha_fin, activa, mostrar_en_inicio, imagen_url)
SELECT '2x1 los Martes', 'Reservá una hora y la segunda va por nuestra cuenta. Solo los martes.', current_date, current_date + 30, true, true,
       'https://placehold.co/1200x500/1a0508/E5142A?text=2x1+los+Martes'
WHERE NOT EXISTS (SELECT 1 FROM public.promociones WHERE titulo = '2x1 los Martes');

INSERT INTO public.promociones (titulo, descripcion, fecha_inicio, fecha_fin, activa, mostrar_en_inicio, imagen_url)
SELECT 'Copa Apertura abierta', 'Inscribí tu equipo en la Copa La Fija. Cupos limitados.', current_date, current_date + 30, true, true,
       'https://placehold.co/1200x500/06140d/19C37D?text=Copa+Apertura'
WHERE NOT EXISTS (SELECT 1 FROM public.promociones WHERE titulo = 'Copa Apertura abierta');

INSERT INTO public.promociones (titulo, descripcion, fecha_inicio, fecha_fin, activa, mostrar_en_inicio, imagen_url)
SELECT 'Descuento Madrugador', '20% de descuento reservando antes de las 9am entre semana.', current_date, current_date + 30, true, true,
       'https://placehold.co/1200x500/0a0f14/4aa3ff?text=Descuento+Madrugador'
WHERE NOT EXISTS (SELECT 1 FROM public.promociones WHERE titulo = 'Descuento Madrugador');

-- ── 4) TORNEO DE EJEMPLO (liga con tabla de posiciones y goleadores) ────────
-- Se crea solo si no existe ya. Usa %TYPE para soportar id int8 o uuid.
DO $$
DECLARE
  v_tid public.torneos.id%TYPE;
  e1 uuid; e2 uuid; e3 uuid; e4 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.torneos WHERE nombre = 'Copa La Fija - Apertura') THEN
    RAISE NOTICE 'El torneo demo ya existe, se omite.';
    RETURN;
  END IF;

  INSERT INTO public.torneos (nombre, descripcion, tipo, categoria, fecha_inicio, max_equipos, costo_inscripcion, premio, reglas, estado)
  VALUES ('Copa La Fija - Apertura',
          'Torneo de ejemplo para mostrar el sistema: tabla de posiciones, calendario y goleadores en vivo.',
          'liga', 'Fútbol 7', current_date - 7, 8, 15,
          'Trofeo + $200 + medallas', 'Partidos de 2 tiempos de 25 min. 3 pts por victoria, 1 por empate.',
          'en_curso')
  RETURNING id INTO v_tid;

  -- Equipos (aprobados y pagados, para que el fixture sea válido)
  INSERT INTO public.equipos_torneo (torneo_id, nombre, estado, pagado) VALUES (v_tid, 'Los Cracks',     'aprobado', true) RETURNING id INTO e1;
  INSERT INTO public.equipos_torneo (torneo_id, nombre, estado, pagado) VALUES (v_tid, 'Real Cumbayá',   'aprobado', true) RETURNING id INTO e2;
  INSERT INTO public.equipos_torneo (torneo_id, nombre, estado, pagado) VALUES (v_tid, 'FC Sangolquí',   'aprobado', true) RETURNING id INTO e3;
  INSERT INTO public.equipos_torneo (torneo_id, nombre, estado, pagado) VALUES (v_tid, 'Atlético Tumbaco','aprobado', true) RETURNING id INTO e4;

  -- Fixture (round-robin). Jornadas 1 y 2 jugadas, jornada 3 programada.
  INSERT INTO public.partidos (torneo_id, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, estado, fase, ronda, orden, fecha) VALUES
    (v_tid, e1, e2, 3, 1,    'jugado',     'liga', 1, 1, current_date - 7),
    (v_tid, e3, e4, 2, 2,    'jugado',     'liga', 1, 2, current_date - 7),
    (v_tid, e1, e3, 2, 0,    'jugado',     'liga', 2, 1, current_date - 3),
    (v_tid, e2, e4, 1, 3,    'jugado',     'liga', 2, 2, current_date - 3),
    (v_tid, e1, e4, NULL, NULL, 'programado', 'liga', 3, 1, current_date + 2),
    (v_tid, e2, e3, NULL, NULL, 'programado', 'liga', 3, 2, current_date + 2);

  -- Goleadores
  INSERT INTO public.goleadores_torneo (torneo_id, equipo_id, nombre, goles) VALUES
    (v_tid, e1, 'Juan Pérez',   4),
    (v_tid, e4, 'Carlos Mera',  3),
    (v_tid, e3, 'Andrés Yépez', 2),
    (v_tid, e1, 'Luis Vaca',    1);

  RAISE NOTICE 'Torneo demo creado con 4 equipos, 6 partidos y goleadores.';
END $$;

-- ── 5) CATÁLOGO DE RECOMPENSAS (solo si ya corriste recompensas_catalogo.sql) ─
DO $$
BEGIN
  IF to_regclass('public.recompensas_catalogo') IS NOT NULL THEN
    INSERT INTO public.recompensas_catalogo (nivel, titulo, descripcion, activa, imagen_url)
    SELECT 5, 'Hora de cancha GRATIS', 'Junta 5 reservas y la 6ta hora va por la casa.', true,
           'https://placehold.co/600x400/0c0f10/19C37D?text=Hora+Gratis'
    WHERE NOT EXISTS (SELECT 1 FROM public.recompensas_catalogo WHERE titulo = 'Hora de cancha GRATIS');

    INSERT INTO public.recompensas_catalogo (nivel, titulo, descripcion, activa, imagen_url)
    SELECT 12, 'Camiseta La Fija', 'A las 12 reservas te llevas la camiseta oficial.', true,
           'https://placehold.co/600x400/0c0f10/E5142A?text=Camiseta'
    WHERE NOT EXISTS (SELECT 1 FROM public.recompensas_catalogo WHERE titulo = 'Camiseta La Fija');
  END IF;
END $$;

-- ============================================================================
-- LISTO. Abrí la app: el inicio muestra canchas + carrusel de promos,
-- /tienda muestra productos, y /torneos muestra la Copa con su tabla.
-- ============================================================================
