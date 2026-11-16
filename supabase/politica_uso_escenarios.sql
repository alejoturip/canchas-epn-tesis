-- ============================================================================
-- politica_uso_escenarios.sql — TODA la política de uso, en un solo archivo
-- ----------------------------------------------------------------------------
-- ⚠️ REEMPLAZA a tres scripts anteriores que quedaron obsoletos y se borraron:
--    ausencias_y_sanciones.sql · bloqueos_horarios.sql · campos_academicos_perfil.sql
-- Los tres reescribían la MISMA función (`fn_validar_reserva_estudiante`), cada
-- uno sumándole su chequeo. Correrlos en otro orden hacía perder validaciones
-- en silencio. Acá la función se define UNA sola vez, con todo adentro, y no
-- hay orden que respetar.
--
-- QUÉ INSTALA
--   1. Perfil académico:  facultad, carrera, codigo_unico
--   2. Perfil obligatorio: no se puede reservar con el perfil incompleto
--   3. Ausencias:          el que confirma y no viene, acumula falta
--   4. Sanciones:          3 ausencias → 15 días sin reservar
--   5. Bloqueos:           cerrar un escenario por mantenimiento, clases, eventos
--   6. Sin precio:         los escenarios de la universidad no se cobran
--   7. Las reglas de uso:  1 hora por reserva, 1 reserva por día
--
-- Idempotente: se puede correr las veces que haga falta.
-- Correr en Supabase → SQL Editor.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 1 · Perfil académico
-- ----------------------------------------------------------------------------
-- `perfiles` traía de la app comercial dos campos sin sentido en un sistema que
-- cubre básquet, vóley y atletismo: `posicion` ('Arquero', 'Mediocampista'…) y
-- `nivel_juego`. NO se borran (regla del proyecto), solo dejan de usarse.
--
-- `facultad` es el mejor dato del trabajo: habilita medir el uso de escenarios
-- por facultad, que es lo que necesita la unidad de deportes para repartir
-- horarios — y es material directo para el capítulo de resultados.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS facultad     text,
  ADD COLUMN IF NOT EXISTS carrera      text,
  ADD COLUMN IF NOT EXISTS codigo_unico text;

COMMENT ON COLUMN public.perfiles.facultad IS
  'Facultad o escuela. La lista del desplegable está en src/config/institucion.js.';
COMMENT ON COLUMN public.perfiles.codigo_unico IS
  'Código único DECLARADO POR EL ESTUDIANTE. No se valida contra ningún sistema
   de la EPN (no hay API pública y son datos personales: rige la LOPDP). Sirve
   para que el encargado lo contraste con el carné al validar el QR en la puerta.';

CREATE INDEX IF NOT EXISTS idx_perfiles_facultad ON public.perfiles (facultad);

-- ── El código único: 9 dígitos exactos y sin repetir ────────────────────────
-- Ejemplo: 202410216. Si en tu facultad tiene otra longitud, cambiá el 9 acá
-- Y en `CODIGO_UNICO.digitos` de src/config/institucion.js (los dos lugares).

-- Por las dudas, en una re-corrida: lo que no cumpla el formato se vacía, así
-- el CHECK puede crearse. En la primera corrida la columna está vacía.
UPDATE public.perfiles
   SET codigo_unico = NULL
 WHERE codigo_unico IS NOT NULL AND codigo_unico !~ '^[0-9]{9}$';

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_codigo_unico_formato;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_codigo_unico_formato
  CHECK (codigo_unico IS NULL OR codigo_unico ~ '^[0-9]{9}$');

-- Índice ÚNICO: dos estudiantes no pueden declarar el mismo código.
-- Es parcial (WHERE NOT NULL) para que los perfiles todavía sin completar —que
-- lo tienen en NULL— no choquen entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_codigo_unico
  ON public.perfiles (codigo_unico) WHERE codigo_unico IS NOT NULL;

