# PROJECT_CONTEXT.md — Fuente única de verdad

> **Propósito de este documento:** dar a cualquier desarrollador o IA el contexto completo del proyecto **sin necesidad de leer el código fuente primero**. Léelo antes que nada. No contradigas las decisiones arquitectónicas aquí documentadas.

---

## 1. Qué es

**Canchas App** es una **PWA** (aplicación web instalable) para **reservar canchas deportivas**, con dos experiencias:

- **Cliente:** explora canchas (ordenadas por cercanía), reserva por hora, paga por transferencia/DeUna subiendo un comprobante, recibe un **QR de acceso**, acumula puntos de fidelización y canjea premios. Además: tienda, torneos, soporte, perfil y sponsors.
- **Admin (Superusuario):** panel para gestionar canchas, aprobar/rechazar pagos (1 click), validar QR en la puerta, y administrar tienda, premios, promociones, sponsors y torneos.

La carpeta activa y definitiva es **`canchas-app-final`**. (La carpeta vieja `Desktop\MisProyectos\canchas-app` es de mayo y **no se usa**.)

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 19 |
| Build / dev | Vite | 8 |
| Lenguaje | JavaScript (JSX) | — |
| Estilos | Tailwind CSS (tema oscuro) | 3.4 |
| Backend | Supabase (Auth, Postgres, Storage, Realtime) | supabase-js 2 |
| Routing | React Router DOM (lazy) | 7 |
| Animación | Framer Motion | 12 |
| Toasts | react-hot-toast | 2 |
| Iconos | lucide-react | 1.17 |
| QR | `qrcode.react` (generar) + `html5-qrcode` (escanear) | — |
| Mapas | Leaflet + react-leaflet | 1.9 / 5 |
| PWA | vite-plugin-pwa (Workbox, `registerType: autoUpdate`) | 1.3 |

**Backend = Supabase** (decisión fija). **No** introducir otro backend ni ORM.

---

## 3. Decisiones arquitectónicas (NO contradecir)

1. **Supabase es el único backend.** Auth, base de datos, storage y realtime salen de Supabase.
2. **Capa de datos centralizada:** `src/services/supabaseService.js` agrupa las queries. (Hoy conviven también hooks y llamadas directas — ver deuda técnica en `CURRENT_STATUS.md`.)
3. **Flujo de pago automatizado por triggers SQL** (ver `DATABASE.md`): el admin solo cambia el estado del pago; los triggers confirman la reserva, generan el QR y notifican.
4. **Puntos de fidelización = columna `perfiles.reservas_completadas`.** **NO existe** una columna `puntos`. Cualquier referencia a `puntos` en SQL es un bug.
5. **Tema oscuro** con paleta `brand` (rojo) y `surface` (grises), vía clases reutilizables en `src/index.css`.
6. **Convención de FKs:** `reservas.perfil_id` y `premios.perfil_id` (NO `user_id`). Excepción: `inscripciones_torneos.user_id` (ese sí es `user_id`).

---

## 4. Documentos de esta carpeta `docs/`

| Archivo | Contenido |
|---|---|
| `PROJECT_CONTEXT.md` | Este archivo. Visión general + resumen ejecutivo. |
| `DATABASE.md` | Tablas, columnas, relaciones, triggers y funciones SQL. |
| `ARCHITECTURE.md` | Árbol del proyecto, responsabilidades y diagramas de flujo. |
| `COMPONENTS.md` | Catálogo de componentes (props, uso, dependencias). |
| `SERVICES.md` | Funciones de `supabaseService.js` + hooks personalizados. |
| `CURRENT_STATUS.md` | Auditoría por módulo + bugs + deuda técnica + mejoras. |
| `NEXT_TASK.md` | Roadmap priorizado (impacto / dificultad / tiempo). |
| `RECOVERY.md` | Procedimiento de recuperación ante pérdida de código. |
| `CLAUDE_RULES.md` | Reglas permanentes para asistentes de IA y devs. |

---

## 5. Resumen ejecutivo

**Estado general:** la app es **funcional de extremo a extremo** en su núcleo (auth → reserva → pago → QR → validación → fidelización). Acaba de ser respaldada en GitHub (riesgo histórico de pérdida de código, ahora mitigado).

**Avance estimado: ~80 %** del MVP de producción.
- ✅ Núcleo (auth, reservas, pagos, QR, validación, fidelización, realtime, notificaciones): operativo.
- ⚠️ Periféricos (tienda sin checkout real, torneos básico, soporte tolerante a tabla faltante): parciales.
- ❌ Faltan: pruebas end-to-end, datos reales de cobro 100 % cargados, pulido de algunos realtime y limpieza de deuda técnica.

**Módulos críticos:**
1. **Pagos + triggers SQL** — corazón del negocio; cualquier cambio en triggers se valida primero (ver `DATABASE.md`).
2. **Validación de QR en puerta** (`/admin/validar`) — registra el ingreso automáticamente al escanear.
3. **Autenticación / roles** — `ProtectedRoute` separa cliente y admin por `perfiles.rol`.

**Riesgos detectados:**
- **Realtime de canchas en Home roto** (`'postgres'` en vez de `'postgres_changes'`). Ver `CURRENT_STATUS.md`.
- **Triple capa de acceso a datos** (service + hooks + llamadas directas) → inconsistencia y mantenimiento difícil.
- **`.env` con credenciales** — ya está en `.gitignore`; no debe subirse nunca.
- **PWA service worker** cachea agresivamente → cambios pueden no verse sin limpiar el SW.

**Próximos pasos recomendados (detallados en `NEXT_TASK.md`):**
1. Probar el flujo completo end-to-end y cargar datos reales de cobro (`src/config/pago.js` + `public/qr-pago.png`).
2. Arreglar el realtime de canchas en `Home.jsx`.
3. Unificar la capa de acceso a datos sobre `supabaseService.js`.
