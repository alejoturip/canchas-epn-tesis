# DATABASE.md — Esquema, triggers y funciones (Supabase / Postgres)

> ⚠️ **Nota de método:** el esquema de abajo está **inferido del uso real en el código** (queries en `supabaseService.js`, hooks y páginas) y de los scripts en `supabase/`. Los tipos marcados con `?` son probables pero no verificados contra el `information_schema`. Para confirmar columnas exactas, correr en Supabase:
> ```sql
> SELECT table_name, column_name, data_type FROM information_schema.columns
> WHERE table_schema='public' ORDER BY table_name, ordinal_position;
> ```

---

## Convenciones clave (memorizar)

- **Puntos de fidelización = `perfiles.reservas_completadas`.** NO existe columna `puntos`.
- FKs a usuario: **`reservas.perfil_id`**, **`premios.perfil_id`**, **`pagos.usuario_id`**, **`notificaciones.usuario_id`**. Excepción: **`inscripciones_torneos.user_id`**.
- `id` de `perfiles` = `id` del usuario de Supabase Auth (relación 1:1 con `auth.users`).

---

## Tablas

### `perfiles`
Perfil del usuario (extiende `auth.users`). Se crea al registrarse.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | = `auth.users.id` |
| `nombre` | text | mostrado en header/saludo |
| `email` | text | |
| `avatar_url` | text? | bucket `avatars` |
| `rol` | text | `'admin'` o cliente (default no-admin). `ProtectedRoute` exige `rol==='admin'` |
| `reservas_completadas` | int | **puntos de fidelización** (default 0) |
| `telefono` | text? | opcional |
| `created_at` | timestamptz | |

### `canchas`
Canchas deportivas reservables.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | ordenado por `id` |
| `nombre` | text | |
| `descripcion` | text? | |
| `imagen_url` | text? | |
| `direccion` | text? | |
| `precio_hora` | numeric | usado para calcular total |
| `latitud` | float? | mapa / distancia |
| `longitud` | float? | mapa / distancia |
| `activa` | bool | solo las `true` se muestran al cliente |
| `created_at` | timestamptz | |

### `reservas`
Reserva de una cancha en una franja horaria.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `perfil_id` | uuid (FK→perfiles) | dueño de la reserva |
| `cancha_id` | bigint (FK→canchas) | |
| `fecha` | date | |
| `hora_inicio` | time | |
| `hora_fin` | time | |
| `estado` | text | `pendiente` → `confirmada` → `completada`; o `cancelada` |
| `acceso_token` | uuid? | QR de acceso (lo genera el trigger al aprobar el pago) |
| `acceso_expira` | timestamptz? | vence al terminar el horario (hora de Guayaquil) |
| `ingreso_at` | timestamptz? | sello al validar el QR en puerta |
| `validado_por` | uuid? | admin que validó |
| `created_at` | timestamptz | |

**Estados:** `pendiente` (recién creada), `confirmada` (pago aprobado, con QR), `completada` (jugada — dispara fidelización), `cancelada` (libera el horario).

### `pagos`
Solicitud de pago asociada a una reserva.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `reserva_id` | bigint (FK→reservas) | |
| `usuario_id` | uuid (FK→perfiles) | quien paga |
| `monto` | numeric | precio_hora × duración |
| `estado` | text | `pendiente` → `aprobado` \| `rechazado` |
| `comprobante_url` | text? | bucket `comprobantes` |
| `metodo_pago` | text? | `DeUna` / `Transferencia bancaria` / `Efectivo` |
| `created_at` | timestamptz | |

### `validaciones_acceso`
Historial de ingresos a la cancha (auditoría de la puerta).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `reserva_id` | bigint (FK→reservas) | |
| `validado_por` | uuid | admin |
| `estado_final` | text | `'ingreso'` |
| `created_at` | timestamptz | |

