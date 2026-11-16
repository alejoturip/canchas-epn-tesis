# Guía: activar las notificaciones push 🔔

Estos son los pasos que tenés que hacer **vos** (una sola vez) para que los avisos
lleguen al celular con la app cerrada. El código ya está listo.

Al final, esto es lo que va a pasar solo:

| Evento | A quién le llega |
|---|---|
| Un cliente reserva una cancha | Al **admin** |
| Un cliente sube el comprobante | Al **admin** |
| El admin aprueba o rechaza el pago | Al **cliente** |

---

## Paso 1 — Generar las llaves VAPID

Son las credenciales que identifican a tu app ante Google/Apple/Mozilla. En la terminal del proyecto:

```bash
npx web-push generate-vapid-keys
```

Te devuelve dos llaves. **Guardalas, las vas a usar en los pasos 2 y 4:**

```
Public Key:   BEl62iUYgUivxIkv69yViEuiBIa... (larga)
Private Key:  8mB3n5vQ...                    (más corta) ← SECRETA, nunca la subas a GitHub
```

---

## Paso 2 — Poner la llave pública en el `.env`

Abrí el archivo `.env` (el de la raíz del proyecto) y agregá esta línea con **la llave pública** del paso 1:

```env
VITE_VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69yViEuiBIa..."
```

> ⚠️ Acá va **solo la pública**. La privada NO — todo lo que empieza con `VITE_` queda visible para cualquiera que abra la app.

Si tenés la app publicada (Vercel / Netlify), agregá también esa misma variable en el panel de tu hosting.

---

## Paso 3 — Correr el SQL en Supabase

> 🔐 **Ojo:** `push_notificaciones.sql` es la **plantilla** y se sube a GitHub, así que **no le pongas
> tus claves ahí**. Trabajá siempre sobre `push_notificaciones.local.sql`, que git ignora
> (cualquier archivo `*.local.sql` está ignorado).

1. Abrí `supabase/push_notificaciones.local.sql` (si no existe, copiá la plantilla y renombrala así).
2. Buscá el **PASO 4** dentro del archivo y reemplazá los dos placeholders:
   - `<TU-PROJECT-REF>` → el código de tu proyecto (está en la URL: `https://XXXX.supabase.co`).
   - `<TU-SERVICE-ROLE-KEY>` → Supabase → **Settings → API → `service_role`**. Es la llave maestra de
     tu base: quien la tenga puede leer y borrar todo saltándose el RLS. **Nunca** la subas a GitHub
     ni la pegues en el `.env` (todo lo que empieza con `VITE_` queda visible en la app).
3. Copiá **todo** ese archivo, pegalo en **Supabase → SQL Editor** y dale **Run**.

Al final te tiene que mostrar los 3 triggers nuevos.

---

## Paso 4 — Desplegar la Edge Function

Es el programita que efectivamente manda el push. Desde la terminal, en la carpeta del proyecto:

```bash
# 1) Entrar a tu cuenta de Supabase (te abre el navegador)
npx supabase login

# 2) Conectar esta carpeta con tu proyecto (el mismo project-ref del paso 3)
npx supabase link --project-ref TU-PROJECT-REF

# 3) Cargar las llaves como secretos (acá SÍ va la privada)
npx supabase secrets set VAPID_PUBLIC_KEY="BEl62iUY..." VAPID_PRIVATE_KEY="8mB3n5vQ..." VAPID_SUBJECT="mailto:tucorreo@gmail.com"

# 4) Subir la función
npx supabase functions deploy enviar-push
```

---

## Paso 5 — Probar

1. Levantá la app (`npm run dev`) y entrá con tu usuario **admin**.
2. En el Dashboard vas a ver la tarjeta **"Activar avisos"** → tocá el botón y **aceptá** el permiso del navegador.
3. Entrá con un usuario **cliente** (otro navegador o ventana incógnita), andá a **Perfil** y activá los avisos también.
4. Con el cliente, **hacé una reserva**. Al admin le tiene que sonar el aviso *"Nueva reserva 📅"*.
5. Aprobá el pago desde `/admin/pagos`. Al cliente le llega *"Pago aprobado ✅"*.

**Si no llega nada**, corré esto en el SQL Editor para ver qué respondió la función:

```sql
SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;
```

- `status_code = 200` → el push salió bien (revisá que el aparato tenga los avisos activados).
- `401` → la service_role key del PASO 4 del SQL está mal.
- `404` → la URL del proyecto está mal, o la función no se desplegó.
- `500` → revisá los logs en Supabase → Edge Functions → `enviar-push` → Logs (suele ser una llave VAPID mal cargada).

---

## Cosas importantes que tenés que saber

**📱 En iPhone hay que instalar la app.** Apple no permite push desde Safari normal: el usuario tiene que
tocar **Compartir → "Agregar a inicio"** y abrir la app desde el ícono. La app ya le avisa esto sola
con un cartel amarillo. En Android y en computadora funciona directo, sin instalar nada.

**🔒 Solo funciona en HTTPS.** En `localhost` anda para probar, pero si lo subís a un servidor sin
certificado, el push no funciona. Vercel y Netlify ya vienen con HTTPS.

**🚫 El permiso se pide UNA sola vez.** Si el usuario le da "Bloquear", el navegador no lo vuelve a
preguntar nunca más y hay que habilitarlo a mano desde el candado 🔒 de la barra de direcciones.
Por eso el permiso se pide con un **botón** y nunca al entrar a la app.

**📲 Es por aparato, no por cuenta.** Si el dueño activa los avisos en la compu, no le llegan al celular.
Tiene que activarlos en **cada** aparato donde quiera recibirlos (la app se lo aclara).

**👥 Le llega a TODOS los admins.** Los triggers avisan a cada perfil con `rol = 'admin'`.
