/**
 * torneos.js — lógica pura del motor de torneos (sin acceso a BD).
 *   • generarFixtureLiga  → calendario "todos contra todos" (round-robin)
 *   • generarBracket      → llave de eliminación directa (con byes)
 *   • avanzarBracket      → coloca a los ganadores en la ronda siguiente
 *   • calcularPosiciones  → tabla de posiciones a partir de los partidos jugados
 */

export const TIPOS_TORNEO = [
  { value: 'liga',        label: 'Liga (todos contra todos)', desc: 'Tabla de posiciones por puntos.' },
  { value: 'eliminacion', label: 'Eliminación directa',       desc: 'Llave: el que pierde queda afuera.' },
  { value: 'relampago',   label: 'Relámpago',                 desc: 'Rápido, en un día (llave corta).' },
  { value: 'grupos',      label: 'Grupos + eliminatorias',    desc: 'Fase de grupos y luego playoffs.' },
];

// Nombre de la fase según cuántos equipos compiten en esa ronda
export function faseNombrePorEquipos(equiposEnRonda) {
  switch (equiposEnRonda) {
    case 2:  return 'final';
    case 4:  return 'semifinal';
    case 8:  return 'cuartos';
    case 16: return 'octavos';
    case 32: return 'dieciseisavos';
    default: return 'ronda';
  }
}

export const FASE_LABEL = {
  liga: 'Liga',
  grupos: 'Fase de grupos',
  dieciseisavos: 'Dieciseisavos',
  octavos: 'Octavos',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
  tercer_puesto: '3.er puesto',
  ronda: 'Ronda',
};

/**
 * Round-robin (método del círculo). Recibe ids de equipos.
 * Devuelve partidos: { ronda, orden, equipo_local_id, equipo_visitante_id, fase }.
 * Alterna la localía por ronda. Si el nº de equipos es impar, uno descansa.
 */
export function generarFixtureLiga(equipoIds) {
  const ids = [...equipoIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 !== 0) ids.push(null); // "fantasma" → descanso

  const n = ids.length;
  const rondas = n - 1;
  const mitad = n / 2;
  const arr = [...ids];
  const partidos = [];

  for (let r = 0; r < rondas; r++) {
    let orden = 1;
    for (let i = 0; i < mitad; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== null && b !== null) {
        const [local, visita] = r % 2 === 0 ? [a, b] : [b, a];
        partidos.push({ ronda: r + 1, orden: orden++, equipo_local_id: local, equipo_visitante_id: visita, fase: 'liga' });
      }
    }
    // rotación: se fija el primero y rota el resto
    const fijo = arr[0];
    const resto = arr.slice(1);
    resto.unshift(resto.pop());
    arr.splice(0, arr.length, fijo, ...resto);
  }
  return partidos;
}

function siguientePotenciaDe2(n) { let p = 1; while (p < n) p *= 2; return p; }

/**
 * Llave de eliminación directa. Devuelve TODOS los partidos del cuadro:
 *   - ronda 1 con los emparejamientos (con null = bye)
 *   - rondas siguientes vacías (se llenan con avanzarBracket al cargar resultados)
 */
export function generarBracket(equipoIds) {
  const ids = [...equipoIds];
  if (ids.length < 2) return [];
  const size = siguientePotenciaDe2(ids.length);
  const slots = [...ids];
  while (slots.length < size) slots.push(null); // byes

  const partidos = [];
  // Ronda 1
  const faseR1 = faseNombrePorEquipos(size);
  let orden = 1;
  for (let i = 0; i < size; i += 2) {
    partidos.push({ ronda: 1, orden: orden++, fase: faseR1, equipo_local_id: slots[i] ?? null, equipo_visitante_id: slots[i + 1] ?? null });
  }
  // Rondas siguientes (placeholders)
  let equiposRonda = size / 2;
  let ronda = 2;
  while (equiposRonda >= 2) {
    const fase = faseNombrePorEquipos(equiposRonda);
    let o = 1;
    for (let i = 0; i < equiposRonda / 2; i++) {
      partidos.push({ ronda, orden: o++, fase, equipo_local_id: null, equipo_visitante_id: null });
    }
    equiposRonda /= 2;
    ronda++;
  }
  return partidos;
}