### `notificaciones`
Notificaciones in-app (campana). Insertadas por triggers o por la app.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `usuario_id` | uuid (FK→perfiles) | destinatario |
| `titulo` | text | |
| `mensaje` | text? | |
| `tipo` | text | `reserva` \| `cancelada` \| `premio` \| `promocion` \| `info` (otros no renderizan icono) |
| `enlace` | text? | ruta a la que navega al hacer clic |
| `leida` | bool | default false |
| `created_at` | timestamptz | |

### `premios`
Premios de fidelización ganados por el usuario.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `perfil_id` | uuid (FK→perfiles) | |
| `descripcion` | text | ej: "Gatorade gratis" |
| `tipo` | text | `basico` \| `premium` |
| `estado_canje` | text | `pendiente` \| (canjeado) |
| `created_at` | timestamptz | |

### `productos_tienda`
Catálogo de implementos. **En la versión TESIS no se venden, se prestan** (ver `prestamos`).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `nombre` | text | |
| `descripcion` | text? | |
| `precio` | numeric? | **valor de reposición** (referencial, no se cobra) |
| `imagen_url` | text? | bucket `productos` |
| `stock` | int | unidades disponibles; baja al ENTREGAR y sube al DEVOLVER |
| `categoria` | text? | filtro del catálogo (`agregar_categoria_productos.sql`) |
| `activa` | bool | cliente solo ve `activa = true` |
| `created_at` | timestamptz | |

### `prestamos`
Pedido de implementos, **siempre atado a una reserva del propio estudiante** (el retiro es al
inicio del horario y la devolución al final, por eso no hay fechas propias).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `perfil_id` | uuid (FK→perfiles) | quien pide |
| `reserva_id` | uuid (FK→reservas) | índice único parcial: 1 solo préstamo vivo por reserva |
| `estado` | text | `solicitado` → `aprobado` → `prestado` → `devuelto`; o `rechazado`/`cancelado` |
| `observaciones` | text? | nota del estudiante |
| `motivo_rechazo` | text? | lo escribe el admin al rechazar |
| `nota_devolucion` | text? | estado en que volvieron los implementos |
| `aprobado_at` / `entregado_at` / `devuelto_at` | timestamptz? | los pone el trigger solo |
| `atendido_por` | uuid? (FK→perfiles) | admin que atendió |
| `created_at` | timestamptz | |

### `prestamo_items`
Renglones del préstamo. Guardan **copia** del nombre y del valor: si borran el producto, el historial sobrevive.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | |
| `prestamo_id` | uuid (FK→prestamos) | ON DELETE CASCADE |
| `producto_id` | uuid? (FK→productos_tienda) | ON DELETE SET NULL |
| `nombre` | text | copia al momento de pedir |
| `valor_reposicion` | numeric | copia del `precio` |
| `cantidad` | int | > 0 |
| `devueltos` | int | cuántas unidades volvieron (0 ≤ devueltos ≤ cantidad) |
| `created_at` | timestamptz | |

### `promociones`
Promociones mostradas al cliente. (Columnas según `SELECT *` en admin: incluye `imagen_url`, `created_at`.)

### `sponsors`
Patrocinadores (banner marquee + carrusel en Home/Torneos + página `/sponsors`).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `nombre` | text | nombre de la marca |
| `descripcion` | text? | texto en las tarjetas (script `agregar_campos_sponsors.sql`) |
| `enlace` | text? | URL del sitio del sponsor (logos/tarjetas clickeables) |
| `imagen_url` | text | bucket `sponsors` |
| `created_at` | timestamptz | |

### `torneos`
Torneos. Ordenados por `fecha_inicio`. Incluye conteo de inscripciones vía relación.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `nombre` | text? | |
| `fecha_inicio` | date/timestamptz? | orden |
| `created_at` | timestamptz | |

