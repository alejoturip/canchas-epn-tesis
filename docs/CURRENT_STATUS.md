# CURRENT_STATUS.md — Auditoría, bugs y deuda técnica

> Última auditoría: 2026-06-10. Leyenda: ✅ Completo · ⚠️ Parcial · ❌ Pendiente.

## 1. Auditoría por módulo

| Módulo | Estado | Detalle |
|---|---|---|
| Autenticación | ✅ | Login, sesión persistente, roles (`ProtectedRoute`), logout "nuclear". Falta: recuperar contraseña probado end-to-end. |
| Reservas | ✅ | Crear (modal), ver historial (realtime), cancelar, estados completos. |
| Pagos | ✅ | Solicitud + comprobante + aprobación 1-click + trigger SQL. Falta cargar datos de cobro reales 100%. |
| QR de acceso | ✅ | Generado por trigger al aprobar; visible en `/reserva/:id`. Vence al fin del horario. |
| Validación (puerta) | ✅ | Escaneo cámara + manual; registra ingreso automáticamente; detecta expirado/usado/no-confirmada. |
| Fidelización | ✅ | `actualizar_fidelizacion` suma puntos al marcar "jugada"; premios a 5 y 12; niveles en UI. |
| Notificaciones | ✅ | Campana + realtime (INSERT/UPDATE) + toasts en vivo. |
| Realtime | ⚠️ | Funciona en reservas (cliente/admin), pagos, notificaciones. **Roto en `Home.jsx`** (canchas): usa `'postgres'` en vez de `'postgres_changes'`. |
| Promociones | ⚠️ | Admin CRUD presente; consumo en cliente por verificar. |
| Sponsors | ✅ | Admin sube logos; banner marquee; **página `/sponsors` con CTA "Sé sponsor"** (WhatsApp). |
| Torneos | ⚠️ | Listado + inscripción (`user_id`). Sin gestión de brackets/resultados. |
| Premios | ✅ | Generados por trigger; vista cliente (`/premios`) + admin. Canje: estado `pendiente` (flujo de canje real por definir). |
| Implementos (préstamo) | ✅ | Catálogo + admin CRUD + **préstamo con devolución** atado a la reserva (solicitar → aprobar → entregar → devolver), stock movido por trigger. *Pendiente: correr `prestamos_implementos.sql` en Supabase.* |
| Perfil | ✅ | Datos, stats, avatar (Storage), niveles. |
| Geolocalización | ✅ | Bajo demanda; ordena canchas por cercanía. |
| Mapas | ✅ | Leaflet por cancha; z-index resuelto frente a modales. |
| PWA | ⚠️ | `vite-plugin-pwa` + manifest. Faltan los iconos reales referenciados (`pwa-192x192.png`, etc.). SW cachea agresivo. |

**Avance global estimado: ~80% del MVP de producción.**

---

## 2. Bugs detectados

1. **🔴 Realtime de canchas roto (Home.jsx ~L48).** `.on('postgres', {...})` debe ser `.on('postgres_changes', {...})`. Hoy la home no se auto-refresca al cambiar canchas. *Impacto: bajo (hay fetch inicial). Fix: 1 palabra.*
2. **✅ RESUELTO — `usePerfil.js`** ya no referencia `perfilData?.puntos`; usa directamente `reservas_completadas`.
3. **🟡 Iconos PWA faltantes.** `vite.config.js` referencia `pwa-192x192.png` / `pwa-512x512.png` / `apple-touch-icon.png` que pueden no existir en `public/`. La instalación PWA puede mostrar icono roto.
4. **✅ RESUELTO — Tickets de soporte.** Antes `Soporte.jsx` fingía éxito sin guardar nada. Ahora: guarda en `tickets_soporte` (script `supabase/crear_tickets_soporte.sql`, con RLS) **y** abre WhatsApp con el ticket pre-armado. Vista admin en `/admin/soporte`. *Pendiente: ejecutar el SQL en Supabase para que persista; mientras tanto igual llega por WhatsApp.*
5. **🟢 `qr-pago.png` ausente** → `QRPago` cae al QR de texto (no escaneable por DeUna). Colocar la imagen en `public/`.

---

## 3. Deuda técnica

- **Triple capa de acceso a datos.** Conviven: (a) `supabaseService.js`, (b) hooks, (c) llamadas `supabase` directas en páginas/componentes (`Home`, `ReservaModal`, `ReservasAdmin`, `SponsorBanner`, `Sponsors`, varios admin). Inconsistencia → unificar sobre `supabaseService.js`.
- **`store/useAppStore.js` sin conectar.** Está definido pero `AppProvider` no envuelve la app en `App.jsx`. Decidir: usarlo o eliminarlo.
- **Patrón de carga repetido.** Casi todas las vistas repiten `useEffect(()=>cargar(),[])` con `setLoading`. Las reglas estrictas del React Compiler se desactivaron en `eslint.config.js` por esto (decisión consciente).
- **Logout "nuclear"** (`MainLayout`) hace `localStorage.clear()` + `window.location`. Funciona pero borra TODO el storage (no solo auth).
- **Estilos duplicados:** `App.css` heredado además de `index.css`. Revisar si `App.css` sigue aportando.
- **Comentario suelto** `//zoeee` al final de `MainLayout.jsx`.

---

## 4. Análisis técnico (faltantes y mejoras)

### Componentes faltantes (sugeridos)
- Componente genérico de **estado vacío** (hoy se repite inline).
- **Modal de confirmación** reutilizable (hoy se usa `window.confirm`).
- **Carrito / checkout** de tienda.
- Componente **CanchaCard** extraído (la home arma la tarjeta inline).

### Hooks faltantes (sugeridos)
- `usePagos()` (admin) para encapsular `getAllPagos` + realtime (hoy en la página).
- `useSponsors()` para reusar entre `SponsorBanner` y `Sponsors`.
- `useTorneos()` / `usePromociones()` para homogeneizar.

### Servicios faltantes
- Funciones de **sponsors/promociones/torneos** CRUD en `supabaseService.js` (hoy en páginas admin con `supabase` directo).
- `cancelarReserva(id)` y `getProductosActivos`/checkout en el service.

### Posibles mejoras de rendimiento
- **Code-splitting de chunks grandes** (build avisa >500 kB; `ValidarReserva` ~375 kB por `html5-qrcode`). Lazy-cargar el escáner.
- Usar `select` de columnas específicas en vez de `select('*')` donde sea posible.
- Memoizar listas grandes y evitar duplicar fetch (Home hace su propio fetch + existe `useCanchas`).

### Mejoras de seguridad
- **Revisar políticas RLS** de todas las tablas y buckets (la app asume RLS correcto; los triggers usan `SECURITY DEFINER`).
- Validar server-side que el `monto` del pago coincida con `precio_hora × duración` (hoy se calcula en cliente).
- No exponer acciones admin si `rol` se manipula en cliente (confiar en RLS, no solo en `ProtectedRoute`).

### Mejoras UX/UI
- Reemplazar `window.confirm`/`alert` por modales del tema.
- Dropdown `<select>` 100% custom para consistencia en Firefox/Safari.
- Estados de error más amables cuando falla la red.
- Feedback de "subiendo comprobante" con barra de progreso.
