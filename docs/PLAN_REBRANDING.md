# PLAN_REBRANDING.md — De "La Fija" a la identidad EPN

> Estado: ✅ **EJECUTADO el 2026-08-26**, salvo lo que depende de archivos de imagen
> (ver "Falta" abajo). Los pasos 1 a 7 del orden de ejecución están aplicados y el
> build pasa. Lo que queda es reemplazar `public/logo.png` y los iconos de la PWA.
>
> Plan original: Escrito el 2026-08-26 a partir del documento
> de identidad del usuario + el escudo y las fotos del campus.
> Regla que se mantiene: **acá no se borra, se apaga** — esto es una capa de identidad
> sobre la arquitectura existente. No se toca React Router, Supabase ni los triggers.

---

## 0. Decisiones tomadas y lo que falta

### ✅ Resuelto (2026-08-26)
- **Nombre: PoliSport EPN.** Descriptor: *Reservas Deportivas*.
- **Eslogan: "Tu espacio · Tu deporte · Tu Politécnica."** Ya viene dentro del logo.
- **Logo recibido:** escudo EPN + figura deportiva, sobre bloque tipográfico
  POLISPORT (azul + rojo) / EPN / RESERVAS DEPORTIVAS / eslogan.

### ⏳ Falta
| # | Qué | Por qué bloquea |
|---|---|---|
| 1 | El **archivo** del logo guardado en `public/logo.png` | Hoy solo existe como imagen en el chat; no está en el repo ni en Downloads. |
| 2 | Una versión **con fondo transparente** | Ver abajo — es lo más importante. |
| 3 | Hex exactos del azul, el rojo y el dorado | Con un cuentagotas sobre el PNG, o del manual de marca. |
| 4 | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Siguen siendo los de La Fija: la PWA instalada muestra el logo viejo. |

### 🔴 Tres problemas prácticos del logo tal como está

**1. Fondo blanco.** La app es de tema oscuro. Un PNG con fondo blanco se va a ver como
un **rectángulo blanco** flotando en el header, el sidebar y el login. Hace falta la
versión con **transparencia** (PNG con alfa, o SVG). Es lo que más se nota y lo primero
a resolver. Si el generador no da transparencia, se recorta el fondo antes de usarlo.

**2. Es cuadrado, y los `<img>` están calibrados para un logo horizontal.** Los 6 usos
son `h-16` / `h-20` / `h-9` con ancho libre (venían de un logo apaisado). Con una imagen
cuadrada, a 64px de alto queda **chiquito y perdido**. Hay que subir las alturas o, mejor,
usar dos variantes (ver punto 3).

**3. El eslogan no se va a leer en el header.** A la altura de un header, la línea
"TU ESPACIO · TU DEPORTE · TU POLITÉCNICA" queda de 2-3 píxeles: ilegible y sucia.

**Lo que recomiendo: dos archivos.**
- `logo.png` → **versión completa** (la que mandaste, con eslogan). Va solo en el
  **login** y en **actualizar contraseña**, que es donde hay espacio de sobra.
- `logo-compacto.png` → **solo el escudo + "POLISPORT EPN"**, sin el descriptor ni el
  eslogan. Va en el header del cliente, el sidebar del admin y el header móvil del admin.

Con eso el logo se lee bien en los dos tamaños. Si no llegás a hacer la variante
compacta, la alternativa es usar solo la marca gráfica (escudo + figura) en los headers.

### Colores leídos del logo (aproximados — confirmar con cuentagotas)
No los saco de la imagen comprimida como valores definitivos, pero de referencia:
- **Azul politécnico** ≈ `#12294F` — el del escudo y de "POLI"
- **Rojo EPN** ≈ `#E01B24` — el del cuartel superior y de "SPORT"
- **Dorado** ≈ `#C9992E` — engranaje, cinta y la línea bajo "EPN"

Confirman tu propuesta original (`#102A43` / `#C8102E` / `#F2B705`): mismos tres colores,
tonos apenas distintos. Como anotaste en tu documento, van presentados como **paleta de
diseño propuesta**, no como valores oficiales de un manual de marca.

## 1. `src/config/marca.js` — la fuente única

Archivo nuevo. Hoy la marca está desparramada en 8 lugares; después de esto, en uno.

