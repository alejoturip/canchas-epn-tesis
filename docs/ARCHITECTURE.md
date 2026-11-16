# ARCHITECTURE.md — Arquitectura y flujos

## 1. Árbol real del proyecto

```
canchas-app-final/
├── public/                     # Estáticos servidos en la raíz (/)
│   ├── favicon.svg, icons.svg
│   └── qr-pago.png             # ⬅️ QR de DeUna (colocar aquí; lo usa pago.js)
├── supabase/                   # Scripts SQL (migraciones + fixes + diagnóstico)
├── docs/                       # 📚 Esta documentación
├── dist/                       # Build de producción (gitignored)
├── .env                        # Credenciales Supabase (gitignored)
├── .env.example                # Plantilla de variables
├── index.html                  # HTML raíz (Vite)
├── vite.config.js              # Vite + PWA (vite-plugin-pwa, autoUpdate)
├── tailwind.config.js          # Tema oscuro (brand, surface, accent)
├── eslint.config.js            # ESLint (reglas React Compiler desactivadas)
├── CLAUDE.md                   # Contexto corto para Claude Code
└── src/
    ├── main.jsx                # Punto de entrada (monta <App/>)
    ├── App.jsx                 # Router + Suspense + Toaster + AuthProvider
    ├── index.css               # Tailwind + clases reutilizables (.input, .btn-*, .card…)
    ├── App.css                 # (estilos sueltos heredados)
    │
    ├── components/             # Componentes reutilizables (UI)
    │   ├── ProtectedRoute.jsx  # Guard de rutas (auth + rol admin)
    │   ├── ErrorBoundary.jsx   # Captura errores de render
    │   ├── ReservaModal.jsx    # Modal reservar + pagar (2 pasos)
    │   ├── QRPago.jsx           # QR de cobro + datos de cuenta
    │   ├── MapaCancha.jsx       # Mapa Leaflet de una cancha
    │   ├── NotificacionesBell.jsx  # Campana + dropdown de notificaciones
    │   ├── SponsorBanner.jsx    # Marquee de logos de sponsors
    │   ├── HeroBanner.jsx       # Hero de la home
    │   └── Skeletons.jsx        # Placeholders de carga
    │
    ├── pages/                  # Vistas (1 por ruta)
    │   ├── Home.jsx, CanchaDetalle.jsx, MisReservas.jsx, ReservaDetalle.jsx
    │   ├── Tienda.jsx, Recompensas.jsx, Torneos.jsx, Soporte.jsx
    │   ├── Sponsors.jsx, Perfil.jsx
    │   ├── Login.jsx, ActualizarPassword.jsx
    │   └── admin/             # Panel de administración
    │       ├── Dashboard.jsx, CanchasAdmin.jsx, ReservasAdmin.jsx
    │       ├── PagosAdmin.jsx, ValidarReserva.jsx
    │       ├── ProductosAdmin.jsx, TiendaAdmin.jsx, PremiosAdmin.jsx
    │       ├── PromocionesAdmin.jsx, SponsorsAdmin.jsx, TorneosAdmin.jsx
    │
    ├── layouts/                # Estructura compartida (header, nav, outlet)
    │   ├── MainLayout.jsx      # Cliente: header + sponsor banner + bottom nav
    │   └── AdminLayout.jsx     # Admin: sidebar + outlet
    │
    ├── context/
    │   └── AuthContext.jsx     # Sesión + perfil + logout (global)
    │
    ├── store/
    │   └── useAppStore.js      # Estado UI ligero (Context + useReducer) — poco usado
    │
    ├── hooks/                  # Lógica de datos reutilizable
    │   ├── useCanchas.js, useReservas.js, useTienda.js, usePremios.js
    │   ├── usePerfil.js, useNotificaciones.js, useGeolocation.js
    │
    ├── services/
    │   └── supabaseService.js  # ⭐ Capa de acceso a datos (queries centralizadas)
    │
    ├── lib/
    │   ├── supabase.js         # Cliente Supabase (singleton)
    │   └── notify.js           # Helpers de toasts (react-hot-toast)
    │
    ├── config/
    │   └── pago.js             # Datos bancarios/QR de cobro + payload del QR
    │
    ├── routes/
    │   └── routeConfig.js      # Metadatos de rutas (para menús/breadcrumbs)
    │
    └── utils/
        ├── formatters.js       # precio, fecha, hora, tiempo relativo, iniciales
        ├── geo.js              # Haversine + links de Google Maps
        ├── niveles.js          # Sistema de niveles (Bronce→Diamante)
        └── validators.js       # email, password, teléfono EC, fecha futura
```

## 2. Responsabilidad de cada carpeta

