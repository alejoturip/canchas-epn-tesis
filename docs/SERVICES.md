# SERVICES.md — Capa de datos y hooks

## Parte A — `src/services/supabaseService.js`

> Capa central de acceso a datos. Todas devuelven la respuesta de supabase-js: `{ data, error }` (o `{ count }` en las de conteo). **Regla:** páginas y hooks deberían usar estas funciones en lugar de llamar a `supabase` directo.

### Canchas
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `getCanchasActivas()` | — | canchas con `activa=true`, ord. `id` | (disponible) |
| `getAllCanchas()` | — | todas, ord. `created_at` desc | CanchasAdmin |
| `getCanchaById(id)` | `id` | una cancha (`.single()`) | CanchaDetalle |
| `createCancha(data)` | objeto | insert | CanchasAdmin |
| `updateCancha(id, data)` | `id`, objeto | update | CanchasAdmin |
| `deleteCancha(id)` | `id` | delete | CanchasAdmin |

### Reservas
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `getReservasByUser(userId)` | `userId` | reservas + `canchas(nombre, imagen_url)` | (disponible) |
| `getAllReservas()` | — | reservas + cancha + perfil | (admin) |
| `createReserva(data)` | objeto | insert | (disponible) |
| `updateReservaEstado(id, estado)` | `id`, estado | update | (disponible) |
| `getReservaById(id)` | `id` | reserva + cancha (detalle) | ReservaDetalle |
| `getReservaByToken(token)` | `acceso_token` | reserva + cancha + perfil (`maybeSingle`) | ValidarReserva |
| `marcarIngreso(reserva, validadoPor)` | reserva, adminId | sella `ingreso_at` + inserta `validaciones_acceso` | ValidarReserva |

### Pagos
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `createPago(data)` | objeto | insert + `.select().single()` | ReservaModal |
| `updatePagoComprobante(id, url, metodo)` | `id`, url, metodo | adjunta comprobante | ReservaModal |
| `updatePagoEstado(id, estado)` | `id`, `'aprobado'\|'rechazado'` | **dispara trigger SQL** | PagosAdmin |
| `getAllPagos()` | — | pagos + perfil + reserva(+cancha) | PagosAdmin |

### Productos / Sponsors / Torneos
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `getProductosActivos()` | — | productos `activa` y `stock>0` | (legado de la venta; hoy Tienda usa `getImplementos`) |
| `getAllProductos()` | — | todos | ProductosAdmin |
| `getSponsors()` | — | sponsors ord. `created_at` | (disponible; Sponsors usa supabase directo) |
| `getTorneos()` | — | torneos ord. `fecha_inicio` | Torneos |
| `inscribirseATorneo(torneoId, userId)` | ids | insert (usa `user_id`) | Torneos |

### Préstamos de implementos (versión TESIS)
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `getImplementos()` | — | catálogo `activa=true` (incluye los que están en 0) | Tienda |
| `getReservasParaPrestamo(userId)` | uuid | reservas propias de hoy en adelante (`pendiente`/`confirmada`) | Tienda |
| `getPrestamosByUser(userId)` | uuid | préstamos + `reservas` + `prestamo_items` | Tienda (pestaña "Mis préstamos") |
| `getAllPrestamos()` | — | lo anterior + `perfiles!prestamos_perfil_id_fkey` | PrestamosAdmin |
| `crearPrestamo({perfil_id, reserva_id, observaciones}, items)` | — | cabecera + ítems en 2 pasos; si fallan los ítems borra la cabecera | Tienda |
| `cancelarPrestamo(id)` | uuid | estado `cancelado` (RLS: solo si sigue `solicitado`) | Tienda |
| `updatePrestamoEstado(id, estado, extra)` | — | `extra` = motivo/nota/`atendido_por` | PrestamosAdmin |
| `updatePrestamoItemDevueltos(id, devueltos)` | — | **guardar ANTES de pasar a `devuelto`** (el trigger los lee para reponer stock) | PrestamosAdmin |

---

