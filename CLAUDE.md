# Reservas Deportivas EPN — Proyecto de tesis

> **Esta carpeta es la VERSIÓN TESIS** (Escuela Politécnica Nacional, Ecuador).
> Es un recorte de "La Fija", la app comercial. La original vive en
> `Desktop\canchas-app-final` y **es solo de consulta: no se toca**.
> Clonada el 2026-08-26.

## 🧭 Hoja de ruta: el formulario TIC APROBADO (28/09/2026)
**`docs/TIC_FORMULARIO_APROBADO.md`** manda sobre todo lo demás. Se trabaja lo que dice ese
formulario y **en el orden de sus 12 actividades**; lo que no esté ahí no se agrega. Ahí también
está la tabla de lo que el código todavía no cumple (confirmación automática, módulos de más).

## Alcance de la tesis
Estudiantes que **reservan canchas** y **piden implementos deportivos**. El flujo
central es: reservar → el encargado aprueba → se genera un **QR de acceso** → se
escanea en la puerta. **No hay cobro**: los escenarios son de la universidad.

## ⚠️ Regla del proyecto: acá no se borra, se APAGA
Todo módulo fuera de alcance sigue **completo en el repo** — no se borró un solo
archivo. Se apaga desde **`src/config/features.js`**:

| Flag | Estado | Qué controla |
|---|---|---|
| `RESERVAS` | ✅ on | reservas y QR de acceso |
| `PAGOS` | ⛔ off | cobro con comprobante (la universidad no cobra — ver abajo) |
| `TIENDA` | ✅ on | implementos deportivos |
| `PROMOCIONES`, `SOPORTE`, `NOTIFICACIONES` | ✅ on | promos del carrusel, tickets, campana in-app |
| `TORNEOS` | ⛔ off | motor de torneos completo (liga, llaves, goleadores, PDF) |
| `FIDELIZACION` | ⛔ off | puntos, niveles, premios, catálogo de recompensas |
| `SPONSORS` | ⛔ off | auspiciantes (módulo comercial) |
| `PUSH` | ⛔ off | avisos con la app cerrada (ver abajo) |

**Para prender un módulo hacen falta 2 pasos** (está escrito en `App.jsx`):
1. Poné su flag en `true` en `config/features.js`.
2. Descomentá su `lazy(() => import(...))` en `App.jsx`.

El paso 2 no es capricho: si el `import()` queda escrito, Vite genera el chunk
**aunque el flag esté en false**, y el service worker se lo descarga al usuario.
Cortando la referencia el build pasó de **2606 KiB a 1726 KiB (−880 KiB, −34%)**.
Si prendés `TORNEOS` o `FIDELIZACION`, además hay que crear sus tablas en la base
(`torneos_motor.sql`, `recompensas_catalogo.sql`).

Archivos con flags aplicados: `App.jsx`, `routes/routeConfig.js`, `layouts/MainLayout.jsx`,
`layouts/AdminLayout.jsx`, `pages/Home.jsx`, `components/HeroBanner.jsx`, `pages/Perfil.jsx`,
`hooks/usePerfil.js`, `pages/admin/Dashboard.jsx`.

## Identidad: PoliSport EPN (2026-08-26)
La marca "La Fija" salió de toda la interfaz. **Nombre: PoliSport EPN** · descriptor
*Reservas Deportivas* · eslogan *"Tu espacio. Tu deporte. Tu Politécnica."*

- **`src/config/marca.js`** es la fuente única (nombre, descriptor, eslogan, logo, alt).
  Antes la marca estaba escrita a mano en 8 lugares. Se junta con `config/institucion.js`,
  que guarda lo de la INSTITUCIÓN (nombre, siglas, dominio del correo, contacto).
