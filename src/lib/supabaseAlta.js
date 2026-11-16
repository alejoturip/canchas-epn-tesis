/**
 * supabaseAlta.js — Cliente aparte, SOLO para crear cuentas de personal.
 * ---------------------------------------------------------------------------
 * ¿Por qué un segundo cliente?
 * `supabase.auth.signUp()` inicia sesión con la cuenta recién creada, o sea que
 * si el admin lo usara desde su panel, **se quedaría logueado como el guardia**.
 * Este cliente tiene `persistSession: false`, así que crea la cuenta sin tocar
 * la sesión del admin.
 *
 * ⚠️ Por qué NO se usa la API de administración de Supabase
 * (`auth.admin.createUser`): esa necesita la **service_role key**, que da acceso
 * total a la base saltándose el RLS. Cualquier cosa que se ponga en el front
 * viaja en el bundle y la puede leer cualquiera. Si algún día hiciera falta de
 * verdad, tendría que ir en una Edge Function, nunca acá.
 *
 * Lo que sí implica usar el registro público:
 *   · El guardia recibe el correo de confirmación y tiene que confirmarlo antes
 *     de poder entrar (a menos que apagues "Confirm email" en Supabase).
 *   · Su correo tiene que ser @epn.edu.ec o estar en `correos_autorizados`,
 *     porque el trigger `validar_correo_institucional` lo valida igual.
 */
import { createClient } from '@supabase/supabase-js';

export const supabaseAlta = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
