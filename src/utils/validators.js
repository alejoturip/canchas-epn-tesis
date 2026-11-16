/**
 * validators.js — Validaciones reutilizables para formularios.
 */

export const esEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * ¿El correo pertenece al dominio dado? Acepta subdominios de la institución
 * (ej: `@fis.epn.edu.ec`), que en las universidades son reales.
 * @param {string} email
 * @param {string} dominio  Ej: 'epn.edu.ec' (sin arroba)
 */
export const esCorreoDeDominio = (email, dominio) => {
  if (!esEmailValido(email)) return false;
  const d = String(email).trim().toLowerCase().split('@')[1] || '';
  const base = String(dominio).toLowerCase();
  return d === base || d.endsWith(`.${base}`);
};

/**
 * ¿El código único tiene el formato esperado? Solo dígitos, cantidad exacta.
 * La unicidad NO se puede validar acá: la impone el índice único de la base.
 * @param {string} codigo
 * @param {number} digitos
 */
export const esCodigoUnicoValido = (codigo, digitos) =>
  new RegExp(`^[0-9]{${digitos}}$`).test(String(codigo || '').trim());

export const esPasswordValido = (password) =>
  password && password.length >= 6;

export const esTelefonoEcuador = (tel) =>
  /^(09\d{8}|02\d{7}|0[3-7]\d{7})$/.test(tel.replace(/\s/g, ''));

export const esFechaFutura = (fechaStr) => {
  if (!fechaStr) return false;
  return new Date(fechaStr) > new Date();
};