/** Ganador de un partido (id) o null si no se puede determinar todavía. */
export function ganadorPartido(p) {
  // Bye: si hay un solo equipo presente, ese avanza
  if (p.equipo_local_id && !p.equipo_visitante_id) return p.equipo_local_id;
  if (!p.equipo_local_id && p.equipo_visitante_id) return p.equipo_visitante_id;
  if (p.estado !== 'jugado' || p.goles_local == null || p.goles_visitante == null) return null;
  if (p.goles_local > p.goles_visitante) return p.equipo_local_id;
  if (p.goles_local < p.goles_visitante) return p.equipo_visitante_id;
  return null; // empate (en llave habría que definir por penales manualmente)
}

/**
 * Recalcula los emparejamientos de las rondas siguientes de una llave.
 * Recibe los partidos (con ids reales) y devuelve los que cambiaron, listos
 * para hacer UPDATE: [{ id, equipo_local_id, equipo_visitante_id }].
 */
export function avanzarBracket(partidos) {
  const porRonda = {};
  partidos.forEach((p) => { (porRonda[p.ronda] ||= []).push(p); });
  const rondas = Object.keys(porRonda).map(Number).sort((a, b) => a - b);
  const cambios = [];

  for (let i = 0; i < rondas.length - 1; i++) {
    const actual = [...porRonda[rondas[i]]].sort((a, b) => a.orden - b.orden);
    const siguiente = [...porRonda[rondas[i + 1]]].sort((a, b) => a.orden - b.orden);

    actual.forEach((p, idx) => {
      const destino = siguiente[Math.floor(idx / 2)];
      if (!destino) return;
      const ganador = ganadorPartido(p);
      const esLocal = idx % 2 === 0;
      const campo = esLocal ? 'equipo_local_id' : 'equipo_visitante_id';
      if (destino[campo] !== ganador) {
        destino[campo] = ganador; // mutamos para encadenar rondas
        cambios.push({ id: destino.id, equipo_local_id: destino.equipo_local_id, equipo_visitante_id: destino.equipo_visitante_id });
      }
    });
  }
  // Dedupe por id (la última versión gana)
  const map = new Map();
  cambios.forEach((c) => map.set(c.id, c));
  return [...map.values()];
}

/**
 * Tabla de posiciones de una liga / grupo.
 * equipos: [{ id, nombre, ... }]  ·  partidos: filas de `partidos`
 * Devuelve filas ordenadas con: pj, pg, pe, pp, gf, gc, dg, pts.
 */
export function calcularPosiciones(equipos, partidos, opts = {}) {
  const { puntosVictoria = 3, puntosEmpate = 1 } = opts;
  const tabla = {};
  equipos.forEach((e) => {
    tabla[e.id] = { equipo: e, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  });

  partidos
    .filter((p) => p.estado === 'jugado' && p.goles_local != null && p.goles_visitante != null && p.equipo_local_id && p.equipo_visitante_id)
    .forEach((p) => {
      const L = tabla[p.equipo_local_id];
      const V = tabla[p.equipo_visitante_id];
      if (!L || !V) return;
      const gl = Number(p.goles_local), gv = Number(p.goles_visitante);
      L.pj++; V.pj++;
      L.gf += gl; L.gc += gv;
      V.gf += gv; V.gc += gl;
      if (gl > gv) { L.pg++; V.pp++; L.pts += puntosVictoria; }
      else if (gl < gv) { V.pg++; L.pp++; V.pts += puntosVictoria; }
      else { L.pe++; V.pe++; L.pts += puntosEmpate; V.pts += puntosEmpate; }
    });

  return Object.values(tabla)
    .map((t) => ({ ...t, dg: t.gf - t.gc }))
    .sort((a, b) =>
      b.pts - a.pts ||
      b.dg - a.dg ||
      b.gf - a.gf ||
      a.equipo.nombre.localeCompare(b.equipo.nombre)
    );
}
