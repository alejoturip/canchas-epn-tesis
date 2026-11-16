


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."actualizar_fidelizacion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    puntos_actuales INT;
BEGIN
    -- Solo actuar si el admin cambia el estado de la reserva a 'completada'
    IF NEW.estado = 'completada' AND OLD.estado != 'completada' THEN
        
        -- Sumar 1 punto al perfil del cliente y guardar el nuevo total en la variable
        UPDATE public.perfiles
        SET reservas_completadas = COALESCE(reservas_completadas, 0) + 1
        WHERE id = NEW.perfil_id
        RETURNING reservas_completadas INTO puntos_actuales;

        -- Verificar las reglas para dar premios
        IF puntos_actuales = 5 THEN
            INSERT INTO public.premios (perfil_id, descripcion, tipo, estado_canje)
            VALUES (NEW.perfil_id, 'Gatorade gratis en tu próxima reserva', 'basico', 'pendiente');
        ELSIF puntos_actuales >= 12 THEN
            INSERT INTO public.premios (perfil_id, descripcion, tipo, estado_canje)
            VALUES (NEW.perfil_id, '¡1 Hora de Cancha GRATIS!', 'premium', 'pendiente');

            -- Como ya ganó el premio mayor, le reiniciamos el contador a 0
            UPDATE public.perfiles
            SET reservas_completadas = 0
            WHERE id = NEW.perfil_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."actualizar_fidelizacion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_perfil_usuario"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  -- Toma el nombre que le mandemos desde React en los metadatos
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nombre', 'cliente');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."crear_perfil_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."es_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'
  );
$$;


ALTER FUNCTION "public"."es_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_disparar_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_url  text := 'https://<TU-PROJECT-REF>.supabase.co/functions/v1/enviar-push';
  v_key  text := '<TU-SERVICE-ROLE-KEY>';
BEGIN
  -- El push va en su propio bloque: si explota, se traga el error y sigue.
  BEGIN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || v_key
                 ),
      body    := jsonb_build_object('record', to_jsonb(NEW)),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- La notificación igual queda guardada (se ve en la campanita).
    RAISE WARNING 'No se pudo disparar el push: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_disparar_push"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_equipo_aprobado"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_equipo_aprobado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notificar_admin_comprobante"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_cliente text;
BEGIN
  IF NEW.comprobante_url IS NOT NULL AND OLD.comprobante_url IS DISTINCT FROM NEW.comprobante_url THEN

    SELECT nombre INTO v_cliente FROM public.perfiles WHERE id = NEW.usuario_id;

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    SELECT
      p.id,
      'Comprobante por aprobar 💳',
      COALESCE(v_cliente, 'Un cliente') || ' subió un comprobante de $'
        || to_char(COALESCE(NEW.monto, 0), 'FM999999990.00') || '. Revisalo para confirmar la reserva.',
      'info',
      '/admin/pagos'
    FROM public.perfiles p
    WHERE p.rol = 'admin';

  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."fn_notificar_admin_comprobante"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notificar_admin_nueva_reserva"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cancha  text;
  v_cliente text;