- **TEMA CLARO** (segunda pasada del 2026-08-26): la app pasó de tema oscuro a **fondo blanco**
  con azul marino y dorado, para parecerse al sitio institucional de la EPN.
  ⚠️ **La escala `surface` quedó INVERTIDA a propósito**: los números altos (800-950) son los
  FONDOS casi blancos y los bajos (200-500) son los TEXTOS oscuros. Se hizo así para no reescribir
  1041 usos de clases: `bg-surface-900` sigue significando "fondo" y `text-surface-400` sigue
  significando "texto secundario"; lo único que cambió es el color de cada peldaño.
  Se agregaron dos tokens: **`ink`** (texto principal, reemplaza a `text-white`) y **`line`**
  (bordes, reemplaza a `border-white/5`, que sobre blanco no se ve).
  Los acentos se oscurecieron para leerse sobre blanco (`pitch` #0E9F6E, `gold` #A87C0F como
  texto y `gold.soft` #F0B323 para fondos, `cat.*` más saturados).
  🔴 **Zonas que SIGUEN siendo oscuras y llevan texto BLANCO:** el carrusel del inicio (va sobre
  foto), el panel izquierdo del login, la cabecera del ticket en `ReservaDetalle` y la portada de
  `CanchaDetalle`. Si tocás esos bloques, ahí el blanco es lo correcto — no lo "corrijas".
- **Carrusel del inicio:** las imágenes salen de `public/hero-1.jpg` … `hero-4.jpg`. Si falta un
  archivo el slide igual se ve (queda el degradado azul).
- **Paleta EPN en `tailwind.config.js`**, tomada del escudo: `brand` pasó del rojo Netflix
  (`#E50914`) al **rojo EPN `#DA1F26`**, y `surface` dejó de ser gris neutro para ser una
  **escala de azul politécnico** (`#050C18` → `#152B4C`). El criterio es
  **azul = estructura, rojo = acción, dorado = destacado**: el rojo no domina la pantalla.
- **Tipografía:** `font-display` pasó de **Anton** (condensada, marca comercial) a
  **Montserrat ExtraBold**. Ojo: Anton traía un solo peso y siempre se veía grueso;
  Montserrat necesita el peso explícito, por eso `.display-title` ahora lleva
  `font-extrabold` y tracking negativo en vez de positivo.
- ⚠️ **Los colores escritos a mano NO siguen los tokens.** Había ~25 hex sueltos en JSX
  (fondos del login, degradados del Home, series de los gráficos, marcador del mapa,
  toasts) más los `rgba(229,9,20,…)` de los glows. Se repasaron uno por uno; si algún día
  se vuelve a cambiar la paleta, **hay que repasarlos de nuevo o quedan manchas del color viejo**.
- **Lenguaje:** "cliente" → **estudiante** en todo el panel admin; "Resumen General" →
  **Panel de Gestión Deportiva**; "Canchas" → **Espacios Deportivos** donde el texto lo permite.
  Se rechazaron a propósito "Mis reservas deportivas" y "Mi perfil politécnico" para el menú:
  con 5 ítems en pantalla de celular esos labels se cortan.
- **Dashboard:** al apagar los pagos quedaba un hueco donde estaban las tarjetas de ingresos.
  Lo llenan **Solicitudes Pendientes** e **Implementos Prestados** (de `prestamos`, con realtime).
- **Pantalla del QR** (`ReservaDetalle`): ahora es una *credencial de acceso* enmarcada, con
  el nombre de la institución al pie. Es la que se proyecta en la defensa.

🔴 **Pendiente (no es código):** el archivo `public/logo.png` sigue siendo el de La Fija.
El logo de PoliSport es **cuadrado** (el de La Fija era apaisado): las alturas de los `<img>`
ya se recalibraron para eso. Hacen falta además una **versión con fondo transparente** (con
fondo blanco se ve un rectángulo blanco sobre el tema oscuro), una **versión compacta** sin
eslogan para los headers (`MARCA.logoCompacto`, hoy apunta al mismo archivo) y regenerar
`icon-192`, `icon-512` y `apple-touch-icon`. Ver `docs/PLAN_REBRANDING.md`.

## Acceso restringido a la comunidad politécnica (2026-08-26)
El sistema es **de uso interno**: solo se crea cuenta con correo `@epn.edu.ec` (o un subdominio
tipo `@fis.epn.edu.ec`). Se quitó el **ingreso con Google** y todo el copy comercial que traía
La Fija (el panel del login vendía el sistema a dueños de canchas por WhatsApp).

**La regla vive en dos lugares y hacen falta los dos:**
| Capa | Archivo | Para qué |
|---|---|---|
| Interfaz | `src/config/institucion.js` + `esCorreoDeDominio()` en `utils/validators.js` | Que el estudiante vea un mensaje entendible antes de mandar el formulario. |
| Base (la que manda) | `supabase/restringir_registro_epn.sql` → trigger `validar_correo_institucional` sobre `auth.users` | Que no se pueda esquivar llamando directo a la API con la anon key. |

⚠️ **Falta un tercer paso que no es código:** en el panel de Supabase, Authentication → Providers →
**desactivar Google**. Si queda prendido, el endpoint OAuth sigue vivo aunque el botón ya no esté.

- **Las cuentas que ya existen no se tocan**: el trigger es `BEFORE INSERT`, solo frena registros
  nuevos. Tu admin con Gmail sigue entrando.
- **Excepciones**: tabla `correos_autorizados` (para el tribunal o una cuenta de demo). Se cargan
  a mano desde el SQL Editor; no se leen desde el cliente.
- Supabase **no propaga** el texto de la excepción del trigger: el cliente recibiría un genérico
  *"Database error saving new user"*. Por eso la validación del front no es decorativa.
- Si cambia el dominio, hay que cambiarlo en **los dos** lugares.

## 🔴 Montar la base de datos (hacer ANTES de correr la app)

**Orden exacto.** Cada paso depende del anterior; saltearse uno rompe algo sin dar error claro.

| # | Dónde | Qué |
|---|---|---|
| 1 | Supabase | Crear un proyecto **nuevo** (no compartir la base con La Fija). |
| 2 | SQL Editor | **`instalador_completo.sql`** — toda la estructura (18 tablas, funciones, triggers, RLS). |
| 3 | SQL Editor | **`crear_perfil_al_registrarse.sql`** 🔴 sin esto **nadie puede registrarse** y no hay mensaje de error. |
| 4 | SQL Editor | **`storage_buckets_politicas.sql`** — crea los 6 buckets **y sus permisos de subida**. |
| 5 | SQL Editor | **`prestamos_implementos.sql`** — préstamo de implementos. |
| 5-d | SQL Editor | **`politica_uso_escenarios.sql`** — ausencias, sanciones, bloqueos y perfil académico. |
| 5-bis | SQL Editor | **`reservas_sin_pago.sql`** 🔴 el QR se genera al confirmar la reserva. Sin esto **nunca aparece el QR**, porque el trigger que lo generaba era el de pagos. |
| 6 | Panel | Authentication → Providers → **desactivar Google**; dejar *Confirm email* activo. |
| 7 | App | Registrarte y ascenderte: `UPDATE public.perfiles SET rol='admin' WHERE email='tu@correo.com';` |
| 8 | SQL Editor | **`restringir_registro_epn.sql`** — cierra el registro a `@epn.edu.ec`. |

⚠️ **Por qué el 8 va al final:** si tu cuenta de admin no es `@epn.edu.ec`, corriendo ese script
antes te quedás sin poder crearla. Si ya la creaste, no pasa nada: el trigger es `BEFORE INSERT`
y no toca las cuentas existentes. También podés agregarte a `correos_autorizados`.

**El paso 2 es una plantilla:** trae `<TU-PROJECT-REF>` y `<TU-SERVICE-ROLE-KEY>` dentro de
`fn_disparar_push()`. Con `PUSH` apagado no se usan y la función se traga el error, así que podés
correrlo tal cual.

**El paso 4 no estaba documentado antes** y es el que más silenciosamente rompe cosas: el
instalador sale de `db dump`, que exporta solo el esquema `public`, así que los buckets
(`storage.buckets`) y sus permisos (`storage.objects`) **no viajan con él**. Un bucket público
deja *leer* pero no *subir*: sin este script fallan la foto de la cancha, el comprobante de pago
y el avatar, siempre con *"new row violates row-level security policy"*.

### ⛔ Scripts que NO hay que correr en una instancia nueva
Ya están **dentro** del instalador (se generó de una base que los tenía aplicados; verificado):
`agregar_categoria_productos.sql`, `agregar_horarios_canchas.sql`, `agregar_campos_perfil.sql`,
`agregar_campos_sponsors.sql`, `agregar_mostrar_en_inicio_promociones.sql`,
`crear_tickets_soporte.sql`, `recompensas_catalogo.sql`, `torneos_motor.sql`,
`push_notificaciones.sql` y los `fix_*.sql`. Correrlos no rompe nada (son idempotentes), pero es
tiempo perdido y confunde. `datos_demo.sql` es **opcional** y trae marca comercial
("Copa La Fija", canchas de Pichincha): para la tesis conviene saltearlo o editarlo antes.

**Prueba de que quedó bien:** registrate con un correo nuevo y comprobá que aparece la fila en
`perfiles` con rol `cliente`. Si no aparece, te saltaste el paso 3.

## Sobre el push (apagado a propósito)
El código está completo y funciona — se probó en la app comercial. Se apagó para la
tesis porque necesita llaves VAPID + Edge Function desplegada + HTTPS, no anda en
iPhone salvo que instalen la PWA, y es la pieza más frágil para una demostración en vivo.
La **campana in-app con realtime** cubre los avisos y no falla. En el escrito conviene
presentarlo como trabajo futuro ya diseñado.

## Política de uso de los escenarios (2026-08-27)
Todo en **un solo script: `supabase/politica_uso_escenarios.sql`**.

⚠️ **Por qué uno solo.** Primero se escribieron tres (`ausencias_y_sanciones.sql`,
`bloqueos_horarios.sql`, `campos_academicos_perfil.sql`) y los tres reescribían la MISMA
función, `fn_validar_reserva_estudiante`, cada uno sumándole su chequeo. Correrlos en otro
orden hacía **perder validaciones en silencio**. Se consolidaron antes de correrlos y los
tres archivos se borraron. **Si agregás una regla nueva, va adentro de esa función: no
crees otro script que la reescriba.**

### Qué instala
1. **Perfil académico** — `facultad`, `carrera`, `codigo_unico` en `perfiles`. Reemplazan en
   la interfaz a `posicion` y `nivel_juego` ("Arquero / Mediocampista"), herencia del fútbol
   comercial. Las columnas viejas **no se borraron**. `facultad` habilita la tarjeta *Uso por
   facultad* del Dashboard, que es lo que le sirve a la unidad de deportes.
2. **Perfil obligatorio** — no se reserva con el perfil incompleto. ⚠️ Las columnas **no** son
   `NOT NULL` a propósito: el perfil lo crea `al_registrar_usuario` con solo id/email/nombre,
   y un `NOT NULL` rompería el registro. Se aplica al reservar y con una pantalla de bienvenida.
3. **Ausencias** — no hizo falta capturar ningún dato nuevo: una reserva es ausencia cuando
   está `confirmada`, `acceso_expira` ya pasó e `ingreso_at` sigue en `null`. Estado nuevo
   `ausente`. **Barrido perezoso sin cron:** `fn_marcar_ausencias()` corre dentro de la
   validación de una reserva nueva; pg_cron sería una pieza más que puede fallar en la defensa.
4. **Sanciones** — **3 ausencias → 15 días** sin reservar. Son dos constantes al principio de
   `fn_registrar_ausencia`. Al sancionar, `perfiles.ausencias` **vuelve a cero**: ese reseteo
   es lo que hace que la sanción se cumpla y termine. `ausencias_totales` guarda el histórico.
   Levantar una a mano: `UPDATE perfiles SET bloqueado_hasta=NULL, ausencias=0 WHERE email='…'`.
5. **Bloqueos** — tabla `bloqueos` + `fn_horario_bloqueado()`. *"Esta cancha (o TODAS, con
   `cancha_id` NULL) no se reserva entre estas fechas, en esta franja"*; sin horas = día
   completo. Pantalla `/admin/bloqueos`. ⚠️ **No cancela las reservas que ya existían.**