| Carpeta | Responsabilidad | Depende de |
|---|---|---|
| `lib/` | Infra: cliente Supabase y toasts. Sin lógica de negocio. | — |
| `services/` | **Todas** las queries deberían vivir aquí. | `lib/supabase` |
| `hooks/` | Estado + efectos reutilizables (fetch, realtime). | `lib/supabase`, `services`, `context` |
| `context/` | Estado global de sesión/perfil. | `lib/supabase` |
| `store/` | Estado UI efímero (notifs locales, carrito). Poco usado. | — |
| `components/` | UI reutilizable, sin rutas. | hooks, services, utils, lib |
| `pages/` | Una vista por ruta; orquestan componentes + datos. | todo lo anterior |
| `layouts/` | Cromo compartido (header, nav) + `<Outlet/>`. | context, components |
| `routes/` | Metadatos de rutas (no define el router; eso está en `App.jsx`). | — |
| `config/` | Constantes de negocio editables (datos de cobro). | — |
| `utils/` | Funciones puras sin estado. | — |

## 3. Flujo de datos (visión general)

```
Supabase (Postgres + Auth + Storage + Realtime)
        ▲   │
        │   ▼
   lib/supabase.js  ──►  services/supabaseService.js
                              ▲           ▲
                              │           │
                         hooks/*     context/AuthContext
                              ▲           ▲
                              │           │
                          pages/*  ◄──►  components/*
                              ▲
                              │
                         layouts/*  (Outlet)
                              ▲
                           App.jsx (Router)
```
> ⚠️ **Inconsistencia real:** hoy `pages/` y `hooks/` a veces llaman a `supabase` **directamente**, saltándose `services/`. La meta es que todo pase por `supabaseService.js` (ver `CLAUDE_RULES.md` y deuda técnica en `CURRENT_STATUS.md`).

---

## 4. Diagramas de flujo

### 4.1 Autenticación
```
Usuario → Login.jsx → supabase.auth.signInWithPassword
   │
   ▼
AuthContext (onAuthStateChange) ── carga perfiles(id) ──► { user, perfil, loading }
   │
   ▼
ProtectedRoute:
   loading? → spinner
   !user?   → /login
   requireAdmin && perfil.rol!=='admin' → /
   else     → <Outlet/>  (MainLayout o AdminLayout)
```

### 4.2 Reserva + Pago (cliente)
```
CanchaDetalle → "Reservar ahora" → ReservaModal
  Paso 1 (selección):
     elige fecha → consulta horarios ocupados (reservas pendiente/confirmada)
     elige duración (1-3h) + hora inicio → "Continuar al pago"
        → INSERT reservas (estado='pendiente')
        → createPago(estado='pendiente')
  Paso 2 (pago):
     muestra QRPago (QR DeUna + datos de cuenta + referencia RES-{id})
     sube comprobante → Storage 'comprobantes' → updatePagoComprobante()
     estado: "Comprobante enviado, en revisión"
```

### 4.3 Aprobación de pago (admin) — automatizada por trigger
```
/admin/pagos → "Aprobar" (1 click) → updatePagoEstado(id, 'aprobado')
        │
        ▼  (Postgres) AFTER UPDATE OF estado ON pagos
   fn_pago_cambia_estado():
        reservas.estado = 'confirmada'
        reservas.acceso_token = gen_random_uuid()
        reservas.acceso_expira = fin del horario (America/Guayaquil)
        INSERT notificaciones(tipo='reserva', enlace='/reserva/{id}')
        │
        ▼  Realtime
   Cliente recibe notificación + ve su QR en /reserva/{id}

(Si "Rechazar": reservas.estado='cancelada' + notificación 'cancelada')
```

### 4.4 Validación de QR (puerta)
```
/admin/validar → escanea QR (html5-qrcode) o pega token
        │
        ▼ getReservaByToken(token)
   ¿estado='confirmada' && !ingreso_at && !expirado?
        SÍ → marcarIngreso(): reservas.ingreso_at=now, validado_por=admin
              + INSERT validaciones_acceso(estado_final='ingreso')
              → "Ingreso registrado ✅" (automático, sin botón extra)
        NO → muestra motivo (ya ingresó / expirado / no confirmada)
```

### 4.5 Fidelización (puntos y premios)
```
/admin/reservas → "Marcar jugada" → reservas.estado='completada'
        │
        ▼  (Postgres) trigger actualizar_fidelizacion()
   perfiles.reservas_completadas += 1
        ├─ == 5  → INSERT premios(tipo='basico')   + notif 'premio'
        └─ >=12  → INSERT premios(tipo='premium')  + reset reservas_completadas=0
        │
        ▼
   Cliente ve puntos/nivel en /perfil y premios en /premios
   Niveles (utils/niveles.js): Bronce(0) · Plata(10) · Oro(25) · Diamante(50)
```
