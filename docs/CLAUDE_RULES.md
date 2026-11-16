# CLAUDE_RULES.md — Reglas permanentes (IA y desarrolladores)

> Reglas que **todo asistente de IA o desarrollador** debe respetar al trabajar en este proyecto. Leer junto con `PROJECT_CONTEXT.md` antes de tocar código.

## Base de datos
1. **NO usar la columna `puntos`** — no existe. Los puntos son **`perfiles.reservas_completadas`**.
2. **NO modificar triggers SQL sin autorización explícita.** Triggers válidos: `fn_pago_cambia_estado` y `actualizar_fidelizacion`. Antes de tocar un trigger, leer su definición real desde Supabase.
3. **NO recrear** el trigger `trg_procesar_pago` (eliminado a propósito).
4. **NO sumar puntos desde el flujo de pagos.** La fidelización la maneja SOLO `actualizar_fidelizacion` al pasar la reserva a `completada`.
5. Respetar nombres de FK: `reservas.perfil_id`, `premios.perfil_id`, `pagos.usuario_id`, `notificaciones.usuario_id`; excepción `inscripciones_torneos.user_id`.
6. Tipos de notificación que renderiza la campana: `reserva`, `cancelada`, `premio`, `promocion`, `info`.

## Arquitectura y código
7. **Usar `supabaseService.js`** para acceso a datos siempre que sea posible (no `supabase` directo en componentes nuevos).
8. **NO crear componentes duplicados.** Reusar lo de `src/components/` y los hooks de `src/hooks/`. Revisar `COMPONENTS.md`/`SERVICES.md` antes de crear algo nuevo.
9. **Mantener la arquitectura actual** (carpetas y responsabilidades de `ARCHITECTURE.md`). No introducir otro backend, ORM, ni librería de estado sin acuerdo.
10. **Mantener el stack**: React + Vite, **Tailwind CSS**, **React Router**, Supabase. No migrar a TypeScript ni a otro router sin pedirlo.
11. **Mantener el tema oscuro** y las clases reutilizables de `index.css` (`.input`, `.btn-*`, `.card`, `.badge-*`, `.label`). No introducir librerías de UI nuevas porque sí.

## Estilo / UI
12. **Leaflet vs modales:** el contenedor de mapa va con `relative z-0`; los modales sobre mapas con z-index alto (`ReservaModal` usa `z-[1100]`).
13. Las `<option>` de los `<select className="input">` se estilan oscuras vía `.input option` en `index.css`.

## Seguridad
14. **NO subir `.env`** ni ninguna credencial a git (ya está en `.gitignore`). La `service_role` key **jamás** en el frontend.
15. No confiar solo en `ProtectedRoute` para seguridad: la verdad está en **RLS** de Supabase.

## Flujo de trabajo
16. **Commitear y respaldar** en GitHub tras cambios relevantes (el código ya se perdió una vez). Ver `RECOVERY.md`.
17. **PWA / caché:** tras cambios que "no se ven", recordar el service worker (reiniciar `npm run dev`, Unregister SW, Ctrl+Shift+R). Ver `PROJECT_CONTEXT.md`.
18. **No modificar código cuando la tarea es documentar o analizar.** Separar claramente análisis de cambios.
19. Antes de un cambio en el flujo de pagos/QR/fidelización, validar contra los diagramas de `ARCHITECTURE.md` y los triggers de `DATABASE.md`.

## Mantenimiento de esta documentación
20. Al completar tareas o cambiar arquitectura, **actualizar el doc correspondiente** en `docs/` y, si aplica, el `CLAUDE.md` raíz. Mantener `CURRENT_STATUS.md` y `NEXT_TASK.md` al día.