### En la app
- **`CompletarPerfil.jsx`**: pantalla que bloquea la app hasta cargar los datos. La dispara
  `MainLayout` con `perfilCompleto()` de `utils/perfil.js` — ⚠️ **esa lista de campos tiene
  que coincidir con la del SQL**; si agregás uno, cambialo en los dos lados. El admin no pasa
  por esta pantalla.
- **La credencial del QR** (`ReservaDetalle`) muestra nombre, código único, facultad y carrera,
  para que el encargado los contraste con el carné sin abrir otra pantalla.
  ⚠️ `reservas` tiene dos columnas que apuntan a `perfiles` (`perfil_id` y `validado_por`), así
  que el embed va explícito: `perfiles!reservas_perfil_id_fkey(...)`.
- **`/admin/reservas`**: botón *"No asistió"* para registrar la ausencia en el momento.
- **Dashboard**: tarjeta *Ausencias* y gráfico *Uso por facultad*.
- **`FACULTADES`** está en `config/institucion.js` — ⚠️ **verificá la lista contra la página
  oficial antes de entregar**, no salió de una fuente oficial.

### Sobre el código único
**9 dígitos exactos y sin repetir** (ejemplo: 202410216). Se impone en tres lugares:
- `CHECK perfiles_codigo_unico_formato` — el formato.
- `idx_perfiles_codigo_unico` — índice único **parcial** (`WHERE codigo_unico IS NOT NULL`),
  para que los perfiles todavía sin completar, que lo tienen en NULL, no choquen entre sí.
- El formulario filtra lo que no sea dígito al tipear y avisa cuántos faltan. Si el código ya
  existe, Postgres devuelve `23505` y la app lo traduce a *"ese código único ya está registrado
  por otra cuenta"* — el mensaje crudo de Postgres no se entiende.

⚠️ Si cambia la cantidad de dígitos hay que tocarlo en **dos** lugares: el CHECK del SQL y
`CODIGO_UNICO.digitos` en `config/institucion.js`.
Lo declara el estudiante; **no se valida contra ningún sistema de la EPN**. No hay API pública
y son datos personales (rige la LOPDP). Si algún día la DGIP da acceso institucional, la
llamada tiene que ir desde una **Edge Function**, nunca desde el navegador: cualquier
credencial en el front viaja en el bundle, igual que la anon key.

🔴 **Falta correr `politica_uso_escenarios.sql`.**

## Reglas de uso de los escenarios (2026-08-27)
Dos reglas propias del contexto universitario que la app comercial no tenía (allá,
cuanto más reservaras, mejor). Viven en `supabase/reglas_reserva_epn.sql`:

1. **Los escenarios no tienen precio.** La columna `canchas.precio_hora` **no se borró**
   (regla del proyecto), pero pasó a `DEFAULT 0` — era `NOT NULL` sin default, así que al
   sacar el campo del formulario del admin los INSERT habrían fallado. Toda la interfaz de
   precio quedó detrás de `FEATURES.PAGOS`: Home, `CanchaDetalle`, `CanchasAdmin` y la
   cabecera del `ReservaModal` ahora dicen **"Sin costo"**.
2. **Una hora por día y por estudiante**, en cualquier cancha. El selector de duración
   (1/2/3 horas) se quitó del `ReservaModal`: la duración es fija en 1 hora.

**Las dos las valida el trigger `trg_validar_reserva_estudiante`** (BEFORE INSERT en
`reservas`): rechaza reservas de más de una hora y las que choquen con otra del mismo día
del mismo estudiante (las `cancelada` no cuentan, así que puede volver a reservar).
A diferencia del trigger sobre `auth.users`, acá **PostgREST sí propaga el texto** del
`RAISE`, así que el estudiante ve el motivo real.

El front además consulta al elegir la fecha y muestra un aviso ámbar antes de que llene el
formulario, pero eso es solo UX: la regla la impone la base.

🔴 **Falta correr `reglas_reserva_epn.sql`.**

## Sin cobro: se apagó el módulo de pagos (2026-08-26)
La EPN no cobra por sus escenarios, así que `PAGOS` quedó en `false`. **No fue solo
bajar un flag**, porque el QR de acceso dependía del cobro:

