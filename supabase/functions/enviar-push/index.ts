// ============================================================================
// Edge Function: enviar-push
// ----------------------------------------------------------------------------
// La llama el trigger `trg_disparar_push` cada vez que se inserta una fila en
// la tabla `notificaciones`. Busca los dispositivos suscritos de ese usuario y
// les manda el push (llega aunque la app esté cerrada).
//
// Secrets que necesita (se cargan con `supabase secrets set`, ver GUIA_PUSH.md):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase solo.)
//
// Desplegar:  supabase functions deploy enviar-push
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@lafija.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // ignora RLS: lee las suscripciones de todos
);

Deno.serve(async (req) => {
  try {
    const { record } = await req.json();

    if (!record?.usuario_id) {
      return new Response(JSON.stringify({ error: 'Falta record.usuario_id' }), { status: 400 });
    }

    // Dispositivos de ese usuario (puede tener celular + computadora)
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('usuario_id', record.usuario_id);

    if (error) throw error;
    if (!subs?.length) {
      return new Response(JSON.stringify({ enviados: 0, motivo: 'sin dispositivos' }), { status: 200 });
    }

    // Lo que recibe el service worker (public/push-sw.js)
    const payload = JSON.stringify({
      titulo: record.titulo ?? 'La Fija',
      mensaje: record.mensaje ?? '',
      enlace: record.enlace ?? '/',
      tipo: record.tipo ?? 'info',
      id: record.id ?? null,
    });

    let enviados = 0;
    const muertas: number[] = [];

    await Promise.all(subs.map(async (s) => {
      const suscripcion = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };

      try {
        // Ciframos con web-push pero hacemos el envío con fetch (Deno no tiene node:https).
        const detalles = webpush.generateRequestDetails(suscripcion, payload, { TTL: 60 * 60 * 24 });

        const res = await fetch(detalles.endpoint, {
          method: 'POST',
          headers: detalles.headers as Record<string, string>,
          body: detalles.body as BodyInit,
        });

        if (res.ok) {
          enviados++;
        } else if (res.status === 404 || res.status === 410) {
          // El navegador desinstaló la app o revocó el permiso → suscripción muerta
          muertas.push(s.id);
        } else {
          console.error('Push falló', s.endpoint, res.status, await res.text());
        }
      } catch (e) {
        console.error('Error enviando push', s.endpoint, e);
      }
    }));

    // Limpieza: sacamos los dispositivos que ya no existen
    if (muertas.length) {
      await supabase.from('push_subscriptions').delete().in('id', muertas);
    }

    return new Response(
      JSON.stringify({ enviados, limpiados: muertas.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