### Premios / Puntos / Perfil
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `getPremiosByUser(userId)` | `userId` | premios por `perfil_id` | (disponible) |
| `getPuntosUsuario(userId)` | `userId` | `{ reservas_completadas }` | (disponible) |
| `getPerfilCompleto(userId)` | `userId` | perfil `.single()` | usePerfil |
| `updatePerfil(userId, data)` | `userId`, objeto | update | usePerfil |
| `countReservasUsuario(userId)` | `userId` | `{ count }` | usePerfil |
| `countReservasPorEstado(userId, estado)` | `userId`, estado | `{ count }` | usePerfil |
| `countPremiosUsuario(userId)` | `userId` | `{ count }` | usePerfil |

### Soporte
| Función | Parámetros | Retorno | Usada en |
|---|---|---|---|
| `createTicketSoporte(data)` | objeto | insert en `tickets_soporte` (puede no existir) | Soporte |

> ⚠️ **No existe** `aprobarPago()` / `rechazarPago()` como funciones nombradas: la aprobación es `updatePagoEstado(id, 'aprobado')` y el resto lo hace el trigger SQL. Igual, la cancelación de reserva del cliente se hace en `useReservas.cancelarReserva` (supabase directo), no en el service.

---

## Parte B — Hooks (`src/hooks/`)

| Hook | Retorna | Realtime | Notas |
|---|---|---|---|
| `useCanchas()` | `{ canchas, loading }` | No | Trae canchas `activa=true`. (Home no lo usa: hace su propio fetch.) |
| `useReservas()` | `{ reservas, loading, cancelarReserva, refetch }` | **Sí** (filtra por `perfil_id`) | Historial del usuario + cancelar. |
| `useTienda()` | `{ productos, loading, fetchProductos, crearProducto }` | No | `crearProducto` sube imagen a bucket `productos`. |
| `usePremios()` | `{ premios, puntos, loading }` | No | `puntos = perfiles.reservas_completadas`. |
| `usePerfil()` | `{ perfil, stats, loading, saving, subiendo, actualizarPerfil, subirAvatar, refetch }` | No | `stats`: totalReservas, completadas, premios, puntos. Sube avatar a bucket `avatars`. |
| `useNotificaciones()` | `{ notificaciones, noLeidas, loading, marcarLeida, marcarTodasLeidas, refetch }` | **Sí** (INSERT+UPDATE por `usuario_id`) | Dispara toasts en vivo para `premio`/`promocion`. |
| `useGeolocation()` | `{ coords, error, loading, solicitar }` | No | Bajo demanda (no pide permiso al montar). Haversine en `utils/geo`. |

> ⚠️ **`usePerfil`** lee `perfilData?.puntos ?? perfilData?.reservas_completadas` — el `?.puntos` apunta a una columna inexistente; funciona por el fallback pero conviene limpiarlo (ver `CURRENT_STATUS.md`).

---

## Parte C — Infra y utils

- **`lib/supabase.js`** — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. Singleton exportado como `supabase`.
- **`lib/notify.js`** — `toastExito`, `toastError`, `toastInfo(msg, icon)`, `toastPremio`. Estilo oscuro global en `<Toaster>` de `App.jsx`.
- **`context/AuthContext.jsx`** — `AuthProvider` + `useAuth()` → `{ user, perfil, loading, logout }`. Escucha `onAuthStateChange` y carga `perfiles`.
- **`store/useAppStore.js`** — `AppProvider` + `useAppStore()` (Context+useReducer): notifs locales y `carritoCount`. **Poco usado** (no envuelto en `App.jsx` actualmente).
- **`config/pago.js`** — `PAGO_CONFIG` (banco, cuenta, propietario, teléfono, `qrImagen`, métodos, instrucciones) + `generarPayloadQR(monto, ref)`.
- **`utils/formatters.js`** — `formatPrecio`, `formatFecha`, `formatHora`, `truncar`, `tiempoRelativo`, `iniciales`.
- **`utils/prestamos.js`** — `ESTADOS_PRESTAMO`/`estadoPrestamo`, `vencimiento`, `estaAtrasado` (se deduce del fin del horario, no está en la base), `totalUnidades`, `valorReposicionTotal`, `faltantes`, `resumenReserva`.
- **`utils/geo.js`** — `calcularDistancia` (Haversine), `formatDistancia`, `linkGoogleMaps`, `linkComoLlegar`.
- **`utils/niveles.js`** — `NIVELES` (Bronce/Plata/Oro/Diamante) + `calcularNivel(puntos)`.
- **`utils/validators.js`** — `esEmailValido`, `esPasswordValido`, `esTelefonoEcuador`, `esFechaFutura`.
