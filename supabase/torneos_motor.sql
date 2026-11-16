-- ============================================================================
-- MOTOR DE TORNEOS — tablas, columnas, RLS y realtime.
-- Ejecutar en Supabase > SQL Editor. Seguro de correr varias veces.
-- ----------------------------------------------------------------------------
-- Crea:
--   • equipos_torneo     → equipos inscritos en cada torneo (con capitán)
--   • partidos           → calendario/fixture y resultados (también las llaves)
--   • goleadores_torneo  → tabla de goleadores
-- Agrega a `torneos`: tipo (liga/eliminacion/grupos/relampago), categoría,
--   costo de inscripción, reglas y el equipo campeón.
-- La TABLA DE POSICIONES se calcula en la app a partir de `partidos` jugados.
--
-- ⚙️ Detecta solo el tipo de id de torneos/canchas (int8 o uuid) para que los
--    FOREIGN KEY calcen sin importar cómo creaste esas tablas.
-- ============================================================================

-- (Diagnóstico opcional: muestra el tipo de los id) ---------------------------
-- SELECT table_name, column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND column_name='id'
--     AND table_name IN ('torneos','canchas');

-- ── 1) TABLAS NUEVAS (con tipos de FK auto-detectados) ──────────────────────
DO $$
DECLARE
  t_torneo text;
  t_cancha text;
BEGIN
  SELECT data_type INTO t_torneo FROM information_schema.columns
    WHERE table_schema='public' AND table_name='torneos' AND column_name='id';
  SELECT data_type INTO t_cancha FROM information_schema.columns
    WHERE table_schema='public' AND table_name='canchas' AND column_name='id';

  IF t_torneo IS NULL THEN RAISE EXCEPTION 'No existe la tabla public.torneos'; END IF;
  IF t_cancha IS NULL THEN t_cancha := 'bigint'; END IF;

  -- Equipos inscritos
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.equipos_torneo (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id   %s NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
      nombre      text NOT NULL,
      capitan_id  uuid DEFAULT auth.uid() REFERENCES public.perfiles(id) ON DELETE SET NULL,
      logo_url    text,
      grupo       text,                              -- 'A','B'... para fase de grupos
      estado      text NOT NULL DEFAULT 'inscrito',  -- inscrito | aprobado | rechazado
      pagado      boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  $f$, t_torneo);

  -- Partidos (fixture de liga y también las llaves de eliminación)
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.partidos (
      id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id            %s NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
      equipo_local_id      uuid REFERENCES public.equipos_torneo(id) ON DELETE CASCADE,
      equipo_visitante_id  uuid REFERENCES public.equipos_torneo(id) ON DELETE CASCADE,
      fecha                date,
      hora                 time,
      cancha_id            %s REFERENCES public.canchas(id) ON DELETE SET NULL,
      goles_local          int,
      goles_visitante      int,
      estado               text NOT NULL DEFAULT 'programado', -- programado | jugado | suspendido
      fase                 text NOT NULL DEFAULT 'liga',       -- liga | grupos | octavos | cuartos | semifinal | final | tercer_puesto
      ronda                int NOT NULL DEFAULT 1,             -- nº de jornada o ronda de la llave
      orden                int NOT NULL DEFAULT 1,             -- orden del partido dentro de la ronda
      created_at           timestamptz NOT NULL DEFAULT now()
    );
  $f$, t_torneo, t_cancha);

  -- Goleadores
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.goleadores_torneo (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id   %s NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
      equipo_id   uuid REFERENCES public.equipos_torneo(id) ON DELETE CASCADE,
      nombre      text NOT NULL,
      goles       int NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  $f$, t_torneo);
END $$;

-- índices útiles
CREATE INDEX IF NOT EXISTS idx_equipos_torneo_torneo ON public.equipos_torneo(torneo_id);
CREATE INDEX IF NOT EXISTS idx_partidos_torneo       ON public.partidos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_goleadores_torneo     ON public.goleadores_torneo(torneo_id);

-- ── 2) COLUMNAS NUEVAS EN torneos ───────────────────────────────────────────
ALTER TABLE public.torneos
  ADD COLUMN IF NOT EXISTS tipo              text NOT NULL DEFAULT 'liga',  -- liga | eliminacion | grupos | relampago
  ADD COLUMN IF NOT EXISTS categoria         text,                          -- ej: 'Fútbol 5', 'Femenino'
  ADD COLUMN IF NOT EXISTS costo_inscripcion numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reglas            text,
  ADD COLUMN IF NOT EXISTS campeon_equipo_id uuid REFERENCES public.equipos_torneo(id) ON DELETE SET NULL;

-- ── 3) RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.equipos_torneo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goleadores_torneo ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquiera ve equipos, partidos y goleadores)
DROP POLICY IF EXISTS equipos_select ON public.equipos_torneo;
CREATE POLICY equipos_select ON public.equipos_torneo FOR SELECT USING (true);

DROP POLICY IF EXISTS partidos_select ON public.partidos;
CREATE POLICY partidos_select ON public.partidos FOR SELECT USING (true);

DROP POLICY IF EXISTS goleadores_select ON public.goleadores_torneo;
CREATE POLICY goleadores_select ON public.goleadores_torneo FOR SELECT USING (true);

-- Equipos: el usuario inscribe SU equipo en estado 'inscrito' y sin marcarlo pagado.
-- El admin puede todo (aprobar, asignar grupo, marcar pagado, etc.).
DROP POLICY IF EXISTS equipos_insert ON public.equipos_torneo;
CREATE POLICY equipos_insert ON public.equipos_torneo
  FOR INSERT TO authenticated
  WITH CHECK ((capitan_id = auth.uid() AND estado = 'inscrito' AND pagado = false) OR es_admin());

DROP POLICY IF EXISTS equipos_update ON public.equipos_torneo;
CREATE POLICY equipos_update ON public.equipos_torneo
  FOR UPDATE TO authenticated
  USING ((capitan_id = auth.uid() AND estado = 'inscrito') OR es_admin())
  WITH CHECK ((capitan_id = auth.uid() AND estado = 'inscrito' AND pagado = false) OR es_admin());

DROP POLICY IF EXISTS equipos_delete ON public.equipos_torneo;
CREATE POLICY equipos_delete ON public.equipos_torneo
  FOR DELETE TO authenticated
  USING ((capitan_id = auth.uid() AND estado = 'inscrito') OR es_admin());

-- Partidos y goleadores: SOLO el admin escribe (la lectura ya es pública arriba)
DROP POLICY IF EXISTS partidos_admin ON public.partidos;
CREATE POLICY partidos_admin ON public.partidos
  FOR ALL TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS goleadores_admin ON public.goleadores_torneo;
CREATE POLICY goleadores_admin ON public.goleadores_torneo
  FOR ALL TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

-- ── 4) REALTIME (para que las posiciones/resultados se actualicen solos) ─────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos_torneo;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.goleadores_torneo;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;

-- ============================================================================
-- VERIFICACIÓN (opcional): deben aparecer las 3 tablas nuevas
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema='public'
--    AND table_name IN ('equipos_torneo','partidos','goleadores_torneo');
-- ============================================================================