```js
export const MARCA = {
  nombre:      'PoliSport EPN',
  nombreCorto: 'PoliSport',              // para la PWA instalada (cabe poco)
  eslogan:     'Tu espacio. Tu deporte. Tu Politécnica.',
  descripcion: 'Reserva de espacios e implementos deportivos de la EPN',
  logo:         '/logo.png',           // completo, con eslogan → login
  logoCompacto: '/logo-compacto.png',  // escudo + PoliSport EPN → headers
  logoAlt:      'PoliSport EPN — Escuela Politécnica Nacional',
};
```

Se junta con `config/institucion.js`, que ya existe (nombre, siglas, dominio, contacto).

**Consumidores:** `index.html` (título), `vite.config.js` (manifest), `Login`,
`MainLayout`, `AdminLayout`, `ActualizarPassword`, `HeroBanner`.

---

## 2. Paleta — `tailwind.config.js`

El grueso del cambio visual es **un solo archivo**, porque casi toda la UI usa tokens.

| Token | Hoy | Pasa a ser |
|---|---|---|
| `brand` (escala 50→950) | rojo Netflix `#E50914` | **rojo EPN** — color de acción |
| `surface` (escala 50→950) | grises neutros / negro | **azules muy oscuros** — la estructura |
| `gold` | `#E9B949` | dorado del escudo — destacados |
| `pitch` | `#19C37D` | **se queda**: es el verde de "confirmado/éxito", no es marca |

Se mantiene tu criterio: **azul = estructura, rojo = acción, dorado = destacado.**
El rojo no domina; queda para botones primarios y estados críticos.

⚠️ **Descartado: la paleta clara** (`#FFFFFF`, `#F4F6F8`). La app es oscura de raíz
(bordes `white/10`, glows, cards translúcidas): pasarla a claro no es cambiar tokens, es
recalibrar cada componente. Va la variante oscura de tu documento (`#08111F`, `#102A43`),
que además pega con las fotos del campus de noche y con la pista azul.

### ⚠️ Los colores que NO siguen los tokens

Esto es lo que se suele olvidar y deja manchas rojas sueltas después del cambio.
Hay **~25 hex escritos a mano** en JSX (más 5 `rgba(229,9,20,…)` del rojo viejo):

| Archivo | Cuántos | Qué son |
|---|---|---|
| `pages/admin/Dashboard.jsx` | 8 + colores de gráficos | fondos y series de Recharts |
| `pages/Login.jsx` | 5 | el degradado radial rojo del panel y `#13181A` de la tarjeta |
| `App.jsx` | 3 | estilo de los toasts (`#1f2937`, `#E50914`) |
| `layouts/MainLayout.jsx`, `layouts/AdminLayout.jsx` | 2 c/u | fondos de header/sidebar |
| `pages/Home.jsx` | 2 | fondo de tarjetas y el degradado de "¿Cómo funciona?" |
| `pages/MisReservas.jsx` | 2 | borde izquierdo de la tarjeta según estado |
| `components/MapaCancha.jsx` | 1 | color del marcador |

Hay que repasarlos a mano. **Sin esto, el cambio de paleta queda a medias.**

---

## 3. Tipografía — `index.css` + `tailwind.config.js`

- `font-display`: **Anton → Montserrat ExtraBold** (o Manrope ExtraBold). Dos líneas:
  el `@import` de Google Fonts en `index.css` y el `fontFamily.display` en la config.
- `font-sans`: **Manrope se queda**.
- Ojo: `.display-title` **ya aplica mayúsculas**. El "RESERVA TU CANCHA" de tu documento
  ya es el comportamiento actual, no hay que hacer nada.

---

## 4. Textos: de "cliente" a "estudiante"

Inventario real: **47 apariciones de "cliente" en 17 archivos** (los de módulos apagados
—premios, sponsors, torneos, pagos— se pueden saltear: no se ven).

A tocar de verdad:
`ReservasAdmin`, `PrestamosAdmin`, `Dashboard`, `CanchasAdmin`, `SoporteAdmin`,
`ValidarReserva`, `PromocionesAdmin`, `Soporte`, `Tienda`, `ActivarNotificaciones`.

Cambios de lenguaje acordados:

| Antes | Ahora |
|---|---|
| Cliente / tus clientes | **Estudiante** |
| Métricas de tu plataforma | **Panel de Gestión Deportiva** |
| Avisos al dueño | Avisos al encargado |
| Cancha | **Espacio deportivo** (donde el texto lo permita) |

