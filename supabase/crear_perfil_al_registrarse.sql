-- ============================================================================
-- crear_perfil_al_registrarse.sql
-- ============================================================================
-- ⚠️ OBLIGATORIO AL MONTAR UNA INSTANCIA NUEVA (cliente nuevo, tesis, etc.).
--
-- ¿Por qué existe este archivo?
-- Cuando alguien se registra, la app NO inserta la fila en `perfiles`: da por
-- hecho que ya existe. Mirá src/pages/Login.jsx (~línea 126):
--
--     await supabase.from('perfiles').update({ nombre })...   ← UPDATE, no INSERT
--
-- Esa fila la crea este trigger, que vive en el esquema `auth` (no en `public`).
-- Como `npx supabase db dump` exporta SOLO el esquema `public` por defecto,
-- el instalador NO se lo lleva. Si no corrés este archivo en la base nueva:
--   → el usuario se registra, no se crea su perfil, el UPDATE no afecta filas,
--     queda sin nombre y sin rol, y el login se rompe SIN mensaje de error.
--
-- Rescatado de la base de producción el 2026-08-26 (texto literal, verificado
-- con pg_get_functiondef). Correr en Supabase → SQL Editor.
-- ============================================================================

-- 1) La función: crea el perfil tomando el nombre de los metadatos del signUp.
--    SECURITY DEFINER es imprescindible: sin eso el RLS le bloquea el INSERT.
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  -- Toma el nombre que le mandemos desde React en los metadatos
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nombre', 'cliente');
  RETURN new;
END;
$function$;

-- 2) El trigger sobre auth.users. Todo usuario nuevo nace con rol 'cliente'.
--    Nadie nace admin: el admin se asciende a mano (ver COMO_MONTAR_CLIENTE_NUEVO.md).
DROP TRIGGER IF EXISTS al_registrar_usuario ON auth.users;

CREATE TRIGGER al_registrar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

-- ============================================================================
-- VERIFICAR que quedó bien (debe devolver 1 fila: al_registrar_usuario)
-- ============================================================================
-- SELECT tgname, pg_get_triggerdef(oid)
-- FROM pg_trigger
-- WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--
-- Prueba real: registrate con un correo nuevo y comprobá que aparece la fila
-- en `perfiles` con rol 'cliente'. Si no aparece, este script no corrió.