### `inscripciones_torneos`
Inscripción de un usuario a un torneo.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | |
| `torneo_id` | bigint (FK→torneos) | |
| `user_id` | uuid | ⚠️ se llama `user_id` (NO `perfil_id`) |
| `created_at` | timestamptz | |

### `tickets_soporte`
Mensajes de soporte enviados desde `/soporte`. Definida en `supabase/crear_tickets_soporte.sql` (con RLS). El cliente puede INSERT su propio ticket; el admin (rol `admin`) puede SELECT/UPDATE todos. Se ven en `/admin/soporte`.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint (PK) | identity |
| `user_id` | uuid (FK→auth.users) | autor (puede ser null) |
| `email` | text | email del autor |
| `asunto` | text | |
| `mensaje` | text | |
| `estado` | text | `'abierto'` \| `'resuelto'` |
| `created_at` | timestamptz | |

> Además de guardar en la BD, el formulario abre **WhatsApp** con el ticket pre-armado hacia el número del negocio (entrega inmediata).

---

## Buckets de Storage
- `comprobantes` — comprobantes de pago (`{user_id}/comp-{pagoId}-{ts}.ext`).
- `avatars` — fotos de perfil (`{user_id}/avatar-{ts}.ext`). RLS exige carpeta = user id.
- `productos` — imágenes de productos.
- `sponsors` — logos de sponsors.

---

## Triggers y funciones SQL

### ✅ `fn_reserva_confirmada()` → trigger `trg_reserva_confirmada` (BEFORE UPDATE en `reservas`)
**Es el que genera el QR en la versión TESIS.** Al pasar la reserva a `confirmada` pone
`acceso_token` y `acceso_expira` (fin del horario, hora de Guayaquil) y notifica al estudiante.
Existe porque con `PAGOS` apagado nadie generaba el token: esa era tarea de `fn_pago_cambia_estado`.
No inserta la notificación si la reserva tiene una fila en `pagos` — así los dos caminos conviven
sin duplicar avisos.

### ⛔ `fn_pago_cambia_estado()` → trigger `trg_pago_cambia_estado` (inactivo en la tesis)
Sigue en la base y funcionando, pero con `PAGOS` apagado no se crean filas en `pagos`, así que
nunca se dispara. Lo de abajo describe cómo opera si se reactiva el cobro.

### `fn_pago_cambia_estado()` → trigger `trg_pago_cambia_estado`
**EL TRIGGER BUENO Y ACTIVO.** Definido en `supabase/migracion_flujo_pagos.sql`.
- **Evento:** `AFTER UPDATE OF estado ON pagos`.
- **Si `estado` pasa a `aprobado`:** actualiza la reserva → `estado='confirmada'`, genera `acceso_token` (`gen_random_uuid()`) y fija `acceso_expira = (fecha + hora_fin) AT TIME ZONE 'America/Guayaquil'`. Inserta notificación tipo `reserva` con enlace `/reserva/{id}`.
- **Si `estado` pasa a `rechazado`:** reserva → `cancelada` (libera horario) + notificación tipo `cancelada`.
- `SECURITY DEFINER` (ignora RLS).

### ✅ `actualizar_fidelizacion()` → trigger sobre `reservas`
Maneja **toda** la economía de puntos. **NO tocar pagos para sumar puntos.**
- **Evento:** cuando `reservas.estado` pasa a `completada` (botón "Marcar jugada" en `/admin/reservas`).
- **Acción:** `perfiles.reservas_completadas += 1`. Luego:
  - Si llega a **5** → inserta premio `tipo='basico'` ("Gatorade gratis").
  - Si llega a **≥12** → inserta premio `tipo='premium'` ("1 hora de cancha gratis") y **reinicia `reservas_completadas = 0`**.

