-- ============================================================================
-- storage_buckets_politicas.sql — Buckets de Storage + sus políticas
-- ----------------------------------------------------------------------------
-- ⚠️ POR QUÉ EXISTE ESTE ARCHIVO
-- `instalador_completo.sql` sale de `npx supabase db dump`, que exporta SOLO el
-- esquema `public`. Los buckets viven en `storage.buckets` y sus permisos en
-- `storage.objects` → **el instalador no se los lleva**. En la base vieja se
-- crearon a mano desde el panel; en un proyecto nuevo no existen.
--
-- Sin esto: el bucket público deja LEER (las fotos se ven), pero **nadie puede
-- SUBIR**. Falla al cargar la foto de una cancha, el comprobante de pago y el
-- avatar del perfil, siempre con el mismo error poco claro:
--     "new row violates row-level security policy"
--
-- Crea los 6 buckets y deja las políticas listas. Idempotente.
-- Correr en Supabase → SQL Editor, DESPUÉS de `instalador_completo.sql`
-- (necesita que exista la función `public.es_admin()`).
-- ============================================================================

-- ── PASO 1: los buckets ─────────────────────────────────────────────────────
-- Públicos = cualquiera con el link ve la imagen. Es lo que la app espera:
-- guarda la URL pública en la base (`imagen_url`, `comprobante_url`, `avatar_url`).

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('canchas',      'canchas',      true),
  ('productos',    'productos',    true),
  ('promociones',  'promociones',  true),
  ('comprobantes', 'comprobantes', true),
  ('avatars',      'avatars',      true),
  ('sponsors',     'sponsors',     true)   -- solo se usa con el flag SPONSORS prendido
ON CONFLICT (id) DO NOTHING;

-- ── PASO 2: catálogos (los edita solo el admin) ─────────────────────────────
-- canchas · productos · promociones · sponsors → lee cualquiera, escribe el admin.

DROP POLICY IF EXISTS "catalogos_lectura_publica" ON storage.objects;
CREATE POLICY "catalogos_lectura_publica" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('canchas','productos','promociones','sponsors'));

DROP POLICY IF EXISTS "catalogos_escribe_admin" ON storage.objects;
CREATE POLICY "catalogos_escribe_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('canchas','productos','promociones','sponsors') AND public.es_admin());

DROP POLICY IF EXISTS "catalogos_actualiza_admin" ON storage.objects;
CREATE POLICY "catalogos_actualiza_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('canchas','productos','promociones','sponsors') AND public.es_admin())
  WITH CHECK (bucket_id IN ('canchas','productos','promociones','sponsors') AND public.es_admin());

DROP POLICY IF EXISTS "catalogos_borra_admin" ON storage.objects;
CREATE POLICY "catalogos_borra_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('canchas','productos','promociones','sponsors') AND public.es_admin());

-- ── PASO 3: comprobantes de pago ────────────────────────────────────────────
-- Sube cualquiera con sesión (es su comprobante); borra y corrige solo el admin.
--
-- ⚠️ NOTA DE PRIVACIDAD (vale la pena mencionarla en el escrito): el bucket es
-- PÚBLICO, así que quien tenga la URL exacta del comprobante lo ve sin iniciar
-- sesión. Las URLs son largas y no se listan, pero no es un control de acceso
-- real. Se dejó así porque es como funciona hoy la app (guarda la URL pública en
-- `pagos.comprobante_url`). Para cerrarlo habría que pasar el bucket a privado y
-- usar URLs firmadas (`createSignedUrl`) en PagosAdmin.

DROP POLICY IF EXISTS "comprobantes_lectura_publica" ON storage.objects;
CREATE POLICY "comprobantes_lectura_publica" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "comprobantes_sube_autenticado" ON storage.objects;
CREATE POLICY "comprobantes_sube_autenticado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "comprobantes_gestiona_admin" ON storage.objects;
CREATE POLICY "comprobantes_gestiona_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND public.es_admin());

-- ── PASO 4: avatars ─────────────────────────────────────────────────────────
-- Cada uno manda dentro de SU carpeta: el archivo va como `{user.id}/foto.jpg`
-- (así lo sube `usePerfil.js`). `storage.foldername(name)` devuelve el arreglo
-- de carpetas: el elemento [1] es la primera, que tiene que ser su propio id.

DROP POLICY IF EXISTS "avatars_lectura_publica" ON storage.objects;
CREATE POLICY "avatars_lectura_publica" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_sube_propio" ON storage.objects;
CREATE POLICY "avatars_sube_propio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_actualiza_propio" ON storage.objects;
CREATE POLICY "avatars_actualiza_propio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_borra_propio" ON storage.objects;
CREATE POLICY "avatars_borra_propio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- 1) Los 6 buckets, todos públicos:
-- SELECT id, public FROM storage.buckets ORDER BY id;
--
-- 2) Las políticas creadas (deben ser 11):
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname = 'storage' AND tablename = 'objects'
--  ORDER BY policyname;
--
-- 3) Prueba real: con tu cuenta admin, subí la foto de una cancha desde
--    /admin/canchas. Con una cuenta de estudiante, subí un comprobante y una
--    foto de perfil. Si alguna falla con "row-level security policy", este
--    script no corrió o el usuario no es admin.
