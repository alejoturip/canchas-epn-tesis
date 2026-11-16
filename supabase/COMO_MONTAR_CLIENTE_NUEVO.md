# 🏗️ Cómo montar un cliente nuevo (instancia separada)

Guía para cuando vendes La Fija a una cancha y le montas su propio sistema (su base de
datos aparte). Pensado para hacerse en ~20-30 min sin ser experto.

---

## PARTE A — Generar el "instalador" (UNA SOLA VEZ)

El instalador es un archivo `.sql` con el **molde exacto** de tu base actual. Se genera con
la herramienta de Supabase (CLI). Solo lo haces una vez; después lo reutilizas para cada cliente.

> Tu *project ref* actual es: **ndgkydmmoajoqxdnxkjq**

### Paso 1 — Iniciar sesión en Supabase (abre el navegador)
En la terminal del proyecto:
```
npx supabase login
```
Te muestra un código y abre el navegador para autorizar. Aceptas y pegas el código. (Solo la 1ª vez.)

### Paso 2 — Conectar con tu proyecto actual
```
npx supabase link --project-ref ndgkydmmoajoqxdnxkjq
```
Te va a pedir la **contraseña de la base de datos**. La sacas de:
Supabase → tu proyecto → **Settings → Database → Database password** (si no la recuerdas, ahí mismo puedes resetearla).

### Paso 3 — Sacar el molde (el instalador)
```
npx supabase db dump -f supabase/instalador_completo.sql
```
Esto crea el archivo `supabase/instalador_completo.sql` con TODAS las tablas, funciones,
reglas de seguridad (RLS) y triggers de tu base. **Ese es tu instalador.** ✅

> ✅ **Ya generado el 2026-08-26.** Necesita **Docker Desktop prendido** (el CLI corre
> `pg_dump` dentro de un contenedor; si está apagado da *"failed to connect to the docker API"*).
>
> ⚠️ **Ojo 1 — está incompleto a propósito:** `db dump` exporta **solo el esquema `public`**.
> El trigger de registro vive en `auth` y **NO entra ahí** → por eso existe el paso 2-bis.
> Detalle traicionero: la *función* `crear_perfil_usuario()` sí aparece en el instalador
> (vive en `public`), pero **sin su trigger no la llama nadie**. O sea que buscar "perfil"
> dentro del archivo te hace creer que está resuelto cuando no lo está.
>
> 🔐 **Ojo 2 — el dump trae la `service_role` key en texto plano**, dentro de
> `fn_disparar_push()`. Por eso hay **dos archivos**: `instalador_completo.sql` (plantilla
> con placeholders, es la que se versiona) e `instalador_completo.local.sql` (valores reales,
> ignorado por git). **Cada vez que regeneres el dump, volvé a censurar esos dos valores**
> antes de commitear. Para montar un cliente usás la versión `.local` (o la plantilla,
> reemplazando el project-ref y la service_role key **del cliente nuevo**, no los tuyos).

> 💡 Si querés también los datos (no recomendado para un cliente nuevo, que va vacío),
> sería `npx supabase db dump --data-only -f supabase/datos_actuales.sql`. Para un cliente
> nuevo NO lo uses: él arranca con su base vacía + tus `datos_demo.sql` si querés mostrarle.

---

## PARTE B — Montar la base de un cliente nuevo (cada vez que vendes)

### 1) Crear el proyecto de Supabase del cliente
- Entra a https://supabase.com → **New project**.
- Ponle nombre (ej. `lafija-canchaX`), región (South America / São Paulo es la más cercana),
  y guarda la **contraseña de la base** que te genere.

### 2) Correr el instalador
- En ese proyecto nuevo → **SQL Editor** → **New query**.
- Abre `supabase/instalador_completo.sql`, **copia TODO** y pégalo.
- Dale **Run**. Eso crea toda la estructura. ✅

### 2-bis) ⚠️ Correr el trigger de registro (NO te lo saltes)
- En el mismo SQL Editor, corre también **`supabase/crear_perfil_al_registrarse.sql`**.
- **Por qué:** ese trigger vive en el esquema `auth`, y `db dump` solo exporta `public`,
  así que **el instalador NO se lo lleva**. Sin él, el que se registra no obtiene su fila
  en `perfiles` y **el login queda roto, sin ningún mensaje de error**. (Verificado
  el 2026-08-26: la app hace `UPDATE` sobre `perfiles`, no `INSERT` — depende del trigger.)

### 3) Crear los buckets de fotos (Storage)
En **Storage → New bucket**, crea estos **6** (márcalos **públicos**):
`canchas`, `productos`, `promociones`, `sponsors`, `comprobantes`, `avatars`.

> ⚠️ `avatars` es fácil de olvidar (lo usa `usePerfil.js` para la foto de perfil).
> Si falta, subir avatar falla. Ojo además: sus políticas exigen que el archivo vaya
> dentro de una carpeta con el `id` del usuario (`{user.id}/avatar-...`).

### 4) (Opcional) Cargar datos de ejemplo
- En el SQL Editor corre `supabase/datos_demo.sql` para que no se vea vacío en la primera reunión.

### 5) Conectar el frontend (Netlify)
- En Netlify → **Add new site → Import from GitHub** → el repo `canchas-app`.
- En **Site settings → Environment variables** pon las del cliente:
  - `VITE_SUPABASE_URL` = la URL del Supabase nuevo (Settings → API)
  - `VITE_SUPABASE_ANON_KEY` = la anon key del Supabase nuevo (Settings → API)
- Deploy. Le das su link (o su dominio/subdominio).

### 6) Crear el admin del cliente
- Que el dueño se registre en su app (o lo registras tú).
- En Supabase del cliente → SQL Editor:
  ```sql
  UPDATE public.perfiles SET rol = 'admin' WHERE email = 'correo-del-dueño@gmail.com';
  ```
- Listo: ya entra a `/admin` y carga sus canchas, logo, productos.

---

## ⚠️ Verificaciones importantes (la 1ª vez que pruebes el instalador)
Antes de venderle a alguien, **prueba el instalador en un proyecto de prueba gratis** y revisa:
1. **Registrarte** crea fila en `perfiles`. ✅ **Ya resuelto** (2026-08-26): es el trigger
   `al_registrar_usuario` y está en `crear_perfil_al_registrarse.sql` (paso 2-bis). Si esta
   prueba falla, es que te saltaste ese paso.
2. Puedes **crear una cancha** desde el admin (RLS ok).
3. **Reservar** como cliente y que el admin **apruebe el pago** (los triggers de pago funcionan).
4. Que **es_admin()** exista (lo usan las reglas de seguridad).

Si algo de eso falla, es porque el dump no agarró un trigger que vivía fuera del esquema `public`.
Se soluciona agregando ese trozo al `instalador_completo.sql`. (Guárdate este checklist.)

---

## 🔭 ¿Hasta cuándo uso esto?
Con **1-3 clientes** este método (instancia separada) es perfecto. Cuando llegues a **4+**,
conviene el **multi-tenant** (un solo sistema para todas las canchas) — ahí ya no montas uno
por uno. Ver el plan en CLAUDE.md.
