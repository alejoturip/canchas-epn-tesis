/**
 * prestamos.js — Helpers del módulo de préstamo de implementos (versión TESIS).
 *
 * El préstamo vive atado a una reserva: el retiro es al inicio del horario y la
 * devolución al final. Por eso "atrasado" no es un estado guardado en la base,
 * se deduce comparando el fin del horario contra el reloj (igual que la tabla
 * de posiciones de torneos, que también se calcula en el front).
 */

export const ESTADOS_PRESTAMO = {
  solicitado: { label: 'Solicitado', badge: 'badge-amber', icon: 'hourglass_top' },
  aprobado:   { label: 'Aprobado',   badge: 'badge-brand', icon: 'check_circle' },
  prestado:   { label: 'Prestado',   badge: 'badge-green', icon: 'inventory_2' },
  devuelto:   { label: 'Devuelto',   badge: 'badge-gray',  icon: 'assignment_turned_in' },
  rechazado:  { label: 'Rechazado',  badge: 'badge-red',   icon: 'cancel' },
  cancelado:  { label: 'Cancelado',  badge: 'badge-gray',  icon: 'block' },
};

export const estadoPrestamo = (estado) =>
  ESTADOS_PRESTAMO[estado] || { label: estado, badge: 'badge-gray', icon: 'help' };

/** Momento en que vence el préstamo = fin del horario de la reserva. */
export const vencimiento = (reserva) => {
  if (!reserva?.fecha || !reserva?.hora_fin) return null;
  return new Date(`${reserva.fecha}T${reserva.hora_fin}`);
};

/** Está entregado y su horario ya terminó → hay implementos sin devolver. */
export const estaAtrasado = (prestamo) => {
  if (prestamo?.estado !== 'prestado') return false;
  const vence = vencimiento(prestamo.reservas);
  return vence ? vence.getTime() < Date.now() : false;
};

/** Unidades pedidas en total (para mostrar "3 implementos"). */
export const totalUnidades = (items = []) =>
  items.reduce((s, i) => s + (i.cantidad || 0), 0);

/** Suma del valor de reposición, para la constancia de responsabilidad. */
export const valorReposicionTotal = (items = []) =>
  items.reduce((s, i) => s + (Number(i.valor_reposicion) || 0) * (i.cantidad || 0), 0);

/** Unidades que no volvieron (solo tiene sentido con el préstamo ya devuelto). */
export const faltantes = (items = []) =>
  items.reduce((s, i) => s + ((i.cantidad || 0) - (i.devueltos || 0)), 0);

/** "Cancha 1 · 12/09 · 18:00–19:00" para los encabezados de las tarjetas. */
export const resumenReserva = (reserva) => {
  if (!reserva) return 'Reserva eliminada';
  const [a, m, d] = (reserva.fecha || '').split('-');
  const fecha = d ? `${d}/${m}/${a.slice(2)}` : '—';
  const desde = (reserva.hora_inicio || '').slice(0, 5);
  const hasta = (reserva.hora_fin || '').slice(0, 5);
  return `${reserva.canchas?.nombre || 'Cancha'} · ${fecha} · ${desde}–${hasta}`;
};
