# COMPONENTS.md — Catálogo de componentes

Componentes en `src/components/`. (Las **páginas** en `src/pages/` se listan en `ARCHITECTURE.md` y `CURRENT_STATUS.md`.)

---

## ProtectedRoute
- **Propósito:** Guard de rutas. Bloquea acceso según sesión y rol.
- **Props:** `requireAdmin?: boolean` (default `false`).
- **Comportamiento:** `loading`→spinner · sin `user`→`/login` · `requireAdmin` y `rol!=='admin'`→`/` · si pasa→`<Outlet/>`.
- **Dependencias:** `useAuth`, react-router (`Navigate`, `Outlet`).
- **Usado en:** `App.jsx` (envuelve rutas cliente y admin).

## ErrorBoundary
- **Propósito:** Captura errores de render para evitar pantalla en blanco.
- **Props:** `children`.
- **Usado en:** `App.jsx` (envuelve el `<Suspense>` del router).

## ReservaModal ⭐
- **Propósito:** Flujo completo de **reservar + pagar** en 2 pasos (selección de horario → pago con comprobante).
- **Props:** `cancha` (objeto), `isOpen?` (default `true`), `onClose`.
- **Lógica:** consulta horarios ocupados, crea `reservas` (pendiente) + `pago` (pendiente), muestra `QRPago`, sube comprobante a Storage `comprobantes`.
- **Dependencias:** `supabase` (directo), `createPago`/`updatePagoComprobante` (service), `QRPago`, `PAGO_CONFIG`, `useAuth`, framer-motion.
- **Usado en:** `Home.jsx`, `CanchaDetalle.jsx`.
- **Nota de estilo:** overlay con `z-[1100]` (por encima de Leaflet).

## QRPago
- **Propósito:** Muestra el **QR de cobro** (imagen DeUna o QR de texto generado) + datos de la cuenta + métodos + instrucciones.
- **Props:** `monto`, `referencia`.
- **Lógica:** usa `PAGO_CONFIG.qrImagen` (`/qr-pago.png`); si falla la imagen, cae al QR de texto (`generarPayloadQR`). Datos: banco, nº cuenta, beneficiario, teléfono/DeUna.
- **Dependencias:** `qrcode.react` (QRCodeSVG), `config/pago`, `formatPrecio`.
- **Usado en:** `ReservaModal.jsx`.

## MapaCancha
- **Propósito:** Mapa interactivo (Leaflet, tiles oscuros CARTO) con pin de la cancha.
- **Props:** `lat`, `lng`, `nombre`, `direccion`, `height?` (default `'320px'`).
- **Lógica:** si faltan coords, muestra placeholder. Pin custom (divIcon rojo).
- **Dependencias:** `react-leaflet`, `leaflet`, lucide.
- **Usado en:** `CanchaDetalle.jsx`, `Home.jsx`.
- **Nota de estilo:** contenedor con `relative z-0` para encerrar los z-index de Leaflet bajo los modales.

## NotificacionesBell
- **Propósito:** Campana del header con dropdown de notificaciones y badge de no leídas.
- **Props:** ninguna.
- **Lógica:** consume `useNotificaciones` (realtime). Click en una notif → marca leída + navega a `enlace`. "Marcar todas". Cierra al click fuera.
- **Iconos por tipo:** reserva, cancelada, premio, promocion, info.
- **Dependencias:** `useNotificaciones`, `tiempoRelativo`, react-router, framer-motion.
- **Usado en:** `MainLayout.jsx`.

## SponsorBanner
- **Propósito:** Marquee horizontal infinito con los logos de sponsors.
- **Props:** ninguna.
- **Lógica:** fetch `sponsors`; si no hay, **renderiza `null`** (no muestra nada). Duplica la lista para loop CSS.
- **Dependencias:** `supabase` (directo).
- **Usado en:** `MainLayout.jsx` (debajo del header).

## HeroBanner
- **Propósito:** Hero cinematográfico de la home (título + subtítulo + CTA).
- **Props:** ninguna (contenido interno).
- **Usado en:** `Home.jsx`.

## Skeletons
- **Propósito:** Placeholders de carga (`CanchasSkeleton`, `ProductosSkeleton`, `PromocionesSkeleton`).
- **Exports:** varios componentes skeleton nombrados.
- **Usado en:** `Home.jsx`, `Tienda.jsx`, `PromocionesAdmin.jsx`, etc.

---

### Componente local destacado
- **`Dato`** (dentro de `ValidarReserva.jsx`): fila icono+label+valor para mostrar datos de la reserva escaneada. No exportado.
