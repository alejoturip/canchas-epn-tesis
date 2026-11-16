/**
 * horarios.js — utilidades para el horario de atención de cada cancha.
 * Columnas en `canchas`: hora_apertura (time), hora_cierre (time),
 * dias_atencion (smallint[] con 0=Dom .. 6=Sáb, igual que Date.getDay()).
 * Si una cancha no tiene estos datos (BD vieja), se asume 8:00–22:00 todos los días.
 */

export const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

// Orden de la semana para mostrar (Lun primero); n = valor de Date.getDay()
export const DIAS = [
  { n: 1, label: 'Lun' },
  { n: 2, label: 'Mar' },
  { n: 3, label: 'Mié' },
  { n: 4, label: 'Jue' },
  { n: 5, label: 'Vie' },
  { n: 6, label: 'Sáb' },
  { n: 0, label: 'Dom' },
];

const parseHoraInt = (t, def) => {
  if (t == null) return def;
  const h = parseInt(String(t).split(':')[0], 10);
  return Number.isNaN(h) ? def : h;
};

export const aperturaInt = (c) => parseHoraInt(c?.hora_apertura, 8);
export const cierreInt = (c) => parseHoraInt(c?.hora_cierre, 22);

export const diasAtiende = (c) =>
  Array.isArray(c?.dias_atencion) && c.dias_atencion.length ? c.dias_atencion : TODOS_LOS_DIAS;

/** Lista de horas de inicio reservables ['08:00', ..., '21:00'] según apertura/cierre. */
export const horariosBase = (c) => {
  const a = aperturaInt(c);
  const cierre = cierreInt(c);
  const out = [];
  for (let h = a; h < cierre; h++) out.push(`${h < 10 ? '0' : ''}${h}:00`);
  return out;
};

/** ¿La cancha atiende en esa fecha ('YYYY-MM-DD')? */
export const atiendeFecha = (c, fechaStr) => {
  if (!fechaStr) return true;
  const d = new Date(fechaStr + 'T00:00:00').getDay();
  return diasAtiende(c).includes(d);
};

/** ¿Atiende hoy? */
export const atiendeHoy = (c) => diasAtiende(c).includes(new Date().getDay());

/** Texto lindo para mostrar: { diasTxt: 'Lun a Sáb', horas: '08:00–22:00' } */
export const formatHorario = (c) => {
  const set = [...diasAtiende(c)].sort((x, y) => x - y);
  const a = aperturaInt(c);
  const cierre = cierreInt(c);
  const horas = `${a < 10 ? '0' : ''}${a}:00–${cierre < 10 ? '0' : ''}${cierre}:00`;

  const tiene = (arr) => arr.every((d) => set.includes(d));
  let diasTxt;
  if (tiene(TODOS_LOS_DIAS)) diasTxt = 'Todos los días';
  else if (tiene([1, 2, 3, 4, 5, 6]) && !set.includes(0)) diasTxt = 'Lun a Sáb';
  else if (tiene([1, 2, 3, 4, 5]) && !set.includes(6) && !set.includes(0)) diasTxt = 'Lun a Vie';
  else if (set.length === 0) diasTxt = 'Sin días configurados';
  else diasTxt = DIAS.filter((d) => set.includes(d.n)).map((d) => d.label).join(', ');

  return { diasTxt, horas };
};

/** Nombre del día de una fecha, ej 'domingo'. */
export const nombreDia = (fechaStr) =>
  new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long' });
