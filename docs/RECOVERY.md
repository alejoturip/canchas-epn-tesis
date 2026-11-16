# RECOVERY.md — Recuperación ante pérdida de código

> ⚠️ Este código **ya se perdió una vez**. Por eso existe este documento y por eso el repo ya está en GitHub. Mantener todo respaldado.

## Repositorio
- **GitHub (privado):** https://github.com/AlejandroFabara/canchas-app
- **Rama principal:** `main`
- **Cuenta dueña:** `AlejandroFabara` (login `fabaraaalejandro@gmail.com`).
- **Commits con email:** `fabaraaalejandro@gmail.com`.

## Proyecto activo vs antiguo
- ✅ **Activo y definitivo:** `C:\Users\Alejo\Desktop\canchas-app-final`
- ❌ **Viejo (NO usar):** `C:\Users\Alejo\Desktop\MisProyectos\canchas-app` (versión de mayo).
- Origen de recuperación previa: `Downloads\canchas-app-responsive` (10-jun-2026).

## Supabase (backend)
- **Proyecto:** ref `ndgkydmmoajoqxdnxkjq` (URL `https://ndgkydmmoajoqxdnxkjq.supabase.co`).
- **Auth, DB, Storage, Realtime** viven aquí.
- Buckets: `comprobantes`, `avatars`, `productos`, `sponsors`.
- Scripts SQL versionados en `supabase/` (ver `DATABASE.md`).

## Hosting / Deploy
- **Netlify:** sitio en vivo → **https://miscanchas.netlify.app**
- Configurar variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el panel del sitio. Build: `npm run build`, publish dir: `dist`.
- La PWA genera `dist/sw.js` (service worker) en cada build.

## Auth con Google (OAuth) — dónde va cada URL
- **Google Cloud → Credenciales → URIs de redireccionamiento autorizados:** `https://ndgkydmmoajoqxdnxkjq.supabase.co/auth/v1/callback` (la de Supabase, NO la de Netlify).
- **Supabase → Authentication → URL Configuration → Site URL:** `https://miscanchas.netlify.app`
- **Supabase → Authentication → URL Configuration → Redirect URLs:** `https://miscanchas.netlify.app/**` y `http://localhost:5173/**`.
- El nombre "Canchas App" que ve el usuario sale de la *Pantalla de consentimiento de OAuth* (campo "Nombre de la aplicación").

## Variables críticas (`.env` — NO se sube a git)
```
VITE_SUPABASE_URL="https://ndgkydmmoajoqxdnxkjq.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon key pública del proyecto>"
```
- La **anon key** es pública por diseño (va en el bundle del navegador). **Nunca** poner la `service_role` key en el frontend.
- Plantilla disponible en `.env.example`.

## Triggers válidos (mantener)
- `fn_pago_cambia_estado()` → `trg_pago_cambia_estado` (sobre `pagos`). **El bueno.**
- `actualizar_fidelizacion()` → trigger sobre `reservas` (puntos/premios).

## Triggers obsoletos (NO recrear)
- `trg_procesar_pago` → **eliminado**. Era duplicado y rompía con `column "puntos"`. La función `procesar_pago()` quedó inerte; no volver a asociarle un trigger.

---

## Procedimiento de recuperación (si se pierde el código local)

1. **Restaurar desde GitHub**
   ```bash
   git clone https://github.com/AlejandroFabara/canchas-app.git
   cd canchas-app
   npm install
   ```
   > Si el push/clone falla con "Repository not found": la PC tenía cacheada otra cuenta (`alejoturip`). Correr `cmdkey /delete:git:https://github.com` y reloguear como `AlejandroFabara`.

2. **Recrear `.env`** desde `.env.example` con las credenciales de Supabase (panel → Settings → API).

3. **Colocar `public/qr-pago.png`** (QR de DeUna real) si no vino en el repo.

4. **Revisar Netlify** (si está desplegado): variables de entorno y último deploy.

5. **Revisar Supabase**: que las tablas, buckets y triggers existan. Auditar triggers de pago:
   ```sql
   SELECT tgname FROM pg_trigger
   WHERE tgrelid='public.pagos'::regclass AND NOT tgisinternal;
   -- Debe devolver SOLO: trg_pago_cambia_estado
   ```

6. **Ejecutar migraciones faltantes** desde `supabase/` (en SQL Editor), en este orden si la BD está limpia:
   - `migracion_flujo_pagos.sql` (trigger bueno).
   - (Los `fix_*` solo si reaparece el trigger viejo o el bug de `puntos`.)

7. **Verificar**: `npm run dev`, login, y correr el flujo end-to-end (ver `NEXT_TASK.md` #1).

## Respaldo continuo (rutina recomendada)
```bash
git add -A
git commit -m "descripción del cambio"
git push
```