BEGIN
  SELECT nombre INTO v_cancha  FROM public.canchas  WHERE id = NEW.cancha_id;
  SELECT nombre INTO v_cliente FROM public.perfiles WHERE id = NEW.perfil_id;

  -- Una notificación para CADA administrador.
  INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  SELECT
    p.id,
    'Nueva reserva 📅',
    COALESCE(v_cliente, 'Un cliente') || ' reservó ' || COALESCE(v_cancha, 'una cancha')
      || ' el ' || to_char(NEW.fecha, 'DD/MM') || ' a las ' || to_char(NEW.hora_inicio, 'HH24:MI') || '.',
    'reserva',
    '/admin/reservas'
  FROM public.perfiles p
  WHERE p.rol = 'admin';

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_notificar_admin_nueva_reserva"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pago_cambia_estado"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- ── PAGO APROBADO ─────────────────────────────────────────────────────────
  IF NEW.estado = 'aprobado' AND OLD.estado IS DISTINCT FROM 'aprobado' THEN

    UPDATE public.reservas
    SET estado        = 'confirmada',
        acceso_token  = COALESCE(acceso_token, gen_random_uuid()),
        -- El QR vence cuando termina el horario reservado (hora de Ecuador)
        acceso_expira = (fecha + hora_fin) AT TIME ZONE 'America/Guayaquil'
    WHERE id = NEW.reserva_id
      AND estado = 'pendiente';

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.usuario_id,
      'Pago aprobado ✅',
      'Tu reserva está confirmada. Ya puedes ver tu QR de acceso en el detalle de la reserva.',
      'reserva',
      '/reserva/' || NEW.reserva_id
    );

  END IF;

  -- ── PAGO RECHAZADO ────────────────────────────────────────────────────────
  IF NEW.estado = 'rechazado' AND OLD.estado IS DISTINCT FROM 'rechazado' THEN

    -- Se cancela la reserva pendiente para liberar el horario
    UPDATE public.reservas
    SET estado = 'cancelada'
    WHERE id = NEW.reserva_id
      AND estado = 'pendiente';

    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    VALUES (
      NEW.usuario_id,
      'Pago rechazado ❌',
      'No pudimos validar tu comprobante y el horario fue liberado. Puedes intentar reservar de nuevo.',
      'cancelada',
      '/mis-reservas'
    );

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_pago_cambia_estado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_partido_notifica"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_partido_notifica"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_premio"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  values (
    new.perfil_id, '🎁 ¡Premio desbloqueado!',
    coalesce(new.descripcion, 'Has ganado un nuevo premio.'),
    'premio', '/premios'
  );
  return new;
end; $$;


ALTER FUNCTION "public"."notif_premio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_promocion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if coalesce(new.activa, true) then
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    select p.id, '📢 Nueva promoción',
           coalesce(new.titulo, 'Tenemos una nueva promo para ti'), 'promocion', '/'
    from public.perfiles p;
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."notif_promocion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_reserva_cancelada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_cancha text;
begin
  if new.estado = 'cancelada' and coalesce(old.estado, '') <> 'cancelada' then
    select nombre into v_cancha from public.canchas where id = new.cancha_id;
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    values (
      new.perfil_id, 'Reserva cancelada',
      'Tu reserva en ' || coalesce(v_cancha, 'la cancha') || ' del ' || new.fecha || ' fue cancelada.',
      'cancelada', '/mis-reservas'
    );
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."notif_reserva_cancelada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notif_reserva_creada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_cancha text;
begin
  select nombre into v_cancha from public.canchas where id = new.cancha_id;
  insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
  values (
    new.perfil_id, '¡Reserva creada!',
    'Tu reserva en ' || coalesce(v_cancha, 'la cancha') || ' para el ' || new.fecha ||
    ' a las ' || left(new.hora_inicio::text, 5) || ' está pendiente de confirmación.',
    'reserva', '/mis-reservas'
  );
  return new;
end; $$;


