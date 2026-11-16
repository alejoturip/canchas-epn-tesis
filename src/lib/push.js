/**
 * push.js — Suscripción a notificaciones push (llegan con la app cerrada).
 *
 * Cómo funciona:
 *   1. El usuario toca "Activar avisos" → el navegador le pide permiso.
 *   2. El navegador nos da una "suscripción" (un buzón único de ese aparato).
 *   3. La guardamos en `push_subscriptions` (ver supabase/push_notificaciones.sql).
 *   4. La Edge Function `enviar-push` le manda avisos a ese buzón.
 *
 * La clave pública VAPID va en `.env` como VITE_VAPID_PUBLIC_KEY.
 */
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** ¿El navegador soporta push? (Chrome, Edge, Firefox, y Safari 16.4+ instalado) */
export function soportaPush() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** 'default' (nunca preguntó) | 'granted' (dijo que sí) | 'denied' (bloqueado) */
export function estadoPermiso() {
  if (!soportaPush()) return 'unsupported';
  return Notification.permission;
}

/** ¿Es un iPhone/iPad? En iOS el push SOLO anda con la PWA instalada. */
export function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** ¿La PWA está instalada (abierta desde el ícono, no desde el navegador)? */
export function esPWAInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * En iPhone, si la app se abre desde Safari (no desde el ícono de inicio),
 * el botón de push no sirve: Apple lo bloquea. Hay que avisarle al usuario.
 */
export function necesitaInstalarEnIOS() {
  return esIOS() && !esPWAInstalada();
}

/** La clave VAPID viene en base64url y el navegador la pide como bytes. */
function base64UrlAUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normal);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Devuelve la suscripción actual de ESTE aparato, o null. */
export async function suscripcionActual() {
  if (!soportaPush()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** ¿Este aparato ya está recibiendo avisos? */
export async function yaSuscrito() {
  return Boolean(await suscripcionActual());
}

/**
 * Pide permiso, suscribe el aparato y lo guarda en la BD.
 * Devuelve { ok: true } o { ok: false, motivo: '...' }.
 */
export async function activarPush(userId) {
  if (!soportaPush()) {
    return { ok: false, motivo: 'Tu navegador no soporta notificaciones.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, motivo: 'Falta configurar VITE_VAPID_PUBLIC_KEY en el .env.' };
  }
  if (necesitaInstalarEnIOS()) {
    return {
      ok: false,
      motivo: 'En iPhone primero tenés que instalar la app: Compartir → "Agregar a inicio".',
    };
  }
  if (!userId) return { ok: false, motivo: 'Tenés que iniciar sesión.' };

  // 1) Permiso del navegador (el cartelito nativo). Si dice que no, no se puede insistir.
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    return {
      ok: false,
      motivo:
        permiso === 'denied'
          ? 'Bloqueaste las notificaciones. Habilitalas desde el candado 🔒 de la barra de direcciones.'
          : 'No aceptaste las notificaciones.',
    };
  }

  // 2) El service worker tiene que estar listo antes de suscribir.
  const reg = await navigator.serviceWorker.ready;

  // 3) Reusamos la suscripción si ya existía; si no, creamos una.
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true, // obligatorio en Chrome: todo push debe mostrar algo
      applicationServerKey: base64UrlAUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // 4) La guardamos en la BD. `endpoint` es único → si ya estaba, la actualiza.
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      usuario_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' },
  );

  if (error) return { ok: false, motivo: 'No se pudo guardar el aparato: ' + error.message };
  return { ok: true };
}

/** Apaga los avisos en ESTE aparato (no toca los demás dispositivos del usuario). */
export async function desactivarPush() {
  const sub = await suscripcionActual();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}
