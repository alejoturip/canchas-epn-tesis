/**
 * niveles.js — Sistema de fidelización por niveles.
 * Los niveles se calculan según los PUNTOS ACUMULADOS del usuario.
 * Ajusta los umbrales (`min`) si cambias la economía de puntos.
 */

export const NIVELES = [
  {
    nombre: 'Bronce',
    min: 0,
    color: '#cd7f32',
    gradient: 'from-amber-700 to-amber-500',
    badge: 'bg-amber-700/20 text-amber-500 border-amber-700/30',
    ring: 'ring-amber-600/40',
  },
  {
    nombre: 'Plata',
    min: 10,
    color: '#c0c0c0',
    gradient: 'from-surface-400 to-surface-200',
    badge: 'bg-surface-400/20 text-surface-200 border-surface-400/30',
    ring: 'ring-surface-300/40',
  },
  {
    nombre: 'Oro',
    min: 25,
    color: '#f59e0b',
    gradient: 'from-accent-dark to-accent-light',
    badge: 'bg-accent/20 text-accent-light border-accent/30',
    ring: 'ring-accent/50',
  },
  {
    nombre: 'Diamante',
    min: 50,
    color: '#38bdf8',
    gradient: 'from-cyan-500 to-blue-400',
    badge: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    ring: 'ring-cyan-400/50',
  },
];

/**
 * Calcula el nivel del usuario según sus puntos.
 * @param {number} puntos
 * @returns {{
 *   actual: object,            // objeto del nivel actual
 *   siguiente: object|null,    // siguiente nivel, o null si ya es el máximo
 *   indice: number,
 *   progreso: number,          // 0-100 hacia el siguiente nivel
 *   puntosParaSiguiente: number,
 *   esMaximo: boolean
 * }}
 */
export const calcularNivel = (puntos = 0) => {
  const p = Number(puntos) || 0;

  // Buscamos el nivel más alto cuyo umbral ya alcanzamos
  let indice = 0;
  for (let i = 0; i < NIVELES.length; i++) {
    if (p >= NIVELES[i].min) indice = i;
  }

  const actual = NIVELES[indice];
  const siguiente = NIVELES[indice + 1] || null;
  const esMaximo = !siguiente;

  let progreso = 100;
  let puntosParaSiguiente = 0;

  if (siguiente) {
    const rango = siguiente.min - actual.min;
    const avance = p - actual.min;
    progreso = Math.min(Math.round((avance / rango) * 100), 100);
    puntosParaSiguiente = Math.max(siguiente.min - p, 0);
  }

  return { actual, siguiente, indice, progreso, puntosParaSiguiente, esMaximo };
};
