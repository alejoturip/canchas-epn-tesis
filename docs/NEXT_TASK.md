# NEXT_TASK.md — Qué sigue (actualizado 2026-08-27)

> Reemplaza al roadmap viejo, que era de "La Fija" (junio) y hablaba de checkout,
> cobros y multi-tenant. Esto es lo que le falta a la **versión tesis**.
>
> Estado general: la app corre, la base está montada y **todos los scripts SQL
> están corridos**. Falta probarla de punta a punta y cerrar detalles de entrega.

---

## 🔴 PRIMERO: respaldo (15 min, hacelo antes que nada)

Hoy vacié un archivo por un error y se pudo recuperar **solo porque existía una
copia en `canchas-app-final`**. El repo todavía no tiene ni un commit: cualquier
error es irreversible.

```bash
git init
git add .
git status          # ← MIRAR ESTO antes de commitear
git commit -m "PoliSport EPN: versión tesis"
```

**Qué revisar en `git status` antes de confirmar** (ya está todo en `.gitignore`,
pero verificalo con los ojos):
- `.env` **NO** debe aparecer. Tiene la URL y la anon key de tu Supabase.
- Ningún `*.local.sql` (llevan la service_role key).
- `node_modules`, `dist`, `dev-dist` tampoco.

Verificado hoy: los `.sql` del repo solo tienen los placeholders
`<TU-PROJECT-REF>` y `<TU-SERVICE-ROLE-KEY>`, no claves reales.

**Detalle aparte (2 min):** `.env.example` tiene una URL y una anon key que
parecen reales. La anon key es pública por diseño (la protege el RLS), pero en
un repo de tesis que se entrega conviene dejar placeholders. Tus valores reales
viven en `.env`, que no se versiona.

---

## 🔴 SEGUNDO: prueba de punta a punta (1-2 h)

Es la tarea #1 pendiente desde junio y **nunca se hizo completa**. Nada de lo
construido en los últimos dos días se probó contra la base real.

Necesitás **dos cuentas**: tu admin y una de estudiante. Para la segunda, si el
correo de la EPN es Google Workspace te sirve `tunombre+prueba@epn.edu.ec`; si
no, metés un correo en `correos_autorizados` desde el SQL Editor.

### Recorrido, en orden

| # | Con quién | Qué | Qué tiene que pasar |
|---|---|---|---|
| 1 | estudiante | Registrarse | Al entrar, **no llega al inicio**: aparece "Completá tu perfil" |
| 2 | estudiante | Poner un código de 8 dígitos | El campo se pone rojo y el botón queda bloqueado |
| 3 | estudiante | Poner el código de la otra cuenta | *"Ese código ya está registrado por otra cuenta"* |
| 4 | estudiante | Completar bien y guardar | Entra a la app sin recargar |
| 5 | estudiante | Reservar una cancha | Solo ofrece 1 hora · dice "Sin costo" |
| 6 | estudiante | Reservar otra vez el mismo día | Aviso ámbar + botón bloqueado |
| 7 | **admin** | `/admin/reservas` → **Confirmar** | El estudiante recibe notificación |
| 8 | estudiante | `/reserva/:id` | **Aparece el QR** con nombre, código, facultad y carrera |
| 9 | **admin** | `/admin/validar` → escanear | Registra el ingreso solo, sin botón extra |
| 10 | estudiante | `/tienda` → mochila → pedir | Se ata a la reserva |
| 11 | **admin** | `/admin/prestamos` → aprobar → entregar | **Baja el stock** en `/admin/productos` |
| 12 | **admin** | Registrar devolución | **Vuelve el stock** |
| 13 | **admin** | `/admin/bloqueos` → bloquear mañana entero | El estudiante ya no puede reservar ese día |
| 14 | **admin** | Reserva confirmada → **No asistió** | Le llega "1 de 3" al estudiante |

**Lo más probable que falle:** el paso 11-12 (préstamos) y el 13-14, que son
código nuevo y nunca corrieron contra la base.

### Probar la sanción sin esperar
Para no esperar tres días, forzalo desde el SQL Editor:

```sql
-- Dar 2 ausencias y que la tercera dispare la sanción
UPDATE public.perfiles SET ausencias = 2 WHERE email = 'estudiante@epn.edu.ec';
-- Después marcá una reserva como "No asistió" desde /admin/reservas
-- y comprobá que queda bloqueado_hasta = hoy + 15

-- Volver todo atrás
UPDATE public.perfiles SET ausencias = 0, bloqueado_hasta = NULL
 WHERE email = 'estudiante@epn.edu.ec';
```

También podés forzar el barrido automático de ausencias sin esperar:
`SELECT public.fn_marcar_ausencias();`

---

## 🟠 TERCERO: iconos y peso (30 min)

- **`logo.png` pesa 1.2 MB** y es el archivo más grande de la app (el build entero
  son 1.7 MB). Se muestra a 176 px como máximo: **exportalo a 400×400** y bajás
  más de 1 MB. PNG con transparencia.
- **Faltan los iconos de la PWA.** Se borraron de `public/` y hoy el manifest
  apunta al logo completo, que no es cuadrado:
  - `icon-192.png` — 192×192 exacto
  - `icon-512.png` — 512×512 exacto
  - `apple-touch-icon.png` — 180×180, **sin transparencia** (iOS pinta negro detrás)
  - Para el `maskable` de Android, dejá ~20 % de margen: le recorta un círculo.
- Cuando existan, avisame y los declaro en `vite.config.js` (es una edición).
- **Versión compacta del logo** (solo escudo + "POLISPORT EPN", sin el eslogan)
  como `public/logo-compacto.png`. En un header de 64 px el eslogan queda
  ilegible. Después es cambiar una línea en `config/marca.js`.

---

## 🟡 CUARTO: detalles de entrega

- **Revisar la app en celular** (F12 → Ctrl+Shift+M). Nunca se vio en pantalla:
  ni el tema claro ni el logo nuevo ni las pantallas nuevas. Mirar sobre todo el
  header con el logo cuadrado, el menú inferior (*"Implementos"* es la etiqueta
  más larga) y la credencial del QR, que mide 210 px fijos.
- **Cargar datos de verdad**: canchas con foto y horario real, e implementos con
  unidades y valor de reposición.
- **Actualizar el documento de identidad** que escribiste: todavía habla de
  comprobante de pago (secciones 10, 17 y 19) y de 5 estados de préstamo, cuando
  son 4. Ver el detalle en la respuesta del chat de hoy.

---

## ⛔ Fuera de alcance (decidido, no volver sobre esto)

- **Fidelización** (puntos y premios): premia reservar más, y contradice la regla
  de una hora por día. Si alguien lo nota en la defensa es difícil de responder.
- **Torneos**: el motor está completo y probado, pero prenderlo agranda el alcance.
  Se presenta como trabajo futuro **ya construido**, que suena mejor.
- **Push**: funciona, pero necesita VAPID + Edge Function + HTTPS y no anda en
  iPhone sin instalar la PWA. Es la pieza más frágil para una demo en vivo.
  La campana in-app lo cubre.
- **API de la EPN** para validar el código del estudiante: no existe pública y son
  datos personales (LOPDP). Si la DGIP diera acceso, la llamada tendría que ir
  desde una **Edge Function**, nunca desde el navegador.

---

## Definición de "listo para entregar"

1. Un commit en git (y ojalá subido a un repo privado).
2. El recorrido de 14 pasos, sin errores.
3. Iconos de la PWA y logo optimizado.
4. Revisado en celular.
5. `verificar_instalacion.sql` con ✅ del 1 al 12 y del 15 al 19.