ALTER FUNCTION "public"."notif_reserva_creada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."procesar_pago"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.estado = 'aprobado' and coalesce(old.estado, '') <> 'aprobado' then
    -- Confirmar reserva + generar QR de acceso único con expiración
    update public.reservas
      set estado        = 'confirmada',
          acceso_token  = coalesce(acceso_token, gen_random_uuid()),
          acceso_expira = (fecha + interval '1 day')
      where id = new.reserva_id;

    -- (Fidelización: la maneja actualizar_fidelizacion() al completar la reserva)

    -- Notificar al cliente
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    values (new.usuario_id, '✅ Pago aprobado',
      'Tu pago fue aprobado y tu reserva está confirmada. ¡Ya tienes tu QR de acceso!',
      'reserva', '/mis-reservas');

  elsif new.estado = 'rechazado' and coalesce(old.estado, '') <> 'rechazado' then
    insert into public.notificaciones (usuario_id, titulo, mensaje, tipo, enlace)
    values (new.usuario_id, '❌ Pago rechazado',
      'Tu comprobante fue rechazado. Súbelo nuevamente o contacta soporte.',
      'cancelada', '/mis-reservas');
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."procesar_pago"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proteger_rol_perfil"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Si hay un usuario logueado (no es operación de servidor) que NO es admin
  -- e intenta cambiar el rol, se revierte al valor anterior.
  IF auth.uid() IS NOT NULL
     AND NEW.rol IS DISTINCT FROM OLD.rol
     AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin') THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."proteger_rol_perfil"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."canchas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "precio_hora" numeric(10,2) NOT NULL,
    "imagen_url" "text",
    "activa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "direccion" "text",
    "latitud" double precision,
    "longitud" double precision,
    "hora_apertura" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "hora_cierre" time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
    "dias_atencion" smallint[] DEFAULT '{0,1,2,3,4,5,6}'::smallint[] NOT NULL
);


ALTER TABLE "public"."canchas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipos_torneo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "torneo_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "capitan_id" "uuid" DEFAULT "auth"."uid"(),
    "logo_url" "text",
    "grupo" "text",
    "estado" "text" DEFAULT 'inscrito'::"text" NOT NULL,
    "pagado" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipos_torneo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goleadores_torneo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "torneo_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "nombre" "text" NOT NULL,
    "goles" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."goleadores_torneo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inscripciones_torneos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "torneo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inscripciones_torneos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificaciones" (
    "id" bigint NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensaje" "text",
    "tipo" "text" DEFAULT 'info'::"text" NOT NULL,
    "enlace" "text",
    "leida" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notificaciones" OWNER TO "postgres";


ALTER TABLE "public"."notificaciones" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notificaciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id" bigint NOT NULL,
    "reserva_id" "uuid",
    "usuario_id" "uuid" NOT NULL,
    "monto" numeric(10,2) NOT NULL,
    "metodo_pago" "text",
    "comprobante_url" "text",
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


ALTER TABLE "public"."pagos" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pagos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."partidos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "torneo_id" "uuid" NOT NULL,
    "equipo_local_id" "uuid",
    "equipo_visitante_id" "uuid",
    "fecha" "date",
    "hora" time without time zone,
    "cancha_id" "uuid",
    "goles_local" integer,
    "goles_visitante" integer,
    "estado" "text" DEFAULT 'programado'::"text" NOT NULL,
    "fase" "text" DEFAULT 'liga'::"text" NOT NULL,
    "ronda" integer DEFAULT 1 NOT NULL,
    "orden" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfiles" (
    "id" "uuid" NOT NULL,
    "nombre" "text",
    "email" "text",
    "avatar_url" "text",
    "rol" "text" DEFAULT 'cliente'::"text",
    "reservas_completadas" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "apellido" "text",
    "telefono" "text",
    "ciudad" "text",
    "posicion" "text",
    "nivel_juego" "text",
    CONSTRAINT "perfiles_rol_check" CHECK (("rol" = ANY (ARRAY['admin'::"text", 'cliente'::"text"])))
);


ALTER TABLE "public"."perfiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."premios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_id" "uuid" NOT NULL,
    "descripcion" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "estado_canje" "text" DEFAULT 'pendiente'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "premios_estado_canje_check" CHECK (("estado_canje" = ANY (ARRAY['pendiente'::"text", 'canjeado'::"text"])))
);


ALTER TABLE "public"."premios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."productos_tienda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "precio" numeric(10,2) NOT NULL,
    "imagen_url" "text",
    "stock" integer DEFAULT 0,
    "activa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "categoria" "text"
);


ALTER TABLE "public"."productos_tienda" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promociones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "imagen_url" "text",
    "activa" boolean DEFAULT true,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "mostrar_en_inicio" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."promociones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" bigint NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."push_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."push_subscriptions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."push_subscriptions_id_seq" OWNED BY "public"."push_subscriptions"."id";