-- ⚠️ NO se ponen como NOT NULL a propósito: el perfil lo crea el trigger
-- `al_registrar_usuario` con solo id/email/nombre, así que un NOT NULL rompería
-- el registro. La obligatoriedad se aplica al RESERVAR (paso 6) y con una
-- pantalla de bienvenida en la app.


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 1-bis · Los escenarios no tienen precio
-- ----------------------------------------------------------------------------
-- `precio_hora` era NOT NULL sin default: al sacar el campo del formulario del
-- admin, crear una cancha fallaba. La columna NO se borra por si algún día la
-- universidad cobra (se reactiva con FEATURES.PAGOS).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.canchas ALTER COLUMN precio_hora SET DEFAULT 0;

-- Las canchas ya cargadas con precio quedan como están. Para ponerlas en cero:
-- UPDATE public.canchas SET precio_hora = 0;


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 2 · Historial de ausencias del estudiante
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS ausencias         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta   date,
  ADD COLUMN IF NOT EXISTS ausencias_totales integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.perfiles.ausencias IS
  'Ausencias desde la última sanción. Se resetea al sancionar.';
COMMENT ON COLUMN public.perfiles.bloqueado_hasta IS
  'Hasta esta fecha (inclusive) no puede crear reservas.';
COMMENT ON COLUMN public.perfiles.ausencias_totales IS
  'Histórico completo, para estadística. Nunca se resetea.';


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 3 · El estado 'ausente'
-- ----------------------------------------------------------------------------
-- Marcarlas así en vez de dejarlas 'confirmada' permite medir cuántas horas de
-- cancha se desperdiciaron.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_estado_check
  CHECK (estado = ANY (ARRAY['pendiente','confirmada','completada','cancelada','ausente']));


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 4 · Bloqueos de horario
-- ----------------------------------------------------------------------------
-- Un escenario no siempre está disponible en su horario semanal: se ocupa para
-- clases de cultura física, mantenimiento o campeonatos.
--   · Mantenimiento:  fechas 10/09 a 14/09, sin horas → esos 5 días cerrado
--   · Clase semanal:  fechas 01/09 a 30/11, 07:00-09:00 → esa franja del período
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bloqueos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id     uuid REFERENCES public.canchas(id) ON DELETE CASCADE,  -- NULL = todos
  fecha_inicio  date NOT NULL,
  fecha_fin     date NOT NULL,
  hora_inicio   time,   -- NULL/NULL = día completo
  hora_fin      time,
  motivo        text NOT NULL,
  creado_por    uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bloqueos_fechas_check CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT bloqueos_horas_check  CHECK (
    (hora_inicio IS NULL AND hora_fin IS NULL) OR
    (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
  )
);

