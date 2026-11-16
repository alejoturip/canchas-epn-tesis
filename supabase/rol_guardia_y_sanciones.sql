-- ============================================================================
-- rol_guardia_y_sanciones.sql — Rol de guardia + interruptor de sanciones
-- ----------------------------------------------------------------------------
-- DOS COSAS
--
-- 1. ROL `guardia`: la persona que está en la puerta del escenario. Solo puede
--    entrar a escanear el QR (/admin/validar). No ve reservas, ni canchas, ni
--    estudiantes, ni el panel. El admin le crea la cuenta desde la app.
--
-- 2. INTERRUPTOR DE SANCIONES. 🔴 ESTO IMPORTA MÁS DE LO QUE PARECE:
--    la ausencia se detecta porque nadie escaneó el QR. Si todavía NO hay un
--    guardia escaneando, TODAS las reservas quedarían como ausencia y se
--    sancionaría a todo el mundo por algo que no hicieron.
--    Por eso el sistema arranca **APAGADO** (`sanciones_activas = false`) y se
--    prende recién cuando haya alguien validando en la puerta.
--
-- Idempotente. Correr en Supabase → SQL Editor, DESPUÉS de
-- `politica_uso_escenarios.sql`.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 1 · El rol `guardia`
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol = ANY (ARRAY['admin','cliente','guardia']));

-- Para desactivar a un guardia sin borrarle la cuenta (se va de la universidad,
-- cambia de puesto, etc.). Si está en false no puede validar.
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.perfiles.activo IS
  'Solo se usa para el personal (guardias). En false, no puede validar QR.';

/**
 * ¿El usuario actual es personal habilitado (admin o guardia activo)?
 * Se usa en las políticas de las tablas que el guardia necesita tocar.
 * Es SECURITY DEFINER como `es_admin()`, para poder leer `perfiles` sin que el
 * RLS de esa misma tabla lo frene.
 */
CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid()
      AND (rol = 'admin' OR (rol = 'guardia' AND activo))
  );
$fn$;


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 2 · Permisos del guardia
-- ----------------------------------------------------------------------------
-- Las políticas son PERMISIVAS: se suman con OR a las que ya existen. No se
-- toca ninguna política previa; solo se agregan las del guardia.
--
-- El guardia necesita exactamente esto y nada más:
--   · buscar la reserva por su token de acceso
--   · marcar el ingreso (ingreso_at, validado_por)
--   · dejar constancia en validaciones_acceso
--   · ver el nombre y el código del estudiante para contrastar con el carné
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS guardia_ve_reservas      ON public.reservas;
DROP POLICY IF EXISTS guardia_marca_ingreso    ON public.reservas;
DROP POLICY IF EXISTS guardia_ve_perfiles      ON public.perfiles;
DROP POLICY IF EXISTS guardia_registra_validacion ON public.validaciones_acceso;
DROP POLICY IF EXISTS guardia_ve_validaciones  ON public.validaciones_acceso;
DROP POLICY IF EXISTS guardia_ve_canchas       ON public.canchas;

CREATE POLICY guardia_ve_reservas ON public.reservas
  FOR SELECT TO authenticated USING (public.es_personal());

CREATE POLICY guardia_marca_ingreso ON public.reservas
  FOR UPDATE TO authenticated
  USING (public.es_personal()) WITH CHECK (public.es_personal());

CREATE POLICY guardia_ve_perfiles ON public.perfiles
  FOR SELECT TO authenticated USING (public.es_personal());

CREATE POLICY guardia_registra_validacion ON public.validaciones_acceso
  FOR INSERT TO authenticated WITH CHECK (public.es_personal());

CREATE POLICY guardia_ve_validaciones ON public.validaciones_acceso
  FOR SELECT TO authenticated USING (public.es_personal());

CREATE POLICY guardia_ve_canchas ON public.canchas
  FOR SELECT TO authenticated USING (true);


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 3 · Configuración del sistema
-- ----------------------------------------------------------------------------
-- Una sola fila. Antes el umbral y los días eran constantes dentro de la
-- función: para cambiarlos había que reescribir el SQL. Ahora se editan desde
-- el panel del admin.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.configuracion (
  id                 boolean PRIMARY KEY DEFAULT true,
  sanciones_activas  boolean NOT NULL DEFAULT false,
  ausencias_umbral   integer NOT NULL DEFAULT 3,
  dias_sancion       integer NOT NULL DEFAULT 15,
  actualizado_at     timestamptz NOT NULL DEFAULT now(),
  -- Truco para que la tabla no pueda tener más de una fila: la PK solo admite
  -- `true`, así que un segundo INSERT choca contra la clave primaria.
  CONSTRAINT configuracion_fila_unica CHECK (id)
);

COMMENT ON TABLE public.configuracion IS
  'Fila única con los parámetros del sistema. sanciones_activas arranca en FALSE
   a propósito: sin nadie escaneando el QR, todas las reservas se leerían como
   ausencia y se sancionaría a todo el mundo injustamente.';