CREATE TABLE IF NOT EXISTS "public"."recompensas_catalogo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nivel" integer NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "imagen_url" "text",
    "fecha_inicio" "date",
    "fecha_fin" "date",
    "activa" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recompensas_catalogo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_id" "uuid" NOT NULL,
    "cancha_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "hora_inicio" time without time zone NOT NULL,
    "hora_fin" time without time zone NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "acceso_token" "uuid",
    "acceso_expira" timestamp with time zone,
    "ingreso_at" timestamp with time zone,
    "validado_por" "uuid",
    CONSTRAINT "reservas_estado_check" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'confirmada'::"text", 'completada'::"text", 'cancelada'::"text"])))
);


ALTER TABLE "public"."reservas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text",
    "imagen_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "descripcion" "text",
    "enlace" "text"
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets_soporte" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "asunto" "text" NOT NULL,
    "mensaje" "text" NOT NULL,
    "estado" "text" DEFAULT 'abierto'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tickets_soporte" OWNER TO "postgres";


ALTER TABLE "public"."tickets_soporte" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."tickets_soporte_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."torneos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "fecha_inicio" "date",
    "max_equipos" integer,
    "premio" "text",
    "estado" "text" DEFAULT 'abierto'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tipo" "text" DEFAULT 'liga'::"text" NOT NULL,
    "categoria" "text",
    "costo_inscripcion" numeric(10,2) DEFAULT 0 NOT NULL,
    "reglas" "text",
    "campeon_equipo_id" "uuid",
    CONSTRAINT "torneos_estado_check" CHECK (("estado" = ANY (ARRAY['abierto'::"text", 'en_curso'::"text", 'finalizado'::"text"])))
);


ALTER TABLE "public"."torneos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."validaciones_acceso" (
    "id" bigint NOT NULL,
    "reserva_id" "uuid",
    "validado_por" "uuid",
    "estado_final" "text",
    "ingreso_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."validaciones_acceso" OWNER TO "postgres";