CREATE INDEX IF NOT EXISTS idx_bloqueos_cancha ON public.bloqueos (cancha_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_fechas ON public.bloqueos (fecha_inicio, fecha_fin);

CREATE OR REPLACE FUNCTION public.fn_horario_bloqueado(
  p_cancha_id uuid, p_fecha date, p_hora_inicio time, p_hora_fin time
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT b.motivo
  FROM public.bloqueos b
  WHERE (b.cancha_id IS NULL OR b.cancha_id = p_cancha_id)
    AND p_fecha BETWEEN b.fecha_inicio AND b.fecha_fin
    AND (b.hora_inicio IS NULL
         OR (p_hora_inicio < b.hora_fin AND p_hora_fin > b.hora_inicio))
  LIMIT 1;
$fn$;


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 5 · Detección de ausencias y sanción
-- ----------------------------------------------------------------------------
-- CÓMO SE DETECTA, sin capturar nada nuevo: la reserva está 'confirmada', su
-- `acceso_expira` ya pasó y `ingreso_at` sigue en NULL (nunca se escaneó el QR).
--
-- QUIÉN LA MARCA: "barrido perezoso". No hay tarea programada — pg_cron sería
-- una pieza más que puede fallar en una demostración en vivo. El barrido corre
-- dentro de la validación de una reserva nueva: el dato está al día justo en el
-- momento en que importa. A esta escala son cientos de filas.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_marcar_ausencias()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_marcadas integer;
BEGIN
  UPDATE public.reservas
  SET estado = 'ausente'
  WHERE estado = 'confirmada'
    AND ingreso_at IS NULL
    AND acceso_expira IS NOT NULL
    AND acceso_expira < now();
  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_registrar_ausencia()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  -- ⚙️ LA POLÍTICA, EN DOS NÚMEROS. Para cambiarla, editá esto y volvé a correr
  -- solo este bloque CREATE OR REPLACE: no hay que tocar nada más.
  c_umbral       constant integer := 3;   -- ausencias que disparan la sanción
  c_dias_sancion constant integer := 15;  -- días sin poder reservar

  v_ausencias integer;
  v_hasta     date;
BEGIN
  IF NEW.estado <> 'ausente' OR OLD.estado = 'ausente' THEN
    RETURN NEW;
  END IF;

  UPDATE public.perfiles
  SET ausencias = ausencias + 1, ausencias_totales = ausencias_totales + 1
  WHERE id = NEW.perfil_id
  RETURNING ausencias INTO v_ausencias;

  IF v_ausencias >= c_umbral THEN
    v_hasta := (current_date + c_dias_sancion);

    -- El contador vuelve a cero: la sanción "consume" las faltas. Sin esto, la
    -- sanción se arrastraría para siempre y nunca terminaría de cumplirse.
    UPDATE public.perfiles
    SET bloqueado_hasta = v_hasta, ausencias = 0
    WHERE id = NEW.perfil_id;

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (NEW.perfil_id, 'Reservas suspendidas temporalmente',
      'Acumulaste ' || c_umbral || ' reservas a las que no asististe. No vas a poder reservar hasta el '
        || to_char(v_hasta, 'DD/MM/YYYY')
        || '. Los escenarios son compartidos: si no vas a usar tu turno, cancelalo con tiempo.',
      'cancelada', '/mis-reservas');
  ELSE
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (NEW.perfil_id, 'No asististe a tu reserva',
      'Registramos una ausencia (' || v_ausencias || ' de ' || c_umbral || '). Al llegar a '
        || c_umbral || ' no vas a poder reservar por ' || c_dias_sancion || ' días.',
      'info', '/mis-reservas');
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_registrar_ausencia ON public.reservas;
CREATE TRIGGER trg_registrar_ausencia
  AFTER UPDATE OF estado ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_ausencia();


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 6 · La validación de reservas — TODAS las reglas en una sola función
-- ----------------------------------------------------------------------------
-- Esta es la única definición de `fn_validar_reserva_estudiante`. Si agregás una
-- regla nueva, va acá adentro: no crees otro script que la reescriba.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_validar_reserva_estudiante()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_p        record;
  v_existe   boolean;
  v_cancha   text;
  v_motivo   text;
BEGIN
  -- (0) Barrido perezoso: pone al día las ausencias antes de decidir.
  PERFORM public.fn_marcar_ausencias();

  SELECT nombre, apellido, codigo_unico, facultad, carrera, bloqueado_hasta
    INTO v_p
  FROM public.perfiles WHERE id = NEW.perfil_id;

  -- (1) Perfil completo. Sin esto no se sabe quién entra al escenario ni a qué
  -- facultad imputarle el uso.
  IF v_p.nombre IS NULL OR btrim(v_p.nombre) = ''
     OR v_p.apellido IS NULL OR btrim(v_p.apellido) = ''
     OR v_p.codigo_unico IS NULL OR btrim(v_p.codigo_unico) = ''
     OR v_p.facultad IS NULL OR btrim(v_p.facultad) = ''
     OR v_p.carrera IS NULL OR btrim(v_p.carrera) = '' THEN
    RAISE EXCEPTION 'Completá tu perfil (nombre, apellido, código único de 9 dígitos, facultad y carrera) antes de reservar.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) ¿Está sancionado por ausencias?
  IF v_p.bloqueado_hasta IS NOT NULL AND v_p.bloqueado_hasta >= current_date THEN
    RAISE EXCEPTION 'No podés reservar hasta el %: tenés reservas a las que no asististe.',
      to_char(v_p.bloqueado_hasta, 'DD/MM/YYYY') USING ERRCODE = 'check_violation';
  END IF;

  -- (3) ¿El escenario está cerrado ese día/hora?
  v_motivo := public.fn_horario_bloqueado(NEW.cancha_id, NEW.fecha, NEW.hora_inicio, NEW.hora_fin);
  IF v_motivo IS NOT NULL THEN
    RAISE EXCEPTION 'Ese horario no está disponible: %.', v_motivo
      USING ERRCODE = 'check_violation';
  END IF;

  -- (4) Máximo una hora por reserva.
  IF (NEW.hora_fin - NEW.hora_inicio) > interval '1 hour' THEN
    RAISE EXCEPTION 'Cada reserva puede durar como máximo 1 hora.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.hora_fin <= NEW.hora_inicio THEN
    RAISE EXCEPTION 'El horario de fin debe ser posterior al de inicio.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (5) Una sola reserva viva por día, en CUALQUIER escenario.
  -- Ni las canceladas ni las ausentes cuentan: la ausencia ya se castiga aparte
  -- y bloquear también el día sería sancionar dos veces lo mismo.
  SELECT EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.perfil_id = NEW.perfil_id AND r.fecha = NEW.fecha
      AND r.id IS DISTINCT FROM NEW.id
      AND r.estado = ANY (ARRAY['pendiente','confirmada','completada'])
  ) INTO v_existe;

  IF v_existe THEN
    SELECT c.nombre INTO v_cancha
    FROM public.reservas r JOIN public.canchas c ON c.id = r.cancha_id
    WHERE r.perfil_id = NEW.perfil_id AND r.fecha = NEW.fecha
      AND r.estado = ANY (ARRAY['pendiente','confirmada','completada'])
    LIMIT 1;

    RAISE EXCEPTION 'Ya tenés una reserva para ese día (%). Solo se permite una hora por día por estudiante.',
      COALESCE(v_cancha, 'otra cancha') USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_validar_reserva_estudiante ON public.reservas;
CREATE TRIGGER trg_validar_reserva_estudiante
  BEFORE INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_reserva_estudiante();


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 7 · Permisos
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bloqueos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bloqueos_lectura_publica ON public.bloqueos;
DROP POLICY IF EXISTS bloqueos_admin_rw        ON public.bloqueos;

-- El estudiante los lee para que el calendario le esconda los horarios cerrados.
CREATE POLICY bloqueos_lectura_publica ON public.bloqueos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bloqueos_admin_rw ON public.bloqueos
  FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

DO $do$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bloqueos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;


-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- 1) Los triggers de `reservas` (deben estar los 6):
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'public.reservas'::regclass AND NOT tgisinternal ORDER BY tgname;
--   → trg_notif_reserva_cancelada, trg_notif_reserva_creada,
--     trg_notificar_admin_nueva_reserva, trg_registrar_ausencia,
--     trg_reserva_confirmada, trg_validar_reserva_estudiante, trigger_fidelizacion
--
-- 2) Estado sancionatorio de cada estudiante:
-- SELECT nombre, email, codigo_unico, facultad, ausencias, ausencias_totales, bloqueado_hasta
--   FROM public.perfiles WHERE rol = 'cliente' ORDER BY ausencias_totales DESC;
--
-- 3) Uso de escenarios por facultad (el reporte que le sirve a deportes):
-- SELECT COALESCE(p.facultad,'Sin declarar') AS facultad,
--        count(*) FILTER (WHERE r.estado='completada') AS jugadas,
--        count(*) FILTER (WHERE r.estado='ausente')    AS ausencias,
--        count(*) AS reservas
--   FROM public.reservas r JOIN public.perfiles p ON p.id = r.perfil_id
--  GROUP BY 1 ORDER BY reservas DESC;
--
-- 4) Levantar una sanción a mano (si el estudiante justificó):
-- UPDATE public.perfiles SET bloqueado_hasta = NULL, ausencias = 0
--  WHERE email = 'estudiante@epn.edu.ec';
--
-- 4-bis) ¿Hay códigos repetidos o mal formados? (debe devolver 0 filas)
-- SELECT codigo_unico, count(*) FROM public.perfiles
--  WHERE codigo_unico IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT email, codigo_unico FROM public.perfiles
--  WHERE codigo_unico IS NOT NULL AND codigo_unico !~ '^[0-9]{9}$';
--
-- 5) Un bloqueo de prueba y su borrado:
-- INSERT INTO public.bloqueos (cancha_id, fecha_inicio, fecha_fin, motivo)
-- VALUES (NULL, current_date, current_date + 2, 'Mantenimiento general');
-- DELETE FROM public.bloqueos WHERE motivo = 'Mantenimiento general';