INSERT INTO public.configuracion (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracion_lectura ON public.configuracion;
DROP POLICY IF EXISTS configuracion_admin   ON public.configuracion;

-- La lee cualquiera con sesión: la app necesita saber si mostrar los avisos.
CREATE POLICY configuracion_lectura ON public.configuracion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY configuracion_admin ON public.configuracion
  FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 4 · Las ausencias respetan el interruptor
-- ----------------------------------------------------------------------------
-- Con `sanciones_activas = false`:
--   · NO se marcan ausencias (las reservas vencidas quedan como estaban)
--   · NO se acumulan faltas ni se sanciona a nadie
-- Un bloqueo puesto A MANO por el admin sigue valiendo igual: es un acto
-- deliberado, no una deducción del sistema.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_marcar_ausencias()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_marcadas integer;
  v_activas  boolean;
BEGIN
  SELECT sanciones_activas INTO v_activas FROM public.configuracion WHERE id;
  IF NOT COALESCE(v_activas, false) THEN
    RETURN 0;   -- sistema apagado: no hay nadie escaneando todavía
  END IF;

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
  v_cfg       record;
  v_ausencias integer;
  v_hasta     date;
BEGIN
  IF NEW.estado <> 'ausente' OR OLD.estado = 'ausente' THEN
    RETURN NEW;
  END IF;

  SELECT sanciones_activas, ausencias_umbral, dias_sancion
    INTO v_cfg FROM public.configuracion WHERE id;

  -- Apagado: se puede marcar la reserva como ausente (queda el dato para la
  -- estadística) pero no se acumula falta ni se sanciona.
  IF NOT COALESCE(v_cfg.sanciones_activas, false) THEN
    RETURN NEW;
  END IF;

  UPDATE public.perfiles
  SET ausencias = ausencias + 1, ausencias_totales = ausencias_totales + 1
  WHERE id = NEW.perfil_id
  RETURNING ausencias INTO v_ausencias;

  IF v_ausencias >= v_cfg.ausencias_umbral THEN
    v_hasta := (current_date + v_cfg.dias_sancion);

    -- El contador vuelve a cero: la sanción "consume" las faltas.
    UPDATE public.perfiles
    SET bloqueado_hasta = v_hasta, ausencias = 0
    WHERE id = NEW.perfil_id;

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (NEW.perfil_id, 'Reservas suspendidas temporalmente',
      'Acumulaste ' || v_cfg.ausencias_umbral || ' reservas a las que no asististe. No vas a poder reservar hasta el '
        || to_char(v_hasta, 'DD/MM/YYYY')
        || '. Los escenarios son compartidos: si no vas a usar tu turno, cancelalo con tiempo.',
      'cancelada', '/mis-reservas');
  ELSE
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (NEW.perfil_id, 'No asististe a tu reserva',
      'Registramos una ausencia (' || v_ausencias || ' de ' || v_cfg.ausencias_umbral || '). Al llegar a '
        || v_cfg.ausencias_umbral || ' no vas a poder reservar por ' || v_cfg.dias_sancion || ' días.',
      'info', '/mis-reservas');
  END IF;

  RETURN NEW;
END;
$fn$;


-- ════════════════════════════════════════════════════════════════════════════
-- PASO 5 · El guardia no es un estudiante
-- ----------------------------------------------------------------------------
-- La validación de reservas exige perfil académico completo (código único,
-- facultad, carrera). Un guardia no tiene nada de eso y tampoco reserva, así
-- que se lo saltea explícitamente por si alguna vez se le crea una reserva.
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
  PERFORM public.fn_marcar_ausencias();

  SELECT nombre, apellido, codigo_unico, facultad, carrera, bloqueado_hasta, rol
    INTO v_p
  FROM public.perfiles WHERE id = NEW.perfil_id;

  -- El personal (admin/guardia) no pasa por las reglas de estudiante.
  IF v_p.rol = ANY (ARRAY['admin','guardia']) THEN
    RETURN NEW;
  END IF;

  -- (1) Perfil completo.
  IF v_p.nombre IS NULL OR btrim(v_p.nombre) = ''
     OR v_p.apellido IS NULL OR btrim(v_p.apellido) = ''
     OR v_p.codigo_unico IS NULL OR btrim(v_p.codigo_unico) = ''
     OR v_p.facultad IS NULL OR btrim(v_p.facultad) = ''
     OR v_p.carrera IS NULL OR btrim(v_p.carrera) = '' THEN
    RAISE EXCEPTION 'Completá tu perfil (nombre, apellido, código único de 9 dígitos, facultad y carrera) antes de reservar.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) Sanción por ausencias. Vale aunque el sistema automático esté apagado:
  -- si hay una fecha cargada, es porque alguien la puso a propósito.
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


-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- 1) La configuración (sanciones_activas debe arrancar en false):
-- SELECT * FROM public.configuracion;
--
-- 2) Prender las sanciones cuando ya haya un guardia escaneando:
-- UPDATE public.configuracion SET sanciones_activas = true, actualizado_at = now();
--    (o desde /admin/usuarios, que es más cómodo)
--
-- 3) El personal cargado:
-- SELECT nombre, email, rol, activo FROM public.perfiles
--  WHERE rol IN ('admin','guardia') ORDER BY rol, nombre;
--
-- 4) Ascender a guardia una cuenta ya creada, a mano:
-- UPDATE public.perfiles SET rol = 'guardia' WHERE email = 'guardia@epn.edu.ec';
--
-- 5) Levantar una sanción:
-- UPDATE public.perfiles SET bloqueado_hasta = NULL, ausencias = 0
--  WHERE email = 'estudiante@epn.edu.ec';