⚠️ **La trampa:** el `acceso_token` lo generaba `fn_pago_cambia_estado()` al aprobar
el comprobante. Sin pagos, la reserva se quedaba `pendiente` para siempre y **el QR
no aparecía nunca** — justo el corazón del flujo de la tesis.

**Cómo quedó ahora:**
- `supabase/reservas_sin_pago.sql` → trigger `trg_reserva_confirmada` (BEFORE UPDATE
  en `reservas`): al pasar a `confirmada` genera el token, calcula el vencimiento
  (fin del horario, hora de Guayaquil) y avisa al estudiante.
- El admin confirma con el **botón "Confirmar"** que volvió a `/admin/reservas`. Ojo:
  ese botón se había quitado a propósito cuando la confirmación era automática; ahora
  aparece **solo con `PAGOS` apagado** (con pagos prendido vuelve el chip "Esperando pago").
- `ReservaModal` ya no crea la fila en `pagos` ni muestra la pantalla del comprobante:
  termina en un paso `listo` que dice que la reserva quedó pendiente de aprobación.
- El Dashboard esconde las tarjetas de ingresos y no consulta `pagos` (quedaría en cero
  para siempre). `Home`, `Login` y las FAQ de `Soporte` ya no hablan de pagar.

**Los dos caminos conviven.** Si `PAGOS` vuelve a `true`, `fn_pago_cambia_estado`
confirma la reserva como antes; el trigger nuevo respeta el token con `COALESCE` y
**no duplica la notificación** porque comprueba si la reserva tiene un pago asociado.
Ese `IF NOT EXISTS` es lo único que impide repetir el bug de junio (`trg_procesar_pago`).

🔴 **Se limpiaron datos personales del repo** (venían de La Fija y no pueden viajar en
una tesis que se entrega): la cuenta bancaria real en `config/pago.js` (banco, número,
titular, teléfono), el QR de DeUna `public/qr-pago.png` (borrado; sigue existiendo en
`canchas-app-final\public` si hiciera falta) y, en `Soporte.jsx`, un WhatsApp y dos
gmails personales hardcodeados. El contacto de soporte ahora sale de `CONTACTO` en
`config/institucion.js`, **vacío a propósito**: si no lo completás, Soporte no muestra
esas tarjetas y el ticket igual se guarda en `tickets_soporte`.

## Préstamo de implementos (construido para la tesis, 2026-08-26)
La tienda dejó de ser *venta con checkout por WhatsApp* (eso era de La Fija) y pasó a ser un
**préstamo con devolución**. Es lo único que se construyó de cero en esta versión.

**Cómo quedó el modelo:**
- El préstamo va **siempre atado a una reserva del propio estudiante**: el retiro es al inicio
  del horario y la devolución al final. Por eso `prestamos` **no tiene fechas propias** — se leen
  de `reservas`. Un índice único parcial impide dos préstamos vivos sobre la misma reserva.
- Flujo: `solicitado` → `aprobado` → `prestado` → `devuelto` (+ `rechazado` / `cancelado`).
  Espeja el flujo de pagos, que ya estaba probado.
- **El stock lo mueve la base, no el front:** `fn_prestamo_cambia_estado()` descuenta al ENTREGAR
  (y aborta si no alcanza) y repone al DEVOLVER **solo lo que volvió**. Si se pierde un balón, el
  stock queda bajo: eso es lo correcto. Al registrar una devolución hay que guardar los `devueltos`
  de cada ítem **antes** de cambiar el estado, porque el trigger los lee.
- `productos_tienda.precio` **ya no es precio de venta**: es el **valor de reposición**
  (referencial, por pérdida o daño). No se cobra nada y no se toca la tabla `pagos`.
- Nada se borró: la etiqueta "Tienda" pasó a "Implementos" en toda la UI y el checkout por
  WhatsApp se quitó de `Tienda.jsx`.

**Archivos:** `supabase/prestamos_implementos.sql` (🔴 hay que correrlo) · `src/utils/prestamos.js`
(estados, "atrasado" y totales — se calcula en el front, igual que la tabla de posiciones) ·
sección *Préstamos de implementos* en `src/services/supabaseService.js` ·
`src/pages/Tienda.jsx` (catálogo + "mochila" + pestaña "Mis préstamos") ·
`src/pages/admin/PrestamosAdmin.jsx` (ruta `/admin/prestamos`: bandejas por aprobar / por entregar /
en la calle / historial, con modal de devolución por unidad).

⚠️ **Ojo con el embed de `perfiles`:** `prestamos` tiene DOS FK a `perfiles` (`perfil_id` y
`atendido_por`), así que PostgREST no puede adivinar cuál usar. Hay que pedirlo explícito:
`perfiles!prestamos_perfil_id_fkey(nombre, email, telefono)`.

**Disponibilidad:** se muestra `stock` a secas. Un implemento aprobado pero todavía no entregado
sigue contando como disponible (recién sale de bodega al entregarlo). Para la tesis alcanza; si
alguna vez molesta, se resta lo comprometido en estado `aprobado`.

---
---

# 📖 Documentación heredada de La Fija (app comercial)

> Lo de abajo viene de la app original y **sigue siendo válido en su mayoría** (esquema
> de BD, flujo de pagos, estilos, PWA). Lo que hable de torneos, premios, sponsors,
> push, marketing o venta describe módulos que en la tesis están **apagados**.

## Canchas App — Contexto original

App web (PWA) de reservas de canchas deportivas con panel de cliente y admin.
**Esta carpeta (`canchas-app-final`) es la versión activa y definitiva.**
Recuperada el 2026-06-10 desde `Downloads\canchas-app-responsive` (la carpeta
`Desktop\MisProyectos\canchas-app` es una versión VIEJA de mayo — no usarla).

## Stack
- React 19 + Vite 8 (JavaScript), Tailwind CSS 3 (tema oscuro: `brand`, `surface`)
- Supabase (auth, DB, storage, realtime) — credenciales en `.env`
- React Router 7 (lazy), Framer Motion, react-hot-toast, lucide-react
- QR: `qrcode.react` (generar) + `html5-qrcode` (escanear) · Mapas: leaflet/react-leaflet

## Estructura clave
- `src/services/supabaseService.js` — capa de acceso a datos (usar esto, no supabase directo)
- `src/lib/notify.js` — toasts · `src/config/pago.js` — datos bancarios/QR de cobro (EDITAR con datos reales)
- `src/utils/` — formatters, geo, niveles, validators
- Rutas cliente: `/`, `/mis-reservas`, `/tienda`, `/premios`, `/torneos`, `/soporte`, `/perfil`, `/cancha/:id`, `/reserva/:id`
- Rutas admin: `/admin/...` (canchas, reservas, pagos, validar, promociones, productos, premios, sponsors, torneos)