ALTER TABLE "public"."validaciones_acceso" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."validaciones_acceso_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."push_subscriptions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."push_subscriptions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."canchas"
    ADD CONSTRAINT "canchas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipos_torneo"
    ADD CONSTRAINT "equipos_torneo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goleadores_torneo"
    ADD CONSTRAINT "goleadores_torneo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inscripciones_torneos"
    ADD CONSTRAINT "inscripciones_torneos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inscripciones_torneos"
    ADD CONSTRAINT "inscripciones_torneos_torneo_id_user_id_key" UNIQUE ("torneo_id", "user_id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."premios"
    ADD CONSTRAINT "premios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_tienda"
    ADD CONSTRAINT "productos_tienda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promociones"
    ADD CONSTRAINT "promociones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recompensas_catalogo"
    ADD CONSTRAINT "recompensas_catalogo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservas"
    ADD CONSTRAINT "reservas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets_soporte"
    ADD CONSTRAINT "tickets_soporte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."torneos"
    ADD CONSTRAINT "torneos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."validaciones_acceso"
    ADD CONSTRAINT "validaciones_acceso_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_equipos_torneo_torneo" ON "public"."equipos_torneo" USING "btree" ("torneo_id");



CREATE INDEX "idx_goleadores_torneo" ON "public"."goleadores_torneo" USING "btree" ("torneo_id");



CREATE INDEX "idx_notif_usuario" ON "public"."notificaciones" USING "btree" ("usuario_id", "created_at" DESC);



CREATE INDEX "idx_pagos_estado" ON "public"."pagos" USING "btree" ("estado", "created_at" DESC);



CREATE INDEX "idx_pagos_usuario" ON "public"."pagos" USING "btree" ("usuario_id");



CREATE INDEX "idx_partidos_torneo" ON "public"."partidos" USING "btree" ("torneo_id");



CREATE INDEX "idx_promociones_inicio" ON "public"."promociones" USING "btree" ("mostrar_en_inicio", "activa");



CREATE INDEX "idx_push_subs_usuario" ON "public"."push_subscriptions" USING "btree" ("usuario_id");



CREATE INDEX "idx_recompensas_catalogo_nivel" ON "public"."recompensas_catalogo" USING "btree" ("nivel");



CREATE INDEX "idx_tickets_soporte_estado_fecha" ON "public"."tickets_soporte" USING "btree" ("estado", "created_at" DESC);



CREATE OR REPLACE TRIGGER "trg_disparar_push" AFTER INSERT ON "public"."notificaciones" FOR EACH ROW EXECUTE FUNCTION "public"."fn_disparar_push"();



CREATE OR REPLACE TRIGGER "trg_equipo_aprobado" AFTER UPDATE OF "estado" ON "public"."equipos_torneo" FOR EACH ROW EXECUTE FUNCTION "public"."fn_equipo_aprobado"();



CREATE OR REPLACE TRIGGER "trg_notif_premio" AFTER INSERT ON "public"."premios" FOR EACH ROW EXECUTE FUNCTION "public"."notif_premio"();



CREATE OR REPLACE TRIGGER "trg_notif_promocion" AFTER INSERT ON "public"."promociones" FOR EACH ROW EXECUTE FUNCTION "public"."notif_promocion"();



CREATE OR REPLACE TRIGGER "trg_notif_reserva_cancelada" AFTER UPDATE ON "public"."reservas" FOR EACH ROW EXECUTE FUNCTION "public"."notif_reserva_cancelada"();



CREATE OR REPLACE TRIGGER "trg_notif_reserva_creada" AFTER INSERT ON "public"."reservas" FOR EACH ROW EXECUTE FUNCTION "public"."notif_reserva_creada"();



CREATE OR REPLACE TRIGGER "trg_notificar_admin_comprobante" AFTER UPDATE OF "comprobante_url" ON "public"."pagos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_notificar_admin_comprobante"();



CREATE OR REPLACE TRIGGER "trg_notificar_admin_nueva_reserva" AFTER INSERT ON "public"."reservas" FOR EACH ROW EXECUTE FUNCTION "public"."fn_notificar_admin_nueva_reserva"();



CREATE OR REPLACE TRIGGER "trg_pago_cambia_estado" AFTER UPDATE OF "estado" ON "public"."pagos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_pago_cambia_estado"();



CREATE OR REPLACE TRIGGER "trg_partido_notifica" AFTER UPDATE OF "estado" ON "public"."partidos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_partido_notifica"();



CREATE OR REPLACE TRIGGER "trg_proteger_rol" BEFORE UPDATE ON "public"."perfiles" FOR EACH ROW EXECUTE FUNCTION "public"."proteger_rol_perfil"();



CREATE OR REPLACE TRIGGER "trigger_fidelizacion" AFTER UPDATE ON "public"."reservas" FOR EACH ROW EXECUTE FUNCTION "public"."actualizar_fidelizacion"();



ALTER TABLE ONLY "public"."equipos_torneo"
    ADD CONSTRAINT "equipos_torneo_capitan_id_fkey" FOREIGN KEY ("capitan_id") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipos_torneo"
    ADD CONSTRAINT "equipos_torneo_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goleadores_torneo"
    ADD CONSTRAINT "goleadores_torneo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos_torneo"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goleadores_torneo"
    ADD CONSTRAINT "goleadores_torneo_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inscripciones_torneos"
    ADD CONSTRAINT "inscripciones_torneos_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inscripciones_torneos"
    ADD CONSTRAINT "inscripciones_torneos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "public"."reservas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_equipo_local_id_fkey" FOREIGN KEY ("equipo_local_id") REFERENCES "public"."equipos_torneo"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_equipo_visitante_id_fkey" FOREIGN KEY ("equipo_visitante_id") REFERENCES "public"."equipos_torneo"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."premios"
    ADD CONSTRAINT "premios_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservas"
    ADD CONSTRAINT "reservas_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservas"
    ADD CONSTRAINT "reservas_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets_soporte"
    ADD CONSTRAINT "tickets_soporte_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."torneos"
    ADD CONSTRAINT "torneos_campeon_equipo_id_fkey" FOREIGN KEY ("campeon_equipo_id") REFERENCES "public"."equipos_torneo"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."validaciones_acceso"
    ADD CONSTRAINT "validaciones_acceso_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "public"."reservas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."validaciones_acceso"
    ADD CONSTRAINT "validaciones_acceso_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "public"."perfiles"("id");



CREATE POLICY "Perfil propio o admin" ON "public"."perfiles" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."es_admin"()));



