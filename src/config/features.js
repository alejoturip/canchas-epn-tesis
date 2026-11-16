/**
 * features.js — Interruptores de módulos (feature flags)
 * ---------------------------------------------------------------------------
 * Versión TESIS (Escuela Politécnica Nacional). Esta app es un recorte de
 * "La Fija": se apagaron módulos que no entran en el alcance del trabajo.
 *
 * ⚠️ REGLA DE ESTE PROYECTO: acá NO se borra código, se APAGA.
 * Los archivos de torneos, premios y sponsors siguen en el repo, completos y
 * funcionando. Simplemente no se rutean ni se muestran en los menús. Como
 * nadie los importa, Vite tampoco los mete en el bundle final.
 *
 * ¿Querés volver a prender un módulo? Poné su flag en `true`. Nada más.
 * (Ojo: si prendés TORNEOS o FIDELIZACION, hay que crear también sus tablas
 * en la base — ver torneos_motor.sql y recompensas_catalogo.sql.)
 */

export const FEATURES = {
  // ── Activos en la tesis ────────────────────────────────────────────────
  RESERVAS:     true,   // reservar cancha + QR de acceso + validación en puerta
  TIENDA:       true,   // implementos deportivos
  PROMOCIONES:  true,   // promos en el carrusel del inicio
  SOPORTE:      true,   // tickets de ayuda
  NOTIFICACIONES: true, // campana in-app en tiempo real

  // ── Apagados en la tesis ───────────────────────────────────────────────
  PAGOS:        false,  // cobro: comprobante + cuenta bancaria + aprobación.
                        // Apagado: los escenarios son de la universidad y no se
                        // cobra. El QR ya NO lo genera el trigger de pagos; lo
                        // genera `trg_reserva_confirmada` al confirmar la reserva
                        // (supabase/reservas_sin_pago.sql). Si lo volvés a prender,
                        // los dos caminos conviven sin duplicar avisos.
  TORNEOS:      false,  // motor de torneos (liga, llaves, goleadores, PDF)
  FIDELIZACION: false,  // puntos, niveles, premios y catálogo de recompensas
  SPONSORS:     false,  // auspiciantes (es un módulo comercial)
  PUSH:         false,  // avisos al celular con la app cerrada.
                        // Apagado a propósito: necesita llaves VAPID + Edge
                        // Function + HTTPS. La campana in-app ya cubre el aviso.
};

/** Helper corto por si querés escribir `si('TORNEOS') && ...` en un JSX. */
export const si = (flag) => FEATURES[flag] === true;