**Rechazado del documento original** (con motivo):
- ❌ "Mis reservas deportivas" en el menú → el menú inferior tiene 5 ítems en celular
  y ese label se corta. Va **"Reservas"**. Los nombres largos van en los encabezados
  de página, los cortos en la navegación.
- ❌ "Mi perfil politécnico" en el menú → misma razón. Sirve como título de la página.

**Ya hecho, no replanificar:** "Tienda"→Implementos, "Comprar"→Pedir prestado,
carrito→mochila, precio→valor de reposición.

---

## 5. Home orientado al estudiante

Lo que ya existe: hero, accesos rápidos, "¿cómo funciona?" en 3 pasos, listado de canchas.
Lo que cambia (copy y orden, no arquitectura):

- Saludo **"Hola, {nombre} 👋 · ¿Qué querés hacer hoy?"** — el nombre ya está en `perfil`.
- Los 3 accesos principales al frente: **Reservar cancha · Solicitar implementos · Mis reservas.**
- Hero: *"Muévete. Reserva. Juega."* + el eslogan + botones **RESERVAR** / **VER IMPLEMENTOS**.
- El paso 2 del "¿cómo funciona?" ya dice "Esperá la aprobación" (se corrigió al sacar los pagos).

---

## 6. Pantalla del QR (la que se luce en la defensa)

`ReservaDetalle` ya muestra el QR grande cuando la reserva está confirmada. Le falta
el marco institucional: **QR + datos de la reserva + "Presentá este código al ingresar
a las instalaciones deportivas" + Escuela Politécnica Nacional al pie.** Es la pantalla
que va a quedar proyectada en la defensa; vale la pena dedicarle un rato.

---

## 7. Dashboard admin

Al apagar los pagos quedó un hueco donde estaban *Ingresos de hoy* e *Ingresos del mes*.
Se llena con métricas que sí existen:

| Tarjeta | De dónde sale | ¿Existe el cálculo? |
|---|---|---|
| Reservas de hoy | `reservas` | ✅ ya está |
| Espacios deportivos | `canchas` | ✅ ya está |
| Estudiantes activos | `perfiles` | ✅ ya está |
| **Solicitudes pendientes** | `prestamos` estado `solicitado` | ❌ hay que agregar la consulta |
| **Implementos prestados** | `prestamos` estado `prestado` | ❌ hay que agregar la consulta |

Y el encabezado pasa a **"Panel de Gestión Deportiva — Escuela Politécnica Nacional"**.

---

## 8. Firma institucional

❌ **No va un footer.** En celular, abajo está la barra de navegación fija y chocarían.
✅ Va en **Login** (donde ya está el bloque de la Escuela Politécnica Nacional) y en
**Mi perfil**: nombre de la app, "Escuela Politécnica Nacional · Quito, Ecuador" y
"Desarrollado como proyecto de titulación".

---

## 9. Corregir en el documento de identidad (ya no aplica)

Para que no se defienda una versión que no corre:
- **El comprobante de pago ya no existe** (secciones 10, 17 y 19 del documento). El flujo
  es reservar → el encargado confirma → QR. En el argumento, "Comprobante + aprobación"
  se reemplaza por **"Aprobación del encargado"**.
- **El color de La Fija era rojo** (`#E50914`), no verde. El verde es solo el color de éxito.
- **Los estados del préstamo son 4, no 5**: `solicitado → aprobado → prestado → devuelto`,
  más las salidas `rechazado` y `cancelado`. "Aprobado" **es** "pendiente de entrega".

---

## Orden de ejecución

1. `config/marca.js` + los 6 usos del logo + `index.html` + manifest → **la app deja de decir "La Fija"**.
2. Paleta en `tailwind.config.js` → el 80% del cambio visual, de una.
3. Los ~25 hex hardcodeados → sin esto quedan manchas del rojo viejo.
4. Tipografía.
5. Textos cliente → estudiante.
6. Home, pantalla del QR y Dashboard.
7. `npm run build` y revisar en celular (el menú inferior es donde más se rompe el copy largo).

Los pasos 1 y 2 son los que más cambian la percepción por minuto invertido. Si la noche
se corta, con esos dos ya no parece la app comercial.

## Fuera de alcance
Arquitectura, base de datos, triggers, rutas y lógica de negocio: **no se tocan**.
Fotos del campus: las conseguís vos (si se reconocen caras, hace falta consentimiento).
