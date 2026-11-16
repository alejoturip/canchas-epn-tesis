# Formulario TIC aprobado — la hoja de ruta del proyecto

> **Fuente:** `Desktop\tesis epn\F_AA_233A - FABARA VINUEZA ALEJANDRO ROSMY v2 - actividades generales.docx`
> **Informe final del TIC:** `Desktop\tesis epn\trabajo de tesis\TIC - FABARA VINUEZA ALEJANDRO ROSMY.docx`
> **Aprobado por la CPGIC** el 28/09/2026 (Dra. Myriam Peñafiel, Coordinadora CPGIC - TSDS).
> Recomendaciones de la CPGIC: **ninguna**. Enviado a la Subdirección de la ESFOT el 02/10/2026.
>
> **Regla:** se trabaja lo que dice este formulario, **en el orden de sus actividades**.
> Lo que no esté acá no se agrega ("No se contempla la incorporación de módulos adicionales").

## Datos generales
| Campo | Valor |
|---|---|
| Título oficial | **DESARROLLO DE UN SISTEMA WEB PROGRESIVO PARA LA GESTIÓN DE ESCENARIOS DEPORTIVOS CON CONTROL DE ACCESO MEDIANTE CREDENCIALES QR TEMPORALES EN LA ESCUELA POLITÉCNICA NACIONAL** |
| Estudiante | Fabara Vinueza Alejandro Rosmy (solo, 1 participante) |
| Carrera | (RRA20) Desarrollo de Software · ESFOT |
| Tutor | Ing. Sergio Granizo, MSc. |
| Línea | LI-ESFOT-2022-01 - Telemática aplicada |
| Componente | Sistema Web (frontend + backend) |
| Duración | 240 horas · 12 semanas · Scrum |

⚠️ El título dice **"sistema web progresivo"**, no "plataforma web progresiva" (cambió respecto de versiones anteriores). Usar esta redacción en el informe.

## Objetivos
- **General:** Desarrollar un sistema web progresivo para la gestión de escenarios deportivos con control de acceso mediante credenciales QR temporales en la EPN.
- **OE1:** Analizar los requerimientos funcionales y no funcionales validando con el Product Owner.
- **OE2:** Diseñar la arquitectura, el modelo de datos relacional y los prototipos de interfaz de los tres roles, con trazabilidad a todos los requerimientos.
- **OE3:** Desarrollar los módulos con confirmación automática, control de acceso por QR temporal y préstamo básico de implementos, incluyendo límite diario, ausencias, sanciones y bloqueos.
- **OE4:** Evaluar el sistema mediante pruebas, verificando los requerimientos funcionales y registrando resultados.
- **OE5:** Desplegar en producción con HTTPS y elaborar la documentación del TIC.

## Plan de trabajo (en este orden)
| # | Semana | Actividad | Horas | Objetivo |
|---|---|---|---|---|
| 1 | 1 | Análisis de requerimientos y validación con el Product Owner | 10 | OE1 |
| 2 | 2 | Diseño de la arquitectura y del modelo de datos relacional | 20 | OE2 |
| 3 | 3 | Prototipado de interfaces y preparación del entorno (Sprint 0) | 20 | OE2 |
| 4 | 4 | Desarrollo de módulos (Sprint 1) | 20 | OE3 |
| 5 | 5 | Desarrollo de módulos (Sprint 2) | 20 | OE3 |
| 6 | 6 | Desarrollo de módulos (Sprint 3) | 20 | OE3 |
| 7 | 7 | Desarrollo de módulos (Sprint 4) | 20 | OE3 |
| 8 | 8 | Desarrollo de módulos (Sprint 5) | 20 | OE3 |
| 9 | 9 | Desarrollo de módulos (Sprint 6) | 20 | OE3 |
| 10 | 10 | Ejecución de pruebas y corrección de errores | 20 | OE4 |
| 11 | 11 | Despliegue en el entorno de producción | 10 | OE5 |
| 12 | 12 | Redacción del informe del TIC y corrección de plagio | 40 | OE5 |
| | | **Total** | **240** | |

Productos: (1) el sistema web progresivo, (2) el informe del TIC.

## Alcance comprometido
**Eje:** credencial QR temporal y no reutilizable, generada automáticamente al confirmarse la reserva; no transferible.

**Confirmación automática** cuando se cumplen a la vez:
1. horario disponible,
2. estudiante no sancionado,
3. no superó el límite de **1 hora de reserva por día**,
4. horario no bloqueado (mantenimiento o evento institucional).

Si falla una, se rechaza **indicando el motivo**. El administrador interviene **solo en excepciones**: bloqueos, cancelaciones, registro de ausencias y levantamiento de sanciones.

**Ausencias automáticas:** reserva confirmada, horario vencido, sin ingreso → ausencia. Acumular ausencias → **sanción de 15 días**.

**Tres roles:**
- **Estudiante:** registro con correo institucional, perfil académico (facultad, carrera, código único), consultar disponibilidad, reservar, pedir implementos para su reserva, historial, presentar su credencial.
- **Administrador:** escenarios y horarios de atención, inventario de implementos, entrega y devolución, bloqueos, cancelaciones y ausencias, cuentas del personal, indicadores de uso.
- **Personal de control de acceso:** leer el QR del estudiante, con registro automático del ingreso.

**Técnico:** base de datos relacional como servicio, autenticación restringida a `epn.edu.ec`, roles mediante políticas de seguridad, lógica en funciones y disparadores, diseño responsivo y notificaciones. Herramientas **no propietarias**. Despliegue con HTTPS.

**Préstamo de implementos:** siempre atado a una reserva vigente del propio estudiante; retiro al inicio del horario y devolución al final; el inventario baja al entregar y se repone al devolver; quedan identificados los no devueltos.

## Exclusiones (no hacer)
- Pagos de cualquier tipo.
- App móvil nativa.
- Integración con sistemas académicos de la EPN (los datos los declara el estudiante).
- Módulos adicionales a los descritos.
- Sensores o dispositivos físicos ("disponibilidad actualizada conforme a reservas, bloqueos e ingresos registrados").
- Logística avanzada de implementos: reservas anticipadas, proveedores, mantenimiento, valoración de deterioro, trazabilidad por unidad.

## Product Owner
El formulario aprobado dice que el PO es **el responsable de la Unidad de Bienestar Estudiantil**, con quien se formaliza el levantamiento en la primera fase (semana 1). Ya **no** menciona al tutor como PO interino. Todavía no hay un nombre concreto.

## Diferencias con el código actual (al 2026-10-05)
Lo que el formulario promete y el código todavía no cumple, o hace de más:

| Tema | Formulario | Código hoy |
|---|---|---|
| Confirmación de la reserva | Automática | **Manual**: botón "Confirmar" en `/admin/reservas` (`trg_reserva_confirmada` corre al pasar a `confirmada`) |
| Módulos extra | "No se contemplan módulos adicionales" | `PROMOCIONES` y `SOPORTE` están **prendidos** en `config/features.js` |
| Sanciones | Automáticas | Existen, pero el interruptor `sanciones_activas` arranca **apagado** (`rol_guardia_y_sanciones.sql`) |
| Rol de personal de control | Sí | Hecho en el código; falta correr `rol_guardia_y_sanciones.sql` |
