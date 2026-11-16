-- ============================================================================
-- restringir_registro_epn.sql — Solo se registra quien tiene correo @epn.edu.ec
-- ----------------------------------------------------------------------------
-- ⚠️ POR QUÉ ESTE ARCHIVO EXISTE
-- La validación de `Login.jsx` es solo de interfaz: sirve para que el estudiante
-- vea el error antes de mandar el formulario. Cualquiera con la anon key (que
-- viaja en el bundle, es pública por diseño) puede llamar directo a
-- `/auth/v1/signup` con el correo que se le antoje y saltearse esa pantalla.
-- La regla real es este trigger: vive en `auth.users`, así que no hay forma de
-- esquivarlo desde el cliente.
--
-- 🔴 IMPORTANTE — esto NO alcanza solo. En el panel de Supabase hay que:
--    1. Authentication → Providers → **desactivar Google** (y cualquier otro
--       OAuth). Si queda prendido, el endpoint sigue vivo aunque la app ya no
--       muestre el botón: entrarían con Gmail y el trigger los rechazaría con un
--       error feo en vez de no dejarlos ni empezar.
--    2. Authentication → Providers → Email → dejar **"Confirm email"** activo,
--       así se comprueba que el correo institucional es realmente suyo.
--
-- Convive con `crear_perfil_al_registrarse.sql`: este valida ANTES (BEFORE
-- INSERT) y aquel crea el perfil DESPUÉS (AFTER INSERT). Si este aborta, el
-- otro nunca corre y no queda basura en `perfiles`.
--
-- Idempotente. Correr en Supabase → SQL Editor.
-- ============================================================================

-- ── PASO 1: excepciones ─────────────────────────────────────────────────────
-- Para el tribunal, una cuenta de demostración o el admin del sistema, que
-- pueden no tener correo institucional. Se cargan a mano desde el SQL Editor:
--
--   INSERT INTO public.correos_autorizados (email, nota)
--   VALUES ('tribunal@gmail.com', 'Cuenta para la defensa de tesis');
--
CREATE TABLE IF NOT EXISTS public.correos_autorizados (
  email      text PRIMARY KEY,
  nota       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.correos_autorizados ENABLE ROW LEVEL SECURITY;

-- Nadie la lee desde el cliente (sería una lista de correos servida gratis).
-- El trigger la consulta igual porque es SECURITY DEFINER.
DROP POLICY IF EXISTS correos_autorizados_admin_rw ON public.correos_autorizados;
CREATE POLICY correos_autorizados_admin_rw ON public.correos_autorizados
  FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ── PASO 2: la validación ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validar_correo_institucional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_dominio text := 'epn.edu.ec';   -- ⚠️ si lo cambiás, cambiá también src/config/institucion.js
  v_email   text := lower(trim(NEW.email));
BEGIN
  -- Supabase permite usuarios sin correo (teléfono, anónimos). No es el caso
  -- de esta app, pero si algún día lo fuera, no los rompemos.
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  -- El dominio exacto (@epn.edu.ec) o cualquier subdominio (@fis.epn.edu.ec).
  -- El punto del segundo patrón es lo que evita que pase "algoepn.edu.ec".
  IF v_email LIKE '%@' || v_dominio OR v_email LIKE '%.' || v_dominio THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.correos_autorizados c WHERE lower(c.email) = v_email) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Solo se permiten cuentas con correo institucional @%', v_dominio
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS validar_correo_institucional ON auth.users;

CREATE TRIGGER validar_correo_institucional
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validar_correo_institucional();

-- ── OPCIONAL: cerrar también el cambio de correo ────────────────────────────
-- Hoy la app no deja cambiar el correo desde ninguna pantalla (Perfil edita la
-- tabla `perfiles`, no `auth.users`), así que el agujero es teórico. Si querés
-- taparlo igual, descomentá. Ojo: toca el flujo interno de confirmación de
-- cambio de correo de Supabase, así que probalo antes de una demo en vivo.
--
-- DROP TRIGGER IF EXISTS validar_correo_institucional_upd ON auth.users;
-- CREATE TRIGGER validar_correo_institucional_upd
--   BEFORE UPDATE OF email ON auth.users
--   FOR EACH ROW
--   WHEN (NEW.email IS DISTINCT FROM OLD.email)
--   EXECUTE FUNCTION public.validar_correo_institucional();

-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- 1) El trigger quedó puesto (deben salir 2 filas: al_registrar_usuario y este):
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--
-- 2) ¿Qué cuentas YA existen fuera del dominio? Este script NO las toca: solo
--    frena los registros nuevos. Las de antes siguen entrando como si nada.
-- SELECT email, created_at FROM auth.users
--  WHERE email NOT LIKE '%@epn.edu.ec' AND email NOT LIKE '%.epn.edu.ec'
--  ORDER BY created_at;
--
-- 3) Prueba real: intentá registrarte con un @gmail.com. Supabase devuelve un
--    error genérico ("Database error saving new user") porque no propaga el
--    texto de la excepción al cliente — por eso la validación de Login.jsx
--    importa: es la que muestra el mensaje entendible.
