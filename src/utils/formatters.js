/**
 * formatters.js — Funciones utilitarias de formato para toda la app.
 */

/**
 * Formatea un número como precio en dólares.
 * @param {number} value
 * @returns {string}  Ej: "$12.50"
 */
export const formatPrecio = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

/**
 * Formatea una fecha ISO como string legible en español.
 * @param {string} isoString
 * @param {'short'|'long'} formato
 * @returns {string}
 */
export const formatFecha = (isoString, formato = 'long') => {
  if (!isoString) return '—';
  const opciones =
    formato === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(isoString).toLocaleDateString('es-EC', opciones);
};

/**
 * Formatea una hora en formato 12h con AM/PM.
 * @param {string} hora  Ej: "14:00"
 * @returns {string}     Ej: "2:00 PM"
 */
export const formatHora = (hora) => {
  if (!hora) return '—';
  const [h, m] = hora.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Trunca un texto al número de caracteres indicado.
 * @param {string} texto
 * @param {number} maxLen
 * @returns {string}
 */
export const truncar = (texto, maxLen = 80) => {
  if (!texto) return '';
  return texto.length > maxLen ? texto.slice(0, maxLen) + '…' : texto;
};

/**
 * Devuelve un tiempo relativo legible ("hace 5 min", "hace 2 h").
 * @param {string} isoString
 * @returns {string}
 */
export const tiempoRelativo = (isoString) => {
  if (!isoString) return '';
  const seg = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  if (dias < 7) return `hace ${dias} d`;
  return new Date(isoString).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
};

/**
 * Devuelve las iniciales de un nombre completo.
 * @param {string} nombre
 * @returns {string}  Ej: "JP"
 */
export const iniciales = (nombre) => {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');
};