## Flujo de reservas + pagos (simplificado el 2026-06-10)
1. Cliente reserva (reserva `pendiente` + pago `pendiente`) → ve QR con datos bancarios → sube comprobante.
2. Admin aprueba el pago en `/admin/pagos` (**1 solo click**) → un **trigger SQL** confirma la reserva, genera `acceso_token` + `acceso_expira` y notifica al cliente. Si rechaza → la reserva se cancela (libera horario) + notificación.
3. En la puerta: `/admin/validar` escanea el QR → **el ingreso se registra automáticamente al escanear** (sin botón extra).
- En ReservasAdmin NO hay botón "Confirmar" (se quitó a propósito); solo Cancelar / Marcar jugada.

### Triggers de pago en la BD (IMPORTANTE — leído de Supabase el 2026-06-10)
La tabla `pagos` tiene UN trigger activo que hace el trabajo al aprobar/rechazar:
- **`trg_pago_cambia_estado` → `fn_pago_cambia_estado()`** ← el bueno, definido en `supabase/migracion_flujo_pagos.sql`. Confirma la reserva, genera el QR (`acceso_expira` = fin del horario, hora de Guayaquil) y notifica.
- Había un trigger viejo DUPLICADO **`trg_procesar_pago` → `procesar_pago()`** que: (a) reventaba con *"column puntos does not exist"* porque hacía `UPDATE perfiles SET puntos = ...` (columna inexistente), y (b) generaba doble notificación. Se corrigió `procesar_pago()` (quitando la línea de puntos) y luego se ELIMINÓ el trigger duplicado. Scripts: `supabase/fix_procesar_pago.sql` y `supabase/fix_quitar_trigger_duplicado.sql`.
- La fidelización (puntos) la maneja SOLO `actualizar_fidelizacion()` (trigger sobre `reservas`): suma +1 a `reservas_completadas` al pasar a `completada`, y entrega premios a los 5 y 12. NO tocar pagos para sumar puntos.
- Si los QR no se generan o hay doble notificación al aprobar pagos, revisar primero qué triggers hay en `pagos`:
  `SELECT tgname FROM pg_trigger WHERE tgrelid='public.pagos'::regclass AND NOT tgisinternal;`
  ⚠️ **Corregido el 2026-08-26:** esta línea decía "debe quedar SOLO `trg_pago_cambia_estado`", y ya no es cierto — el módulo de push agregó `trg_notificar_admin_comprobante`, que es legítimo y viene en el instalador. **Lo correcto son 2**; el que no debe aparecer es `trg_procesar_pago`.

## Motor de Torneos (agregado 2026-06-23)
Sistema completo: **liga** (con tabla de posiciones), **eliminación directa** (llave/bracket), **relámpago** y **grupos**.
- **Tablas nuevas** (`supabase/torneos_motor.sql`, YA ejecutado): `equipos_torneo` (capitan_id→perfiles, estado inscrito/aprobado/rechazado, pagado, grupo), `partidos` (fixture y llaves: equipo_local_id/equipo_visitante_id, goles_*, estado programado/jugado, fase, ronda, orden, cancha_id), `goleadores_torneo`. Columnas nuevas en `torneos`: `tipo`, `categoria`, `costo_inscripcion`, `reglas`, `campeon_equipo_id`. El SQL **auto-detecta** si los id son int8 o uuid (DO block + `format()`). RLS: lectura pública; equipos los inscribe el capitán (estado 'inscrito'); partidos/goleadores solo el admin (`es_admin()`). Las 3 tablas están en la publicación realtime.
- **Notificaciones** (`supabase/torneos_notificaciones.sql`, ✅ ejecutado 2026-06-28): triggers SECURITY DEFINER que avisan al capitán al cargar resultado y al aprobar equipo.
- La **tabla de posiciones NO se guarda**: se calcula en el front (`src/utils/torneos.js`→`calcularPosiciones`). Ese archivo genera el fixture (`generarFixtureLiga` round-robin, `generarBracket`+`avanzarBracket`).
- **Capa de datos**: `src/services/torneosService.js`. **Rutas**: cliente `/torneos` y `/torneos/:id` (`TorneoDetalle`); admin `/admin/torneos` y `/admin/torneos/:id` (`TorneoDetalleAdmin`: aprobar equipos, generar fixture 1 click, cargar resultados, llaves, goleadores, campeón).
- Inscripción con pago: si `costo_inscripcion>0`, el cliente ve `PAGO_CONFIG` tras inscribirse y el admin marca `pagado` a mano (no usa la tabla `pagos`).
- La tabla vieja `inscripciones_torneos` quedó **obsoleta** (el motor usa `equipos_torneo`); no se borró para no perder datos.
- **PDF del torneo**: botón "PDF" (admin) y "Descargar PDF" (cliente) → `src/utils/torneoPdf.js` (jsPDF + jspdf-autotable, **import diferido**). Genera posiciones, calendario/resultados, goleadores y campeón.