CREATE POLICY "Solo admin modifica premios" ON "public"."premios" USING ("public"."es_admin"());



CREATE POLICY "Usuarios actualizan su perfil" ON "public"."perfiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR "public"."es_admin"()));



CREATE POLICY "Usuarios actualizan sus reservas" ON "public"."reservas" FOR UPDATE USING ((("auth"."uid"() = "perfil_id") OR "public"."es_admin"())) WITH CHECK (((("auth"."uid"() = "perfil_id") AND ("estado" = 'cancelada'::"text")) OR "public"."es_admin"()));



CREATE POLICY "Usuarios crean sus reservas" ON "public"."reservas" FOR INSERT WITH CHECK (((("auth"."uid"() = "perfil_id") AND ("estado" = 'pendiente'::"text")) OR "public"."es_admin"()));



CREATE POLICY "Usuarios ven sus premios" ON "public"."premios" FOR SELECT USING ((("auth"."uid"() = "perfil_id") OR "public"."es_admin"()));



CREATE POLICY "Usuarios ven sus reservas" ON "public"."reservas" FOR SELECT USING ((("auth"."uid"() = "perfil_id") OR "public"."es_admin"()));



ALTER TABLE "public"."canchas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "canchas_admin_rw" ON "public"."canchas" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "canchas_select_publico" ON "public"."canchas" FOR SELECT USING (true);



CREATE POLICY "equipos_delete" ON "public"."equipos_torneo" FOR DELETE TO "authenticated" USING (((("capitan_id" = "auth"."uid"()) AND ("estado" = 'inscrito'::"text")) OR "public"."es_admin"()));



CREATE POLICY "equipos_insert" ON "public"."equipos_torneo" FOR INSERT TO "authenticated" WITH CHECK (((("capitan_id" = "auth"."uid"()) AND ("estado" = 'inscrito'::"text") AND ("pagado" = false)) OR "public"."es_admin"()));



CREATE POLICY "equipos_select" ON "public"."equipos_torneo" FOR SELECT USING (true);



ALTER TABLE "public"."equipos_torneo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipos_update" ON "public"."equipos_torneo" FOR UPDATE TO "authenticated" USING (((("capitan_id" = "auth"."uid"()) AND ("estado" = 'inscrito'::"text")) OR "public"."es_admin"())) WITH CHECK (((("capitan_id" = "auth"."uid"()) AND ("estado" = 'inscrito'::"text") AND ("pagado" = false)) OR "public"."es_admin"()));



CREATE POLICY "goleadores_admin" ON "public"."goleadores_torneo" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "goleadores_select" ON "public"."goleadores_torneo" FOR SELECT USING (true);



ALTER TABLE "public"."goleadores_torneo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inscripciones_delete_admin" ON "public"."inscripciones_torneos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = 'admin'::"text")))));



CREATE POLICY "inscripciones_insert_propio" ON "public"."inscripciones_torneos" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "inscripciones_select" ON "public"."inscripciones_torneos" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = 'admin'::"text"))))));



ALTER TABLE "public"."inscripciones_torneos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notif_select_propias" ON "public"."notificaciones" FOR SELECT TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



