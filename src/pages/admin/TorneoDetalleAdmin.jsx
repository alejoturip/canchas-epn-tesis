import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { calcularPosiciones, FASE_LABEL } from '../../utils/torneos';
import { generarPdfTorneo } from '../../utils/torneoPdf';
import {
  getTorneo, getEquipos, getPartidos, getGoleadores,
  actualizarEquipo, eliminarEquipo, generarFixture, cargarResultado,
  guardarGoleador, eliminarGoleador, definirCampeon,
} from '../../services/torneosService';
import { toastExito, toastError } from '../../lib/notify';

const nombreEq = (map, id) => (id ? (map[id]?.nombre || 'Equipo') : 'Por definir');

// ── Fila de partido con carga de resultado ──────────────────────────────────
function PartidoFila({ p, equiposById, canchas, onGuardar }) {
  const [gl, setGl] = useState(p.goles_local ?? '');
  const [gv, setGv] = useState(p.goles_visitante ?? '');
  const [fecha, setFecha] = useState(p.fecha ?? '');
  const [hora, setHora] = useState(p.hora ? p.hora.slice(0, 5) : '');
  const [cancha, setCancha] = useState(p.cancha_id ?? '');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    await onGuardar(p, { goles_local: gl, goles_visitante: gv, fecha, hora, cancha_id: cancha });
    setSaving(false);
  };

  const jugado = p.estado === 'jugado';
  const ambos = p.equipo_local_id && p.equipo_visitante_id;

  return (
    <div className={`rounded-xl border p-3 ${jugado ? 'border-pitch/40 bg-pitch/5' : 'border-line bg-surface-900'}`}>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right text-sm font-medium text-ink truncate">{nombreEq(equiposById, p.equipo_local_id)}</span>
        <input type="number" min="0" value={gl} onChange={(e) => setGl(e.target.value)} disabled={!ambos}
          className="w-12 text-center input !py-1.5 !px-1" placeholder="-" />
        <span className="text-surface-500 text-xs">vs</span>
        <input type="number" min="0" value={gv} onChange={(e) => setGv(e.target.value)} disabled={!ambos}
          className="w-12 text-center input !py-1.5 !px-1" placeholder="-" />
        <span className="flex-1 text-sm font-medium text-ink truncate">{nombreEq(equiposById, p.equipo_visitante_id)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input !py-1.5 text-xs flex-1 min-w-[120px]" />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input !py-1.5 text-xs w-[105px]" />
        <select value={cancha} onChange={(e) => setCancha(e.target.value)} className="input !py-1.5 text-xs flex-1 min-w-[120px]">
          <option value="">Cancha…</option>
          {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={guardar} disabled={saving || !ambos} className="btn-primary btn-sm">
          {saving ? <MSym name="progress_activity" className="text-[16px] animate-spin" /> : <><MSym name="save" className="text-[16px]" /> Guardar</>}
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'equipos',    label: 'Equipos',    icon: 'groups' },
  { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
  { id: 'tabla',      label: 'Posiciones', icon: 'leaderboard' },
  { id: 'goleadores', label: 'Goleadores', icon: 'sports_soccer' },
];

export default function TorneoDetalleAdmin() {
  const { id } = useParams();
  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [tab, setTab] = useState('equipos');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [t, eq, pa, go] = await Promise.all([getTorneo(id), getEquipos(id), getPartidos(id), getGoleadores(id)]);
      setTorneo(t); setEquipos(eq); setPartidos(pa); setGoleadores(go);
    } catch (e) { toastError('Error: ' + e.message); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    cargar();
    supabase.from('canchas').select('id, nombre').eq('activa', true).then(({ data }) => setCanchas(data || []));
    const canal = supabase
      .channel(`rt_torneo_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `torneo_id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos_torneo', filter: `torneo_id=eq.${id}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [id, cargar]);

  const equiposById = useMemo(() => Object.fromEntries(equipos.map((e) => [e.id, e])), [equipos]);
  const aprobados = useMemo(() => equipos.filter((e) => e.estado === 'aprobado'), [equipos]);
  const posiciones = useMemo(() => calcularPosiciones(aprobados, partidos), [aprobados, partidos]);
  const esLlave = torneo && (torneo.tipo === 'eliminacion' || torneo.tipo === 'relampago');

  // Tabs visibles según tipo
  const tabsVisibles = TABS.filter((t) => (t.id === 'tabla' ? !esLlave : true))
    .concat(esLlave ? [{ id: 'llave', label: 'Llave', icon: 'account_tree' }] : []);

  // ── Acciones equipos ──
  const setEstadoEquipo = async (eq, estado) => {
    try { await actualizarEquipo(eq.id, { estado }); cargar(); } catch (e) { toastError(e.message); }
  };
  const setGrupo = async (eq, grupo) => {
    try { await actualizarEquipo(eq.id, { grupo: grupo || null }); } catch (e) { toastError(e.message); }
  };
  const togglePagado = async (eq) => {
    try { await actualizarEquipo(eq.id, { pagado: !eq.pagado }); cargar(); } catch (e) { toastError(e.message); }
  };
  const borrarEquipo = async (eq) => {
    if (!window.confirm(`¿Eliminar a ${eq.nombre}?`)) return;
    try { await eliminarEquipo(eq.id); cargar(); } catch (e) { toastError(e.message); }
  };
  const renombrarEquipo = async (eq) => {
    const nombre = window.prompt('Nuevo nombre del equipo:', eq.nombre);
    if (!nombre || nombre.trim() === eq.nombre) return;
    try { await actualizarEquipo(eq.id, { nombre: nombre.trim() }); cargar(); } catch (e) { toastError(e.message); }
  };
  const agregarEquipoManual = async () => {
    const nombre = window.prompt('Nombre del equipo:');
    if (!nombre) return;
    try {
      await supabase.from('equipos_torneo').insert([{ torneo_id: id, nombre, estado: 'aprobado' }]);
      cargar();
    } catch (e) { toastError(e.message); }
  };
  const hacerCampeon = async (eq) => {
    if (!window.confirm(`¿Marcar a ${eq.nombre} como campeón y finalizar el torneo?`)) return;
    try { await definirCampeon(id, eq.id); toastExito('🏆 ¡Campeón definido!'); cargar(); } catch (e) { toastError(e.message); }
  };

  // ── Fixture ──
  const handleGenerar = async () => {
    if (partidos.length > 0 && !window.confirm('Ya hay un fixture. ¿Regenerarlo? Se borran los resultados cargados.')) return;
    setGenerando(true);
    try {
      const n = await generarFixture(torneo, equipos);
      toastExito(`Fixture generado: ${n} partidos`);
      setTab('calendario');
      cargar();
    } catch (e) { toastError(e.message); }
    setGenerando(false);
  };

  const handleResultado = async (p, datos) => {
    try { await cargarResultado(torneo, p, datos); toastExito('Resultado guardado'); cargar(); }
    catch (e) { toastError(e.message); }
  };

  const descargarPdf = async () => {
    try {
      const canchasById = Object.fromEntries(canchas.map((c) => [c.id, c.nombre]));
      await generarPdfTorneo({ torneo, partidos, goleadores, posiciones, equiposById, esLlave, canchasById, campeon: torneo.campeon_equipo_id ? equiposById[torneo.campeon_equipo_id] : null });
    } catch (e) { toastError('No se pudo generar el PDF: ' + e.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><MSym name="progress_activity" className="text-[32px] text-cat-violet animate-spin" /></div>;
  if (!torneo) return <div className="card p-10 text-center text-surface-400">Torneo no encontrado.</div>;

  const campeon = torneo.campeon_equipo_id ? equiposById[torneo.campeon_equipo_id] : null;
  const partidosPorRonda = partidos.reduce((acc, p) => { (acc[p.ronda] ||= []).push(p); return acc; }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link to="/admin/torneos" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-ink mb-3">
          <MSym name="arrow_back" className="text-[18px]" /> Volver a torneos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="display-title text-3xl text-ink">{torneo.nombre}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="badge bg-cat-violet/15 text-cat-violet capitalize">{torneo.tipo}</span>
              {torneo.categoria && <span className="badge-gray">{torneo.categoria}</span>}
              <span className="badge bg-pitch/15 text-pitch">{aprobados.length} equipos</span>
              {torneo.premio && <span className="badge bg-gold/15 text-gold"><MSym name="trophy" className="text-[13px]" /> {torneo.premio}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={descargarPdf} disabled={partidos.length === 0} className="btn-secondary">
              <MSym name="picture_as_pdf" className="text-[18px]" /> PDF
            </button>
            <button onClick={handleGenerar} disabled={generando || aprobados.length < 2} className="btn-primary">
              {generando ? <MSym name="progress_activity" className="text-[18px] animate-spin" /> : <><MSym name="auto_awesome" className="text-[18px]" /> {partidos.length ? 'Regenerar' : 'Generar'} fixture</>}
            </button>
          </div>
        </div>
        {campeon && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4">
            <MSym name="trophy" className="text-gold text-[28px]" fill />
            <div><p className="text-xs text-surface-300">Campeón</p><p className="font-display text-2xl text-gold">{campeon.nombre}</p></div>
          </div>
        )}
      </div>

      {/* Guía de pasos (sutil y descartable) */}
      <AyudaBox id="torneo_detalle" titulo="Cómo armar este torneo (3 pasos)" icon="checklist">
        <ol className="space-y-1.5 list-none">
          <li className="flex gap-2"><span className="font-display text-brand-600">1.</span><span className="flex-1">En <b className="text-ink">Equipos</b>: aprobá los equipos inscritos (✓). Podés agregar equipos a mano.</span></li>
          <li className="flex gap-2"><span className="font-display text-brand-600">2.</span><span className="flex-1">Tocá <b className="text-ink">Generar fixture</b> (arriba a la derecha): se arman los partidos solos.</span></li>
          <li className="flex gap-2"><span className="font-display text-brand-600">3.</span><span className="flex-1">En <b className="text-ink">Calendario</b>: cargá los resultados. La <b className="text-ink">tabla</b> y las <b className="text-ink">llaves</b> se actualizan solas.</span></li>
        </ol>
      </AyudaBox>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 rounded-xl p-1 overflow-x-auto">
        {tabsVisibles.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === t.id ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white'}`}>
            <MSym name={t.icon} className="text-[18px]" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── EQUIPOS ── */}
      {tab === 'equipos' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-400">{equipos.length} equipo(s) · {aprobados.length} aprobado(s)</p>
            <button onClick={agregarEquipoManual} className="btn-secondary btn-sm"><MSym name="add" className="text-[16px]" /> Agregar equipo</button>
          </div>
          {equipos.length === 0 ? (
            <div className="card p-10 text-center text-surface-400 border-2 border-dashed border-line">Aún no hay equipos inscritos.</div>
          ) : equipos.map((eq) => (
            <div key={eq.id} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                {eq.logo_url ? <img src={eq.logo_url} alt="" className="w-full h-full object-cover" /> : <MSym name="shield" className="text-surface-500 text-[22px]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink truncate">{eq.nombre}</p>
                <span className={`text-xs ${eq.estado === 'aprobado' ? 'text-pitch' : eq.estado === 'rechazado' ? 'text-red-700' : 'text-gold'}`}>{eq.estado}</span>
                {torneo.costo_inscripcion > 0 && <span className={`text-xs ml-2 ${eq.pagado ? 'text-pitch' : 'text-surface-500'}`}>· {eq.pagado ? 'pagó' : 'sin pagar'}</span>}
              </div>
              {torneo.tipo === 'grupos' && (
                <input defaultValue={eq.grupo || ''} onBlur={(e) => setGrupo(eq, e.target.value.toUpperCase())} maxLength={2}
                  className="input !py-1.5 w-14 text-center text-sm" placeholder="Gr" title="Grupo" />
              )}
              <div className="flex items-center gap-1.5">
                <button onClick={() => renombrarEquipo(eq)} className="p-2 rounded-lg bg-surface-850 text-surface-300 hover:bg-surface-700" title="Editar nombre"><MSym name="edit" className="text-[18px]" /></button>
                {eq.estado !== 'aprobado' && <button onClick={() => setEstadoEquipo(eq, 'aprobado')} className="p-2 rounded-lg bg-pitch/15 text-pitch hover:bg-pitch/25" title="Aprobar"><MSym name="check" className="text-[18px]" /></button>}
                {eq.estado !== 'rechazado' && <button onClick={() => setEstadoEquipo(eq, 'rechazado')} className="p-2 rounded-lg bg-surface-850 text-surface-400 hover:bg-surface-700" title="Rechazar"><MSym name="block" className="text-[18px]" /></button>}
                {torneo.costo_inscripcion > 0 && <button onClick={() => togglePagado(eq)} className="p-2 rounded-lg bg-surface-850 text-surface-300 hover:bg-surface-700" title="Marcar pago"><MSym name="payments" className="text-[18px]" /></button>}
                <button onClick={() => hacerCampeon(eq)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20" title="Marcar campeón"><MSym name="trophy" className="text-[18px]" /></button>
                <button onClick={() => borrarEquipo(eq)} className="p-2 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20" title="Eliminar"><MSym name="delete" className="text-[18px]" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CALENDARIO / FIXTURE ── */}
      {tab === 'calendario' && (
        partidos.length === 0 ? (
          <div className="card p-10 text-center text-surface-400 border-2 border-dashed border-line">
            Todavía no hay fixture. Aprobá al menos 2 equipos y tocá <b className="text-ink">Generar fixture</b>.
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(partidosPorRonda).map(([ronda, lista]) => (
              <div key={ronda}>
                <h3 className="display-title text-lg text-ink mb-2">
                  {esLlave ? (FASE_LABEL[lista[0].fase] || `Ronda ${ronda}`) : `Jornada ${ronda}`}
                </h3>
                <div className="space-y-2">
                  {lista.map((p) => <PartidoFila key={p.id} p={p} equiposById={equiposById} canchas={canchas} onGuardar={handleResultado} />)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── POSICIONES ── */}
      {tab === 'tabla' && <TablaPosiciones posiciones={posiciones} />}

      {/* ── LLAVE ── */}
      {tab === 'llave' && (
        <div className="space-y-5">
          {partidos.length === 0 ? (
            <div className="card p-10 text-center text-surface-400 border-2 border-dashed border-line">Generá el fixture para ver la llave.</div>
          ) : Object.entries(partidosPorRonda).map(([ronda, lista]) => (
            <div key={ronda}>
              <h3 className="display-title text-lg text-ink mb-2">{FASE_LABEL[lista[0].fase] || `Ronda ${ronda}`}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {lista.map((p) => (
                  <div key={p.id} className="card p-3 flex items-center justify-between text-sm">
                    <span className={`flex-1 truncate ${p.estado === 'jugado' && p.goles_local > p.goles_visitante ? 'text-ink font-bold' : 'text-surface-300'}`}>{nombreEq(equiposById, p.equipo_local_id)}</span>
                    <span className="px-3 font-display text-lg text-ink">{p.goles_local ?? '-'}:{p.goles_visitante ?? '-'}</span>
                    <span className={`flex-1 truncate text-right ${p.estado === 'jugado' && p.goles_visitante > p.goles_local ? 'text-ink font-bold' : 'text-surface-300'}`}>{nombreEq(equiposById, p.equipo_visitante_id)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GOLEADORES ── */}
      {tab === 'goleadores' && (
        <GoleadoresAdmin torneoId={id} equipos={aprobados} goleadores={goleadores} onReload={cargar} />
      )}
    </div>
  );
}

// ── Tabla de posiciones (admin) ─────────────────────────────────────────────
function TablaPosiciones({ posiciones }) {
  if (posiciones.length === 0) return <div className="card p-10 text-center text-surface-400">Aprobá equipos y cargá resultados para ver la tabla.</div>;
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-950/50 text-surface-400">
          <tr>
            <th className="text-left px-4 py-3">#</th><th className="text-left px-2 py-3">Equipo</th>
            <th className="px-2 py-3">PJ</th><th className="px-2 py-3">G</th><th className="px-2 py-3">E</th><th className="px-2 py-3">P</th>
            <th className="px-2 py-3">GF</th><th className="px-2 py-3">GC</th><th className="px-2 py-3">DG</th><th className="px-3 py-3">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {posiciones.map((r, i) => (
            <tr key={r.equipo.id} className="text-center hover:bg-surface-850">
              <td className="px-4 py-2.5 text-left"><span className={`font-display ${i === 0 ? 'text-gold' : 'text-surface-400'}`}>{i + 1}</span></td>
              <td className="px-2 py-2.5 text-left font-medium text-ink truncate max-w-[140px]">{r.equipo.nombre}</td>
              <td className="px-2 text-surface-300">{r.pj}</td><td className="px-2 text-surface-300">{r.pg}</td>
              <td className="px-2 text-surface-300">{r.pe}</td><td className="px-2 text-surface-300">{r.pp}</td>
              <td className="px-2 text-surface-300">{r.gf}</td><td className="px-2 text-surface-300">{r.gc}</td>
              <td className="px-2 text-surface-300">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
              <td className="px-3 font-display text-lg text-ink">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Goleadores (admin CRUD) ─────────────────────────────────────────────────
function GoleadoresAdmin({ torneoId, equipos, goleadores, onReload }) {
  const [nombre, setNombre] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [goles, setGoles] = useState('');

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre) return;
    try {
      await guardarGoleador({ torneo_id: torneoId, equipo_id: equipoId || null, nombre, goles: goles || 0 });
      setNombre(''); setEquipoId(''); setGoles(''); onReload();
    } catch (err) { toastError(err.message); }
  };
  const sumar = async (g, delta) => {
    try { await guardarGoleador({ id: g.id, torneo_id: torneoId, equipo_id: g.equipo_id, nombre: g.nombre, goles: Math.max(0, g.goles + delta) }); onReload(); }
    catch (err) { toastError(err.message); }
  };
  const borrar = async (g) => { try { await eliminarGoleador(g.id); onReload(); } catch (err) { toastError(err.message); } };

  return (
    <div className="space-y-4">
      <form onSubmit={agregar} className="card p-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]"><label className="label">Jugador</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></div>
        <div className="flex-1 min-w-[120px]"><label className="label">Equipo</label>
          <select className="input" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
            <option value="">—</option>{equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select></div>
        <div className="w-20"><label className="label">Goles</label>
          <input type="number" min="0" className="input" value={goles} onChange={(e) => setGoles(e.target.value)} /></div>
        <button className="btn-primary"><MSym name="add" className="text-[18px]" /></button>
      </form>

      {goleadores.length === 0 ? (
        <div className="card p-8 text-center text-surface-400">Sin goleadores cargados.</div>
      ) : goleadores.map((g, i) => (
        <div key={g.id} className="card p-3 flex items-center gap-3">
          <span className={`font-display text-xl w-7 text-center ${i === 0 ? 'text-gold' : 'text-surface-500'}`}>{i + 1}</span>
          <div className="flex-1 min-w-0"><p className="font-semibold text-ink truncate">{g.nombre}</p><p className="text-xs text-surface-400">{g.equipo?.nombre || 'Sin equipo'}</p></div>
          <button onClick={() => sumar(g, -1)} className="p-1.5 rounded-lg bg-surface-850 text-surface-300"><MSym name="remove" className="text-[18px]" /></button>
          <span className="font-display text-2xl text-pitch w-9 text-center">{g.goles}</span>
          <button onClick={() => sumar(g, 1)} className="p-1.5 rounded-lg bg-surface-850 text-surface-300"><MSym name="add" className="text-[18px]" /></button>
          <button onClick={() => borrar(g)} className="p-1.5 rounded-lg bg-red-500/10 text-red-700"><MSym name="delete" className="text-[18px]" /></button>
        </div>
      ))}
    </div>
  );
}