## Notificaciones PUSH (agregado 2026-07-12) — ✅ **FUNCIONANDO** (verificado 2026-08-26)
Probado end-to-end el 2026-08-26: se reservó desde la computadora y **llegó el aviso al celular
con la app cerrada**. O sea: llaves VAPID en `.env`, `push_notificaciones.sql` corrido y Edge
Function desplegada — todo listo, no hay nada pendiente. Para montar una instancia nueva sí hay
que repetir esos pasos: ver `supabase/GUIA_PUSH.md`.
Avisos que llegan al celular **con la app cerrada** (Web Push + VAPID). Antes solo existía la campana in-app (tabla `notificaciones` + realtime), que se ve únicamente con la app abierta.
- **Eventos**: nueva reserva → al ADMIN · comprobante subido → al ADMIN · pago aprobado/rechazado → al CLIENTE (este último ya lo insertaba `fn_pago_cambia_estado`, ahora además dispara push).
- **Arquitectura**: trigger `trg_disparar_push` sobre `notificaciones` (AFTER INSERT) → `net.http_post` (pg_net) → Edge Function `enviar-push` → busca en `push_subscriptions` los aparatos de ese `usuario_id` → manda el push → el SW lo muestra. O sea: **cualquier INSERT en `notificaciones` genera push automáticamente**, no hay que tocar nada más para sumar avisos nuevos.
- ⚠️ **`fn_disparar_push()` DEBE llevar su `BEGIN ... EXCEPTION WHEN OTHERS` interno.** Si el `net.http_post` falla (URL mal, sin internet, Supabase caído), la excepción aborta la transacción que lo disparó y **el cliente no puede reservar** (pasó: "invalid URL … Bad hostname" al reservar, porque se corrió la plantilla con los placeholders sin reemplazar). El push tiene que fallar en silencio; la reserva y la notificación in-app se guardan igual. Arreglo: `supabase/fix_push_trigger.local.sql`.
- **SQL**: `supabase/push_notificaciones.sql` — tabla `push_subscriptions` (usuario_id, endpoint UNIQUE, p256dh, auth, user_agent) + RLS (cada uno ve solo los suyos; la Edge Function usa service_role y los ve todos) + triggers `trg_notificar_admin_nueva_reserva` (INSERT en `reservas`) y `trg_notificar_admin_comprobante` (UPDATE OF `comprobante_url` en `pagos`) que insertan una notificación **para cada perfil con `rol='admin'`** + `trg_disparar_push`. **Tiene 2 placeholders** (`<TU-PROJECT-REF>`, `<TU-SERVICE-ROLE-KEY>`) que hay que reemplazar antes de correrlo.
- **Edge Function**: `supabase/functions/enviar-push/index.ts` (Deno). Usa `npm:web-push` solo para **cifrar** (`generateRequestDetails`) y hace el envío con `fetch` — importante: Deno no tiene `node:https`, así que `webpush.sendNotification()` NO sirve acá. Borra sola las suscripciones muertas (404/410). Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- **Service worker**: `public/push-sw.js` (listeners `push` y `notificationclick`). NO se registra solo: lo carga el SW de Workbox vía `workbox.importScripts: ['/push-sw.js']` en `vite.config.js` (se agregó también `devOptions.enabled` para poder probar con `npm run dev`).
- **Front**: `src/lib/push.js` (activarPush/desactivarPush/yaSuscrito + detección de iOS) y `src/components/ActivarNotificaciones.jsx` (tarjeta con el botón; `<ActivarNotificaciones />` en `Perfil`, `<ActivarNotificaciones admin />` en el `Dashboard` admin). Clave pública en `.env` → `VITE_VAPID_PUBLIC_KEY`.
- **Limitaciones (documentadas en la guía)**: en **iPhone** el push solo anda si el usuario instala la PWA ("Agregar a inicio") — la app le muestra un aviso ámbar; requiere **HTTPS** (localhost sirve); el permiso se pide **con un click** (nunca al cargar) porque si el usuario bloquea no se puede volver a preguntar; la suscripción es **por aparato**, no por cuenta.

