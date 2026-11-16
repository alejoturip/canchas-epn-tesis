-- ============================================================================
-- NOTIFICACIONES DE TORNEOS (triggers). Ejecutar en Supabase > SQL Editor.
-- Seguro de correr varias veces. Corren con SECURITY DEFINER (ignoran RLS),
-- igual que el trigger de pagos.
--   1) Al cargar el resultado de un partido → avisa a los capitanes.
--   2) Al APROBAR un equipo → avisa al capitán.
-- Requiere haber corrido antes `torneos_motor.sql`.
-- ============================================================================

-- ── 1) Resultado de partido → notifica a ambos capitanes ────────────────────
CREATE OR REPLACE FUNCTION public.fn_partido_notifica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap_local uuid; cap_visit uuid;
  nom_local text; nom_visit text;
  resultado text;
BEGIN
  IF NEW.estado = 'jugado' AND OLD.estado IS DISTINCT FROM 'jugado' THEN
    SELECT capitan_id, nombre INTO cap_local, nom_local FROM public.equipos_torneo WHERE id = NEW.equipo_local_id;
    SELECT capitan_id, nombre INTO cap_visit, nom_visit FROM public.equipos_torneo WHERE id = NEW.equipo_visitante_id;

    resultado := COALESCE(nom_local, '?') || '  ' ||
                 COALESCE(NEW.goles_local::text, '-') || ' - ' || COALESCE(NEW.goles_visitante::text, '-') ||
                 '  ' || COALESCE(nom_visit, '?');

    IF cap_local IS NOT NULL THEN
      INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
      VALUES (cap_local, 'Resultado cargado ⚽', resultado, 'info', '/torneos/' || NEW.torneo_id);
    END IF;
    IF cap_visit IS NOT NULL AND cap_visit IS DISTINCT FROM cap_local THEN
      INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
      VALUES (cap_visit, 'Resultado cargado ⚽', resultado, 'info', '/torneos/' || NEW.torneo_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partido_notifica ON public.partidos;
CREATE TRIGGER trg_partido_notifica
  AFTER UPDATE OF estado ON public.partidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_partido_notifica();

-- ── 2) Equipo aprobado → notifica al capitán ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_equipo_aprobado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_nombre text;
BEGIN
  IF NEW.estado = 'aprobado' AND OLD.estado IS DISTINCT FROM 'aprobado' AND NEW.capitan_id IS NOT NULL THEN
    SELECT nombre INTO t_nombre FROM public.torneos WHERE id = NEW.torneo_id;
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.capitan_id,
      'Equipo aprobado ✅',
      'Tu equipo "' || NEW.nombre || '" fue aprobado en ' || COALESCE(t_nombre, 'el torneo') || '. ¡A jugar!',
      'info',
      '/torneos/' || NEW.torneo_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipo_aprobado ON public.equipos_torneo;
CREATE TRIGGER trg_equipo_aprobado
  AFTER UPDATE OF estado ON public.equipos_torneo
  FOR EACH ROW EXECUTE FUNCTION public.fn_equipo_aprobado();
