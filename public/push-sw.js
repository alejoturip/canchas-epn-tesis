/* ===========================================================================
 * push-sw.js — Handlers de PUSH del service worker.
 * ---------------------------------------------------------------------------
 * NO se registra solo: el service worker que genera vite-plugin-pwa lo carga
 * con importScripts (ver `workbox.importScripts` en vite.config.js).
 *
 * Se ejecuta AUNQUE LA APP ESTÉ CERRADA. Por eso el push llega al celular.
 * =========================================================================== */

// Ícono y color de la notificación (los del manifest de La Fija)
const ICONO = '/icon-192.png';
const BADGE = '/icon-192.png';

/** Llega un push desde la Edge Function `enviar-push`. */
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Si el payload no fuera JSON, lo mostramos como texto plano.
    data = { titulo: 'La Fija', mensaje: event.data ? event.data.text() : '' };
  }

  const titulo = data.titulo || 'La Fija';
  const opciones = {
    body: data.mensaje || '',
    icon: ICONO,
    badge: BADGE,
    // `tag` evita apilar 10 avisos iguales; `renotify` hace que igual vibre.
    tag: data.tipo || 'lafija',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { enlace: data.enlace || '/', id: data.id || null },
    actions: [{ action: 'abrir', title: 'Ver' }],
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

/** El usuario tocó la notificación → abrimos la app en el enlace correcto. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const enlace = (event.notification.data && event.notification.data.enlace) || '/';
  const destino = new URL(enlace, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      // Si la app ya está abierta en alguna pestaña, la reusamos y navegamos.
      for (const cliente of clientes) {
        if ('focus' in cliente) {
          cliente.focus();
          if ('navigate' in cliente) cliente.navigate(destino);
          return;
        }
      }
      // Si no, abrimos una ventana nueva.
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    }),
  );
});
