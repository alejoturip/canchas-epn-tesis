/**
 * torneosService.js — acceso a datos del motor de torneos.
 * Concentra la lógica que toca varias tablas (fixture, llaves, resultados).
 */
import { supabase } from '../lib/supabase';
import { generarFixtureLiga, generarBracket, avanzarBracket } from '../utils/torneos';

// ── Torneos ─────────────────────────────────────────────────────────────────
export async function getTorneos() {
  // Desambiguamos el embed: hay 2 relaciones torneos↔equipos_torneo
  // (equipos_torneo.torneo_id y torneos.campeon_equipo_id) → usamos torneo_id.
  const { data, error } = await supabase
    .from('torneos')
    .select('*, equipos_torneo!torneo_id(count)')
    .order('fecha_inicio', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTorneo(id) {
  const { data, error } = await supabase.from('torneos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function crearTorneo(datos) {
  const { data, error } = await supabase.from('torneos').insert([datos]).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarTorneo(id, datos) {
  const { error } = await supabase.from('torneos').update(datos).eq('id', id);
  if (error) throw error;
}

export async function eliminarTorneo(id) {
  const { error } = await supabase.from('torneos').delete().eq('id', id);
  if (error) throw error;
}

export async function definirCampeon(torneoId, equipoId) {
  const { error } = await supabase
    .from('torneos')
    .update({ campeon_equipo_id: equipoId, estado: 'finalizado' })
    .eq('id', torneoId);
  if (error) throw error;
}

// ── Equipos ─────────────────────────────────────────────────────────────────
export async function getEquipos(torneoId) {
  const { data, error } = await supabase
    .from('equipos_torneo')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** El cliente inscribe SU equipo (queda en estado 'inscrito' a la espera de aprobación). */
export async function inscribirEquipo({ torneo_id, nombre, logo_url = null, capitan_id }) {
  const { data, error } = await supabase
    .from('equipos_torneo')
    .insert([{ torneo_id, nombre, logo_url, capitan_id, estado: 'inscrito', pagado: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function misEquipos(userId) {
  const { data } = await supabase.from('equipos_torneo').select('torneo_id, estado').eq('capitan_id', userId);
  return data || [];
}

export async function actualizarEquipo(id, datos) {
  const { error } = await supabase.from('equipos_torneo').update(datos).eq('id', id);
  if (error) throw error;
}

export async function eliminarEquipo(id) {
  const { error } = await supabase.from('equipos_torneo').delete().eq('id', id);
  if (error) throw error;
}

// ── Partidos ────────────────────────────────────────────────────────────────
export async function getPartidos(torneoId) {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('ronda', { ascending: true })
    .order('orden', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Genera (o regenera) el fixture del torneo a partir de los equipos APROBADOS.
 * Borra los partidos anteriores. Liga → round-robin. Eliminación/relámpago → llave.
 * Grupos → round-robin dentro de cada grupo (campo `grupo`).
 */
export async function generarFixture(torneo, equipos) {
  const aprobados = equipos.filter((e) => e.estado === 'aprobado');
  if (aprobados.length < 2) throw new Error('Se necesitan al menos 2 equipos aprobados.');

  let base = [];
  if (torneo.tipo === 'liga') {
    base = generarFixtureLiga(aprobados.map((e) => e.id));
  } else if (torneo.tipo === 'eliminacion' || torneo.tipo === 'relampago') {
    base = generarBracket(aprobados.map((e) => e.id));
  } else if (torneo.tipo === 'grupos') {
    const grupos = {};
    aprobados.forEach((e) => { (grupos[e.grupo || 'A'] ||= []).push(e.id); });
    Object.entries(grupos).forEach(([g, ids]) => {
      generarFixtureLiga(ids).forEach((p) => base.push({ ...p, fase: 'grupos', grupo: g }));
    });
  }

  // Borrar partidos anteriores y crear los nuevos
  await supabase.from('partidos').delete().eq('torneo_id', torneo.id);
  const filas = base.map((p) => ({
    torneo_id: torneo.id,
    equipo_local_id: p.equipo_local_id ?? null,
    equipo_visitante_id: p.equipo_visitante_id ?? null,
    fase: p.fase,
    ronda: p.ronda,
    orden: p.orden,
    estado: 'programado',
  }));
  if (filas.length) {
    const { error } = await supabase.from('partidos').insert(filas);
    if (error) throw error;
  }
  return filas.length;
}

/**
 * Carga el resultado de un partido. Si el torneo es de eliminación, hace avanzar
 * automáticamente a los ganadores a la ronda siguiente.
 */
export async function cargarResultado(torneo, partido, { goles_local, goles_visitante, fecha, hora, cancha_id }) {
  const datos = {
    goles_local: goles_local === '' ? null : Number(goles_local),
    goles_visitante: goles_visitante === '' ? null : Number(goles_visitante),
    estado: 'jugado',
  };
  if (fecha !== undefined) datos.fecha = fecha || null;
  if (hora !== undefined) datos.hora = hora || null;
  if (cancha_id !== undefined) datos.cancha_id = cancha_id || null;

  const { error } = await supabase.from('partidos').update(datos).eq('id', partido.id);
  if (error) throw error;

  // En llaves: recalcular y avanzar ganadores
  if (torneo.tipo === 'eliminacion' || torneo.tipo === 'relampago') {
    const partidos = await getPartidos(torneo.id);
    const cambios = avanzarBracket(partidos);
    for (const c of cambios) {
      await supabase
        .from('partidos')
        .update({ equipo_local_id: c.equipo_local_id, equipo_visitante_id: c.equipo_visitante_id })
        .eq('id', c.id);
    }
  }
}

/** Reprograma un partido (fecha/hora/cancha) sin cargar resultado. */
export async function programarPartido(id, { fecha, hora, cancha_id }) {
  const { error } = await supabase
    .from('partidos')
    .update({ fecha: fecha || null, hora: hora || null, cancha_id: cancha_id || null })
    .eq('id', id);
  if (error) throw error;
}

// ── Goleadores ──────────────────────────────────────────────────────────────
export async function getGoleadores(torneoId) {
  const { data, error } = await supabase
    .from('goleadores_torneo')
    .select('*, equipo:equipo_id(nombre)')
    .eq('torneo_id', torneoId)
    .order('goles', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function guardarGoleador({ id, torneo_id, equipo_id, nombre, goles }) {
  if (id) {
    const { error } = await supabase.from('goleadores_torneo').update({ equipo_id, nombre, goles: Number(goles) }).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('goleadores_torneo').insert([{ torneo_id, equipo_id, nombre, goles: Number(goles) }]);
    if (error) throw error;
  }
}

export async function eliminarGoleador(id) {
  const { error } = await supabase.from('goleadores_torneo').delete().eq('id', id);
  if (error) throw error;
}