CREATE POLICY "notif_update_propias" ON "public"."notificaciones" FOR UPDATE TO "authenticated" USING (("usuario_id" = "auth"."uid"())) WITH CHECK (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."notificaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pagos_insert" ON "public"."pagos" FOR INSERT TO "authenticated" WITH CHECK ((("usuario_id" = "auth"."uid"()) AND ("estado" = 'pendiente'::"text")));



CREATE POLICY "pagos_select" ON "public"."pagos" FOR SELECT TO "authenticated" USING ((("usuario_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text"))))));



CREATE POLICY "pagos_update_admin" ON "public"."pagos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text")))));



CREATE POLICY "pagos_update_user" ON "public"."pagos" FOR UPDATE TO "authenticated" USING ((("usuario_id" = "auth"."uid"()) AND ("estado" = 'pendiente'::"text"))) WITH CHECK ((("usuario_id" = "auth"."uid"()) AND ("estado" = 'pendiente'::"text")));



ALTER TABLE "public"."partidos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partidos_admin" ON "public"."partidos" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "partidos_select" ON "public"."partidos" FOR SELECT USING (true);



ALTER TABLE "public"."perfiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."premios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos_tienda" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "productos_tienda_admin_rw" ON "public"."productos_tienda" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "productos_tienda_select_publico" ON "public"."productos_tienda" FOR SELECT USING (true);



ALTER TABLE "public"."promociones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promociones_admin_rw" ON "public"."promociones" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "promociones_select_publico" ON "public"."promociones" FOR SELECT USING (true);



CREATE POLICY "push_subs_delete_propias" ON "public"."push_subscriptions" FOR DELETE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "push_subs_insert_propias" ON "public"."push_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "push_subs_select_propias" ON "public"."push_subscriptions" FOR SELECT USING (("auth"."uid"() = "usuario_id"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recompensas_catalogo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recompensas_catalogo_admin_rw" ON "public"."recompensas_catalogo" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "recompensas_catalogo_select_publico" ON "public"."recompensas_catalogo" FOR SELECT USING (true);



ALTER TABLE "public"."reservas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sponsors_admin_rw" ON "public"."sponsors" TO "authenticated" USING ("public"."es_admin"()) WITH CHECK ("public"."es_admin"());



CREATE POLICY "sponsors_select_publico" ON "public"."sponsors" FOR SELECT USING (true);



CREATE POLICY "tickets_admin_select" ON "public"."tickets_soporte" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text")))));



CREATE POLICY "tickets_admin_update" ON "public"."tickets_soporte" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text")))));



CREATE POLICY "tickets_insert_propio" ON "public"."tickets_soporte" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."tickets_soporte" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."torneos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "torneos_delete_admin" ON "public"."torneos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = 'admin'::"text")))));



CREATE POLICY "torneos_insert_admin" ON "public"."torneos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = 'admin'::"text")))));



CREATE POLICY "torneos_select_autenticado" ON "public"."torneos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "torneos_update_admin" ON "public"."torneos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles"
  WHERE (("perfiles"."id" = "auth"."uid"()) AND ("perfiles"."rol" = 'admin'::"text")))));



CREATE POLICY "val_admin_all" ON "public"."validaciones_acceso" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."rol" = 'admin'::"text")))));



ALTER TABLE "public"."validaciones_acceso" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."canchas";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."equipos_torneo";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."goleadores_torneo";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notificaciones";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pagos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."partidos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."perfiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."promociones";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."recompensas_catalogo";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reservas";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."actualizar_fidelizacion"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_fidelizacion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_fidelizacion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "service_role";