## Rediseño visual (2026-06-22/23)
- Tipografías: **Anton** (`font-display`, titulares; helper `.display-title` = mayúsculas), **Manrope** (`font-sans`), **Material Symbols** (íconos; componente `src/components/MSym.jsx` → `<MSym name="..." />`). Imports en `index.css`.
- Colores nuevos en `tailwind.config.js`: `pitch` (verde #19C37D dinero/éxito), `gold` (premios), `cat.blue/violet/teal` (categorías). El rojo de marca sigue en `brand`.
- Marca = **La Fija** (logo en `public/logo.png`, recortado/optimizado). Vistas rediseñadas: Login, Home (+HeroBanner con promos en el carrusel), AdminLayout, Dashboard.

## Esquema BD (ojo con estos nombres)
- **Alta de usuarios:** la fila de `perfiles` la crea el trigger **`al_registrar_usuario`** (`AFTER INSERT ON auth.users` → `crear_perfil_usuario()`, SECURITY DEFINER), que inserta `id, email, nombre` (de `raw_user_meta_data->>'nombre'`) y `rol='cliente'`. **El front NO inserta el perfil**: `Login.jsx` hace `UPDATE` sobre `perfiles` dando por hecho que ya existe. Admin = ascender a mano con `UPDATE perfiles SET rol='admin'`. Script: `crear_perfil_al_registrarse.sql`.
- `reservas.perfil_id` y `premios.perfil_id` (NO `user_id`) · `inscripciones_torneos.user_id` (OBSOLETA, ver Motor de Torneos)
- Torneos nuevos: `equipos_torneo.capitan_id`, `partidos.torneo_id`, `goleadores_torneo` (ver sección Motor de Torneos)
- Puntos = `perfiles.reservas_completadas` (NO existe columna `puntos`). Cualquier función/trigger que diga `puntos` está roto → usar `reservas_completadas`.
- Tipos de notificación que renderiza la campana: `reserva`, `cancelada`, `premio`, `promocion`, `info`
- Tablas: perfiles, canchas, reservas, pagos, validaciones_acceso, notificaciones, premios, productos_tienda, promociones, sponsors, torneos, inscripciones_torneos
- **Buckets de Storage (son 6, todos públicos):** `canchas`, `productos`, `promociones`, `sponsors`, `comprobantes`, **`avatars`**. El último es el que siempre se olvida (lo usa `usePerfil.js`, y sus políticas exigen subir a `{user.id}/archivo`).
- Diagnóstico útil: `supabase/diagnostico_puntos.sql` lista funciones/triggers que referencian `puntos` (correr bloques de a uno; el SQL Editor solo muestra el último resultado).

## Scripts SQL en `supabase/` (correr en Supabase > SQL Editor)
- `instalador_completo.sql` — **molde completo de la BD** (18 tablas, 15 funciones, 12 triggers de `public`, 45 políticas RLS, 0 datos). Generado el 2026-08-26 con `npx supabase db dump` (**necesita Docker Desktop prendido**; el CLI corre `pg_dump` en un contenedor). 🔐 **Son DOS archivos**: `instalador_completo.sql` es la **plantilla** (con `<TU-PROJECT-REF>` y `<TU-SERVICE-ROLE-KEY>`) y es la que se versiona; `instalador_completo.local.sql` tiene los valores reales y está en `.gitignore`. **Por qué:** el dump trae la `service_role` key en texto plano dentro de `fn_disparar_push()` — si se sube a GitHub, se filtra acceso total a la BD. Al regenerar el dump hay que **volver a censurarla**. ⚠️ **NO alcanza solo:** le falta el trigger de registro (ver la línea de abajo).
- `crear_perfil_al_registrarse.sql` — 🔴 **CRÍTICO para instancias nuevas.** Función `crear_perfil_usuario()` + trigger `al_registrar_usuario` sobre `auth.users`. Ya está activo en la BD de producción; el archivo se creó el 2026-08-26 al descubrir que **el trigger no estaba en ningún script**. Como vive en el esquema `auth` y `npx supabase db dump` exporta solo `public`, **el instalador no se lo lleva** → sin él nadie puede registrarse. Ver `COMO_MONTAR_CLIENTE_NUEVO.md` paso 2-bis.
- `migracion_flujo_pagos.sql` — trigger bueno de pagos (`fn_pago_cambia_estado`). **YA está ejecutado** en la BD.
- `fix_procesar_pago.sql` — corrige la función vieja `procesar_pago()` (quita el `puntos` roto). Ejecutado.
- `fix_quitar_trigger_duplicado.sql` — elimina el trigger duplicado `trg_procesar_pago`. Ejecutado.
- `diagnostico_puntos.sql` — solo lectura, para auditar referencias a `puntos`.
- `torneos_motor.sql` — tablas del motor de torneos (equipos/partidos/goleadores) + columnas + RLS + realtime. **YA ejecutado** (2026-06-23).
- `torneos_notificaciones.sql` — triggers de aviso a capitanes (resultado, equipo aprobado). ✅ **ejecutado** (2026-06-28).
- `agregar_categoria_productos.sql` — columna `categoria` (opcional) en `productos_tienda` para filtrar la tienda. ✅ **ejecutado** (2026-06-28).
- `recompensas_catalogo.sql` — tabla `recompensas_catalogo` (premios de fidelidad configurables: nivel, título, imagen, fechas, activa) + RLS + realtime. ✅ **ejecutado** (2026-06-28). El admin la gestiona en pestaña "Catálogo" de Premios; el cliente ve "lo que podés ganar" en `/premios` (`Recompensas.jsx`). NO cambia el trigger de fidelización (los premios se siguen otorgando a las 5 y 12).
- `datos_demo.sql` — **datos de ejemplo para las demos de venta** (3 canchas zona Pichincha, productos, promos en el carrusel, y un torneo "Copa La Fija - Apertura" tipo liga con 4 equipos, fixture, resultados y goleadores). IDEMPOTENTE (`WHERE NOT EXISTS` + un `DO` con `torneos.id%TYPE` para soportar id int8/uuid; omite `categoria` en productos por si no se corrió `agregar_categoria_productos.sql`; el catálogo solo si existe la tabla). Imágenes vía placehold.co. Va de la mano con la carpeta `marketing/`.
- `borrar_datos_demo.sql` — elimina exactamente lo que insertó `datos_demo.sql` (borrar el torneo arrastra equipos/partidos/goleadores por CASCADE).
- `limpiar_movimiento_cliente_nuevo.sql` — **deja la app en cero para entregarla a un cliente nuevo**. Borra SOLO el movimiento (`reservas`, `pagos`, `validaciones_acceso`, `notificaciones`, `premios`, `tickets_soporte`), reinicia las secuencias de id y pone `perfiles.reservas_completadas = 0`. NO toca los catálogos (canchas, productos, promos, sponsors, recompensas, torneos) ni los usuarios. Como el Dashboard admin calcula TODO en el front desde `reservas`/`pagos`/`perfiles`/`canchas` (no hay nada cacheado ni hardcodeado), al vaciar esas tablas las métricas y gráficos quedan en cero solos. Trae comentados dos bloques opcionales: vaciar el bucket `comprobantes` del Storage y borrar los torneos. Idempotente.
- `rol_guardia_y_sanciones.sql` — **TESIS: rol `guardia` + interruptor de sanciones.** Agrega el rol al CHECK de `perfiles`, la columna `activo`, la función `es_personal()` y las políticas RLS para que el guardia pueda validar QR y nada más. Crea la tabla `configuracion` (fila única) con `sanciones_activas`, que **arranca APAGADO** a propósito. 🔴 **Falta correrlo.** Idempotente.
- `politica_uso_escenarios.sql` — **TESIS: toda la política de uso en un archivo.** Perfil académico (`facultad`, `carrera`, `codigo_unico`), perfil obligatorio para reservar, ausencias (estado `ausente` + barrido sin cron), sanciones (3 → 15 días), bloqueos de horario y las reglas de 1 hora / 1 por día. Define `fn_validar_reserva_estudiante` **una sola vez, con todo adentro**. 🔴 **Falta correrlo.** Idempotente.
- `reservas_sin_pago.sql` — **TESIS: el QR de acceso se genera al CONFIRMAR la reserva** (`trg_reserva_confirmada`), no al aprobar un pago. Es lo que reemplaza a `fn_pago_cambia_estado` con `PAGOS` apagado. Trae un `IF NOT EXISTS` sobre `pagos` para no duplicar el aviso si algún día se reactiva el cobro. 🔴 **Falta correrlo.** Idempotente.
- `prestamos_implementos.sql` — **TESIS: préstamo de implementos con devolución.** Tablas `prestamos` y `prestamo_items`, trigger `fn_prestamo_cambia_estado` (stock: descuenta al entregar, repone solo lo devuelto), triggers de notificación al admin y al estudiante, RLS (cada uno ve lo suyo; escribe el admin) y realtime. 🔴 **Falta correrlo en Supabase.** Idempotente.
- `verificar_instalacion.sql` — **solo lectura.** UNA sola consulta que revisa todo el montaje (estructura, trigger de registro, buckets + políticas de Storage, préstamos, cierre del registro a `@epn.edu.ec`, admin creado, trigger duplicado de pagos, RLS) y devuelve una fila por chequeo con ✅/❌ y qué script falta correr. Es lo primero a correr cuando algo no anda.
- `storage_buckets_politicas.sql` — 🔴 **crea los 6 buckets y sus políticas de subida.** El instalador NO las trae (`db dump` exporta solo `public`; Storage vive en el esquema `storage`). Sin esto un bucket público deja leer pero no subir → fallan foto de cancha, comprobante y avatar con *"new row violates row-level security policy"*. Idempotente.
- `restringir_registro_epn.sql` — **TESIS: solo se registran correos `@epn.edu.ec`.** Trigger `validar_correo_institucional` (BEFORE INSERT en `auth.users`) + tabla `correos_autorizados` para las excepciones. 🔴 **Falta correrlo**, y además hay que desactivar Google en el panel. Idempotente.
- `push_notificaciones.sql` — notificaciones push (tabla `push_subscriptions`, triggers de aviso al admin, disparo de la Edge Function). ✅ **ejecutado y verificado** (2026-08-26, llega el push con la app cerrada) — ver `GUIA_PUSH.md`. 🔐 Este archivo es la **plantilla con placeholders**: las claves reales van en `push_notificaciones.local.sql` (el patrón `*.local.sql` está en `.gitignore`, porque el PASO 4 lleva la `service_role` key y NO puede subirse a GitHub).
- `fix_seguridad_catalogos_rls.sql` — **blinda el RLS** de los catálogos que edita el admin (`canchas`, `productos_tienda`, `promociones`, `sponsors`, `recompensas_catalogo`): activa RLS, borra políticas viejas/inseguras y deja exactamente lectura pública + escritura solo `es_admin()`. ✅ **ejecutado y verificado** (2026-06-28, 2 políticas por tabla). Complementa a `fix_seguridad_rls.sql` (que ya cubre pagos/reservas/perfiles).

## Marketing / venta (carpeta `marketing/`, agregada 2026-06-28)
Kit para vender la app a dueños de canchas (no es parte de la app): `flyer.html` y `precios.html` (A4 imprimibles a PDF, Ctrl+P), `landing/index.html` (landing de venta con botón WhatsApp, configurable en `window.LAFIJA`), `whatsapp-plantillas.md`, `lista-canchas-pichincha.md` (prospectos reales Quito/Cumbayá/Valle), `guia-demo.md` (recorrido de la demo) y `LEEME.md`. Todo en español de Ecuador (tú). Precio sugerido: **plan único "Todo Incluido" $39/mes**, primer mes de prueba, instalación gratis. **Pendiente del usuario:** decidir multi-tenant (hoy la app es mono-complejo; el plan a futuro es Super Admin + auto-gestión por negocio + home pública tipo Airbnb).

## Tienda (rework 2026-06-23)
> ⚠️ **Desactualizado en la tesis.** Lo de abajo describe la tienda como *venta* (carrito +
> checkout por WhatsApp). En esta versión `Tienda.jsx` es **préstamo con devolución** — ver la
> sección *Préstamo de implementos* más arriba. Lo que sigue valiendo es todo lo del admin
> (`ProductosAdmin`: categorías, editar, toggle activo/inactivo).

- `src/pages/Tienda.jsx` ahora tiene **carrito** (persistido en localStorage `carrito_tienda`), **cantidades** (respeta stock), **badges de stock** ("Agotado"/"Quedan X"), **buscador**, **filtro por categoría** (si hay), **modal de detalle** y **checkout único por WhatsApp** (un solo mensaje con todo el pedido + total, usa `PAGO_CONFIG.telefono`). El admin (`ProductosAdmin`) tiene campo `categoria` (datalist con las existentes), **editar** producto (botón Editar → mismo modal, update vs insert; conserva `imagen_url` si no se sube otra), **toggle activo/inactivo** (clic en el badge de la tarjeta o checkbox en el modal). `categoria` solo se manda al payload si está completa (resiliente si no se corrió `agregar_categoria_productos.sql`). Nota: `src/pages/admin/TiendaAdmin.jsx` es un archivo VIEJO sin rutear (no se usa; el activo es `ProductosAdmin`).

## Horarios por cancha (2026-06-28)
Antes el horario estaba FIJO en el código (8:00–22:00 todos los días) → se veía poco profesional. Ahora es **configurable por cancha**:
- **SQL** (`supabase/agregar_horarios_canchas.sql`, ✅ ejecutado 2026-06-28): agrega a `canchas` las columnas `hora_apertura time`, `hora_cierre time` y `dias_atencion smallint[]` (valores 0=Dom..6=Sáb, igual que `Date.getDay()`). Default: 08:00–22:00 todos los días (no rompe canchas viejas).
- **Helper** `src/utils/horarios.js`: `horariosBase(cancha)`, `cierreInt/aperturaInt`, `diasAtiende`, `atiendeFecha`/`atiendeHoy`, `formatHorario` (→ `{diasTxt, horas}` tipo "Lun a Sáb · 08:00–22:00"), `nombreDia`, `DIAS`. Si la cancha no trae los datos, asume 8–22 todos los días.
- **Admin** (`CanchasAdmin`): el modal tiene inputs de hora Abre/Cierra y toggles de días (Lun..Dom); valida ≥1 día. **Requiere correr el SQL** (si no, el guardar falla por columna inexistente).
- **Cliente**: `ReservaModal` genera los slots según apertura/cierre de la cancha y bloquea los días que no atiende (muestra aviso ámbar "no atiende los domingos"). `CanchaDetalle` muestra el horario real y "Cerrado hoy" cuando corresponde.

## Editar en admin (2026-06-28)
Todas las secciones que crean entidades ahora permiten **editar**: Canchas, Productos, Promociones, Torneos, Catálogo de recompensas (ya lo tenían) + **Sponsors** (`SponsorsAdmin`: botón Editar → modal update vs insert, conserva el logo si no se sube otro) y **equipos de torneo** (`TorneoDetalleAdmin`: botón ✏️ renombra vía prompt con `actualizarEquipo`). Goleadores se editan inline (+/−). Las secciones que NO editan a propósito: Pagos (aprobar/rechazar), Reservas (cancelar/marcar jugada), Soporte (responder/cerrar), Premios ganados (marcar entregado) — ahí no se "edita" la entidad.

## UI / tema (notas de estilo)
- Tema oscuro global. Clases reutilizables en `src/index.css` (`@layer components`): `.input`, `.btn-*`, `.card`, `.badge-*`, `.label`.
- Las `<option>` de los `<select className="input">` se estilan oscuras vía regla `.input option` en `index.css` (Chrome/Edge en Windows las respetan; Firefox/Safari las limitan).
- **Leaflet vs modales:** el contenedor de `MapaCancha` lleva `relative z-0` para encerrar los z-index internos de Leaflet (sus controles llegan a 1000). Los modales que puedan abrirse sobre un mapa deben usar z-index alto: `ReservaModal` usa `z-[1100]`.

## PWA / caché (DEBUGGING)
- Es una PWA con **service worker** (`vite-plugin-pwa`, genera `dist/sw.js`). El SW cachea JS/CSS → tras cambiar código, un refresh normal puede seguir mostrando lo viejo.
- Para ver cambios: reiniciar `npm run dev`, DevTools (F12) → Application → Service Workers → Unregister (o "Update on reload"), y recargar con Ctrl+Shift+R. Si persiste: Application → Storage → "Clear site data".

## Pendientes
- [x] Ejecutar `supabase/migracion_flujo_pagos.sql` en Supabase — hecho (el trigger ya existía).
- [x] `git init` + subir a GitHub — HECHO (2026-06-10). Repo PRIVADO: https://github.com/AlejandroFabara/canchas-app · rama `main` · commits con `fabaraaalejandro@gmail.com`. Ojo: la PC tenía cacheada la cuenta `alejoturip` (sin acceso); si vuelve a fallar el push con "Repository not found", correr `cmdkey /delete:git:https://github.com` y reloguear como `AlejandroFabara`.
- [ ] Probar flujo completo end-to-end: reservar → aprobar pago (1 sola notificación) → ver QR → escanear.
- [x] **Activar el push** — HECHO y verificado el 2026-08-26 (llega el aviso con la app cerrada). Para una instancia nueva hay que repetirlo: ver `supabase/GUIA_PUSH.md`.
- [x] Arreglado el realtime de canchas en `Home.jsx` (decía `'postgres'`, ahora `'postgres_changes'`) — 2026-08-26.
- [x] **Generar el instalador** — HECHO el 2026-08-26 (`npx supabase db dump`, requiere Docker Desktop prendido). 18 tablas, 15 funciones, 12 triggers, 45 políticas RLS, sin datos. Ver la entrada de `instalador_completo.sql` más arriba: **son 2 archivos** (plantilla + `.local`) y **le falta el trigger de registro a propósito**.

## Comandos
- `npm run dev` · `npm run build` · `npm run lint`
