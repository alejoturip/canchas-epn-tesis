# 🎬 Guía para dar la demo de La Fija

Un guion simple para mostrar la app a un dueño de cancha y que diga "lo quiero". Dura ~10 min.

---

## 🔧 Antes de la reunión (una sola vez)

1. **Llena la app con datos de ejemplo:** en Supabase → SQL Editor, corre **`supabase/datos_demo.sql`**.
   Eso carga 3 canchas, productos, promos y un torneo con tabla de posiciones. La app deja de verse vacía.
2. **Ten 2 logins listos:**
   - **Tu cuenta admin** (la que ya usas) → para mostrar el panel del dueño.
   - **Una cuenta de cliente** → regístrate normal con un correo cualquiera (ej. `cliente.demo@gmail.com`).
     Así muestras "cómo lo ve el cliente" sin entrar a lo de admin.
3. **(Opcional, pero MUY potente):** antes de la reunión, en tu panel crea **1 cancha con el nombre y una foto reales del cliente**. Cuando la vea, se vende solo. 🔥

> 💡 Demo presencial: lleva tu celular con la app abierta. Demo a distancia: comparte pantalla por WhatsApp/Meet.

---

## 🗣️ El recorrido (qué tocar y qué decir)

### Parte 1 — "Así lo ve tu cliente" (lado cliente)
1. **Inicio:** "Mira, esta es tu cancha. El cliente entra, ve tus canchas y tus promociones en el carrusel."
2. **Reservar:** entra a una cancha → elige día y hora. *"Reserva solo, desde el celular, a cualquier hora. Ya no te escriben a la 1am preguntando si hay campo."*
3. **Pago:** muestra el QR de pago y dónde sube el comprobante. *"Paga y sube la foto del comprobante."*
4. **Torneos:** abre la **Copa La Fija** → muestra la **tabla de posiciones** y el calendario. *"Si organizas torneos, esto se arma y se actualiza solo. Hasta saca un PDF."*
5. **Tienda y premios:** pasa rápido por la tienda y las recompensas. *"Vendes bebidas/ropa y premias al que más juega para que vuelva."*

### Parte 2 — "Así lo manejas tú" (lado admin)
1. **Entra a tu panel** (`/admin`). *"Este es TU panel, lo manejas desde el celular o la compu."*
2. **Pagos:** muestra cómo apruebas un pago **con 1 toque** y se genera el QR de ingreso. *"Apruebas y listo, el cliente ya tiene su entrada."*
3. **Validar en la puerta:** abre **Validar reserva** → *"En la puerta escaneas el QR y queda registrado quién entró."*
4. **Torneo:** entra a gestionar la Copa → muestra cómo **cargas un resultado** y la tabla cambia sola.
5. **Canchas/Productos:** *"Tú subes tus canchas, fotos, precios y productos. Todo tuyo, con tu logo."*

### Parte 3 — El cierre
- *"Esto ya está funcionando. En una reunión te lo dejo con TUS canchas y horarios, y arrancas el mismo día."*
- Muestra el **PDF de precios** ($39/mes, primer mes de prueba, instalación gratis).
- Pregunta de cierre: **"¿Le damos? Te lo dejo listo esta semana."**

---

## ✅ Tips para que cierre
- **No leas funciones, cuenta el beneficio.** No es "tiene tabla de posiciones automática", es *"ya no pierdes media hora sacando cuentas del torneo a mano"*.
- **Hazlo tocar la app a él.** Que reserve una hora desde su celular. Lo que prueban, lo compran.
- **Cierra con lo que más le interese:** si organiza torneos, entra por ahí; si vive lleno de WhatsApp, entra por las reservas.
- **Ten el precio claro y firme.** $39/mes, primer mes de prueba. No regales el sistema, regala (si acaso) el setup.

---

## 🧹 Después (opcional)
Si quieres dejar la app limpia para el cliente real, corre **`supabase/borrar_datos_demo.sql`** y borra
los datos de ejemplo. Luego cargas las canchas reales de tu cliente.

---

¡A vender! ⚽🔥