### ⚠️ `procesar_pago()` → trigger `trg_procesar_pago` (ELIMINADO)
Trigger viejo, **duplicado** de `fn_pago_cambia_estado`. Causaba el error `column "puntos" does not exist` (hacía `UPDATE perfiles SET puntos = ...`) y **doble notificación**. 
- Se corrigió la función (quitando la línea de `puntos`) con `supabase/fix_procesar_pago.sql`.
- Se eliminó el trigger con `supabase/fix_quitar_trigger_duplicado.sql`.
- **La función sigue existiendo pero inerte** (sin trigger que la dispare). No volver a crear el trigger.

---

### ✅ `validar_correo_institucional()` → trigger `validar_correo_institucional` (BEFORE INSERT en `auth.users`)
Rechaza con excepción cualquier registro cuyo correo no termine en `@epn.edu.ec` (acepta
subdominios) y no esté en `correos_autorizados`. Corre **antes** que `al_registrar_usuario`, así
que si aborta no queda un perfil huérfano. **No afecta a las cuentas ya creadas.**

### ✅ `fn_prestamo_cambia_estado()` → trigger `trg_prestamo_cambia_estado` (BEFORE UPDATE en `prestamos`)
Mueve el stock y sella los timestamps. Al pasar a **`prestado`** descuenta `cantidad` de cada ítem
(y **aborta con excepción** si no alcanza: ese mensaje es el que ve el admin). Al pasar a
**`devuelto`** repone únicamente `devueltos` — lo que se perdió queda descontado, que es lo correcto.
Por eso, al registrar una devolución, **primero se guardan los `devueltos` de cada ítem y recién
después se cambia el estado**.

### ✅ `fn_prestamo_solicitado()` / `fn_prestamo_avisa_cliente()`
Notifican por la campana: al admin cuando entra un pedido, al estudiante en cada cambio de estado.
Como todo entra por `notificaciones`, con `PUSH` prendido el aviso también sale al celular.

## Scripts SQL en `supabase/`
| Script | Qué hace | Estado |
|---|---|---|
| `migracion_flujo_pagos.sql` | Crea `fn_pago_cambia_estado` + `trg_pago_cambia_estado`. | **Ejecutado** |
| `fix_procesar_pago.sql` | Corrige la función vieja `procesar_pago` (quita `puntos`). | Ejecutado |
| `fix_quitar_trigger_duplicado.sql` | Elimina el trigger duplicado `trg_procesar_pago`. | Ejecutado |
| `diagnostico_puntos.sql` | Solo lectura: lista funciones/triggers que referencian `puntos`. | Herramienta |
| `crear_tickets_soporte.sql` | Crea la tabla `tickets_soporte` + políticas RLS + índice. | **Ejecutar** |
| `agregar_campos_perfil.sql` | Columnas de perfil: apellido, telefono, ciudad, posicion, nivel_juego. | **Ejecutar** |
| `agregar_mostrar_en_inicio_promociones.sql` | Columna `mostrar_en_inicio` en `promociones`. | **Ejecutar** |
| `agregar_campos_sponsors.sql` | Columnas `descripcion` y `enlace` en `sponsors`. | **Ejecutar** |
| `prestamos_implementos.sql` | **TESIS:** tablas `prestamos` + `prestamo_items`, triggers de stock/notificaciones, RLS y realtime. | **Ejecutar** |
| `restringir_registro_epn.sql` | **TESIS:** trigger en `auth.users` que rechaza registros fuera de `@epn.edu.ec` + tabla `correos_autorizados`. | **Ejecutar** |
| `storage_buckets_politicas.sql` | Crea los 6 buckets + sus políticas en `storage.objects` (el instalador no las trae). | **Ejecutar** |
| `reservas_sin_pago.sql` | **TESIS:** `trg_reserva_confirmada` genera el `acceso_token` al confirmar la reserva (reemplaza al trigger de pagos). | **Ejecutar** |

**Auditoría rápida de triggers de pago** (debe devolver SOLO `trg_pago_cambia_estado`):
```sql
SELECT tgname FROM pg_trigger
WHERE tgrelid='public.pagos'::regclass AND NOT tgisinternal;
```