GRANT ALL ON FUNCTION "public"."es_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_disparar_push"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_disparar_push"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_disparar_push"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_equipo_aprobado"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_equipo_aprobado"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_equipo_aprobado"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_notificar_admin_comprobante"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_notificar_admin_comprobante"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notificar_admin_comprobante"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_notificar_admin_nueva_reserva"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_notificar_admin_nueva_reserva"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notificar_admin_nueva_reserva"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_pago_cambia_estado"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pago_cambia_estado"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pago_cambia_estado"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_partido_notifica"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_partido_notifica"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_partido_notifica"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_premio"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_premio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_premio"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_promocion"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_promocion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_promocion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_reserva_cancelada"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_reserva_cancelada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_reserva_cancelada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notif_reserva_creada"() TO "anon";
GRANT ALL ON FUNCTION "public"."notif_reserva_creada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notif_reserva_creada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."procesar_pago"() TO "anon";
GRANT ALL ON FUNCTION "public"."procesar_pago"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."procesar_pago"() TO "service_role";



GRANT ALL ON FUNCTION "public"."proteger_rol_perfil"() TO "anon";
GRANT ALL ON FUNCTION "public"."proteger_rol_perfil"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."proteger_rol_perfil"() TO "service_role";


















GRANT ALL ON TABLE "public"."canchas" TO "anon";
GRANT ALL ON TABLE "public"."canchas" TO "authenticated";
GRANT ALL ON TABLE "public"."canchas" TO "service_role";



GRANT ALL ON TABLE "public"."equipos_torneo" TO "anon";
GRANT ALL ON TABLE "public"."equipos_torneo" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos_torneo" TO "service_role";



GRANT ALL ON TABLE "public"."goleadores_torneo" TO "anon";
GRANT ALL ON TABLE "public"."goleadores_torneo" TO "authenticated";
GRANT ALL ON TABLE "public"."goleadores_torneo" TO "service_role";



GRANT ALL ON TABLE "public"."inscripciones_torneos" TO "anon";
GRANT ALL ON TABLE "public"."inscripciones_torneos" TO "authenticated";
GRANT ALL ON TABLE "public"."inscripciones_torneos" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notificaciones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notificaciones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notificaciones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."partidos" TO "anon";
GRANT ALL ON TABLE "public"."partidos" TO "authenticated";
GRANT ALL ON TABLE "public"."partidos" TO "service_role";



GRANT ALL ON TABLE "public"."perfiles" TO "anon";
GRANT ALL ON TABLE "public"."perfiles" TO "authenticated";
GRANT ALL ON TABLE "public"."perfiles" TO "service_role";



GRANT ALL ON TABLE "public"."premios" TO "anon";
GRANT ALL ON TABLE "public"."premios" TO "authenticated";
GRANT ALL ON TABLE "public"."premios" TO "service_role";



GRANT ALL ON TABLE "public"."productos_tienda" TO "anon";
GRANT ALL ON TABLE "public"."productos_tienda" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_tienda" TO "service_role";



GRANT ALL ON TABLE "public"."promociones" TO "anon";
GRANT ALL ON TABLE "public"."promociones" TO "authenticated";
GRANT ALL ON TABLE "public"."promociones" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."recompensas_catalogo" TO "anon";
GRANT ALL ON TABLE "public"."recompensas_catalogo" TO "authenticated";
GRANT ALL ON TABLE "public"."recompensas_catalogo" TO "service_role";



GRANT ALL ON TABLE "public"."reservas" TO "anon";
GRANT ALL ON TABLE "public"."reservas" TO "authenticated";
GRANT ALL ON TABLE "public"."reservas" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."tickets_soporte" TO "anon";
GRANT ALL ON TABLE "public"."tickets_soporte" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets_soporte" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tickets_soporte_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tickets_soporte_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tickets_soporte_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."torneos" TO "anon";
GRANT ALL ON TABLE "public"."torneos" TO "authenticated";
GRANT ALL ON TABLE "public"."torneos" TO "service_role";



GRANT ALL ON TABLE "public"."validaciones_acceso" TO "anon";
GRANT ALL ON TABLE "public"."validaciones_acceso" TO "authenticated";
GRANT ALL ON TABLE "public"."validaciones_acceso" TO "service_role";



GRANT ALL ON SEQUENCE "public"."validaciones_acceso_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."validaciones_acceso_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."validaciones_acceso_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































