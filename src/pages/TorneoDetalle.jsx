import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MSym from '../components/MSym';
import { calcularPosiciones, FASE_LABEL, TIPOS_TORNEO } from '../utils/torneos';
import { getTorneo, getEquipos, getPartidos, getGoleadores, inscribirEquipo } from '../services/torneosService';
import { generarPdfTorneo } from '../utils/torneoPdf';
import { PAGO_CONFIG } from '../config/pago';
import { toastExito, toastError } from '../lib/notify';

const nombreEq = (map, id) => (id ? (map[id]?.nombre || 'Equipo') : 'Por definir');
const tipoLabel = (v) => TIPOS_TORNEO.find((t) => t.value === v)?.label || v;

export default function TorneoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [torneo, setTorneo] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tabla');
  const [showInscribir, setShowInscribir] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [t, eq, pa, go] = await Promise.all([getTorneo(id), getEquipos(id), getPartidos(id), getGoleadores(id)]);
      setTorneo(t); setEquipos(eq); setPartidos(pa); setGoleadores(go);
    } catch (e) { toastError('Error: ' + e.message); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    cargar();
    supabase.from('canchas').select('id, nombre').then(({ data }) => setCanchas(data || []));
    const canal = supabase
      .channel(`rt_torneo_cli_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `torneo_id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos_torneo', filter: `torneo_id=eq.${id}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [id, cargar]);

  const equiposById = useMemo(() => Object.fromEntries(equipos.map((e) => [e.id, e])), [equipos]);
  const canchasById = useMemo(() => Object.fromEntries(canchas.map((c) => [c.id, c.nombre])), [canchas]);
  const aprobados = useMemo(() => equipos.filter((e) => e.estado === 'aprobado'), [equipos]);
  const posiciones = useMemo(() => calcularPosiciones(aprobados, partidos), [aprobados, partidos]);
  const esLlave = torneo && (torneo.tipo === 'eliminacion' || torneo.tipo === 'relampago');
  const miEquipo = useMemo(() => (user ? equipos.find((e) => e.capitan_id === user.id) : null), [equipos, user]);

  const descargarPdf = async () => {
    try {
      await generarPdfTorneo({
        torneo, partidos, goleadores, posiciones, equiposById, esLlave, canchasById,
        campeon: torneo.campeon_equipo_id ? equiposById[torneo.campeon_equipo_id] : null,
      });
    } catch (e) { toastError('No se pudo generar el PDF: ' + e.message); }
  };

  if (loading) return <div className="flex justify-center py-24"><MSym name="progress_activity" className="text-[32px] text-cat-violet animate-spin" /></div>;
  if (!torneo) return <div className="p-8 max-w-3xl mx-auto"><div className="card p-10 text-center text-surface-400">Torneo no encontrado. <Link to="/torneos" className="text-brand-600">Volver</Link></div></div>;

  const campeon = torneo.campeon_equipo_id ? equiposById[torneo.campeon_equipo_id] : null;
  const partidosPorRonda = partidos.reduce((acc, p) => { (acc[p.ronda] ||= []).push(p); return acc; }, {});
  const tabs = [
    !esLlave && { id: 'tabla', label: 'Posiciones', icon: 'leaderboard' },
    esLlave && { id: 'llave', label: 'Llave', icon: 'account_tree' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
    { id: 'goleadores', label: 'Goleadores', icon: 'sports_soccer' },
    { id: 'equipos', label: 'Equipos', icon: 'groups' },
  ].filter(Boolean);
  // Si el tab actual no aplica a este tipo de torneo, usamos el primero disponible
  const tabActivo = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/torneos" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-ink">
          <MSym name="arrow_back" className="text-[18px]" /> Todos los torneos
        </Link>
        {partidos.length > 0 && (
          <button onClick={descargarPdf} className="btn-secondary btn-sm">
            <MSym name="picture_as_pdf" className="text-[18px]" /> Descargar PDF
          </button>
        )}
      </div>

      {/* Cabecera */}
      <div className="relative overflow-hidden rounded-3xl border border-line p-6 md:p-8"
        style={{ background: 'linear-gradient(120deg, rgba(183,140,255,.12), rgba(218,31,38,.08))' }}>
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="badge bg-cat-violet/15 text-cat-violet">{tipoLabel(torneo.tipo)}</span>
          {torneo.categoria && <span className="badge-gray">{torneo.categoria}</span>}
          <span className="badge bg-pitch/15 text-pitch">{aprobados.length} equipos</span>
        </div>
        <h1 className="display-title text-4xl text-ink">{torneo.nombre}</h1>
        {torneo.descripcion && <p className="text-surface-300 mt-2 max-w-2xl">{torneo.descripcion}</p>}

        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {torneo.fecha_inicio && <span className="flex items-center gap-1.5 text-surface-300"><MSym name="event" className="text-cat-violet text-[18px]" /> {new Date(torneo.fecha_inicio).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          {torneo.premio && <span className="flex items-center gap-1.5 text-gold"><MSym name="trophy" className="text-[18px]" /> {torneo.premio}</span>}
          {torneo.costo_inscripcion > 0 && <span className="flex items-center gap-1.5 text-pitch"><MSym name="payments" className="text-[18px]" /> Inscripción ${torneo.costo_inscripcion}</span>}
        </div>

        {campeon && (
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
            <MSym name="trophy" className="text-gold text-[26px]" fill />
            <div><p className="text-xs text-surface-300">Campeón</p><p className="font-display text-2xl text-gold">{campeon.nombre}</p></div>
          </div>
        )}

        {/* Inscripción */}
        {torneo.estado === 'abierto' && (
          <div className="mt-5">
            {miEquipo ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-pitch/10 border border-pitch/40 px-4 py-2.5 text-pitch text-sm font-medium">
                <MSym name="check_circle" className="text-[18px]" /> Tu equipo "{miEquipo.nombre}" está {miEquipo.estado}
              </div>
            ) : user ? (
              <button onClick={() => setShowInscribir(true)} className="btn-primary btn-lg">
                <MSym name="group_add" className="text-[20px]" /> Inscribir mi equipo
              </button>
            ) : (
              <Link to="/login" className="btn-primary btn-lg"><MSym name="login" className="text-[20px]" /> Iniciá sesión para inscribirte</Link>
            )}
          </div>
        )}
      </div>

      {torneo.reglas && (
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold text-ink flex items-center gap-2"><MSym name="gavel" className="text-[20px] text-surface-400" /> Reglas del torneo</summary>
          <p className="text-surface-300 text-sm mt-3 whitespace-pre-line">{torneo.reglas}</p>
        </details>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tabActivo === t.id ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white'}`}>
            <MSym name={t.icon} className="text-[18px]" /> {t.label}
          </button>
        ))}
      </div>

      {/* Posiciones */}
      {tabActivo === 'tabla' && (
        posiciones.length === 0 ? <Vacio texto="La tabla aparece cuando se carguen los primeros resultados." /> :
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-950/50 text-surface-400">
              <tr><th className="text-left px-4 py-3">#</th><th className="text-left px-2 py-3">Equipo</th>
                <th className="px-2 py-3">PJ</th><th className="px-2 py-3">DG</th><th className="px-3 py-3">Pts</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {posiciones.map((r, i) => (
                <tr key={r.equipo.id} className="text-center hover:bg-surface-850">
                  <td className="px-4 py-3 text-left"><span className={`font-display ${i === 0 ? 'text-gold' : 'text-surface-400'}`}>{i + 1}</span></td>
                  <td className="px-2 py-3 text-left font-medium text-ink">{r.equipo.nombre}</td>
                  <td className="px-2 text-surface-300">{r.pj}</td>
                  <td className="px-2 text-surface-300">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                  <td className="px-3 font-display text-lg text-ink">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-surface-500 px-4 py-2">PJ jugados · DG dif. de gol · Pts puntos</p>
        </div>
      )}

      {/* Llave */}
      {tabActivo === 'llave' && (
        partidos.length === 0 ? <Vacio texto="La llave aparece cuando el organizador genere el cuadro." /> :
        <div className="space-y-5">
          {Object.entries(partidosPorRonda).map(([ronda, lista]) => (
            <div key={ronda}>
              <h3 className="display-title text-lg text-ink mb-2">{FASE_LABEL[lista[0].fase] || `Ronda ${ronda}`}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {lista.map((p) => <PartidoLlave key={p.id} p={p} equiposById={equiposById} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendario */}
      {tabActivo === 'calendario' && (
        partidos.length === 0 ? <Vacio texto="Todavía no hay partidos programados." /> :
        <div className="space-y-5">
          {Object.entries(partidosPorRonda).map(([ronda, lista]) => (
            <div key={ronda}>
              <h3 className="display-title text-lg text-ink mb-2">{esLlave ? (FASE_LABEL[lista[0].fase] || `Ronda ${ronda}`) : `Jornada ${ronda}`}</h3>
              <div className="space-y-2">
                {lista.map((p) => <PartidoCalendario key={p.id} p={p} equiposById={equiposById} canchasById={canchasById} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goleadores */}
      {tabActivo === 'goleadores' && (
        goleadores.length === 0 ? <Vacio texto="Sin goleadores cargados todavía." /> :
        <div className="space-y-2">
          {goleadores.map((g, i) => (
            <div key={g.id} className="card p-3 flex items-center gap-3">
              <span className={`font-display text-xl w-7 text-center ${i === 0 ? 'text-gold' : 'text-surface-500'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0"><p className="font-semibold text-ink truncate">{g.nombre}</p><p className="text-xs text-surface-400">{g.equipo?.nombre || ''}</p></div>
              <span className="font-display text-2xl text-pitch">{g.goles}</span>
              <MSym name="sports_soccer" className="text-surface-500 text-[18px]" />
            </div>
          ))}
        </div>
      )}

      {/* Equipos */}
      {tabActivo === 'equipos' && (
        aprobados.length === 0 ? <Vacio texto="Aún no hay equipos confirmados." /> :
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {aprobados.map((eq) => (
            <div key={eq.id} className="card p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-surface-900 flex items-center justify-center overflow-hidden">
                {eq.logo_url ? <img src={eq.logo_url} alt="" className="w-full h-full object-cover" /> : <MSym name="shield" className="text-surface-500 text-[26px]" />}
              </div>
              <p className="font-medium text-ink text-sm truncate w-full">{eq.nombre}</p>
              {eq.grupo && <span className="badge-gray">Grupo {eq.grupo}</span>}
            </div>
          ))}
        </div>
      )}

      {showInscribir && (
        <ModalInscribir torneo={torneo} userId={user.id} onClose={() => setShowInscribir(false)} onOk={() => { setShowInscribir(false); cargar(); }} />
      )}
    </div>
  );
}

function Vacio({ texto }) {
  return <div className="card p-10 text-center text-surface-400 border-2 border-dashed border-line">{texto}</div>;
}

function PartidoLlave({ p, equiposById }) {
  const lGana = p.estado === 'jugado' && p.goles_local > p.goles_visitante;
  const vGana = p.estado === 'jugado' && p.goles_visitante > p.goles_local;
  return (
    <div className="card p-3 flex items-center justify-between text-sm">
      <span className={`flex-1 truncate ${lGana ? 'text-ink font-bold' : 'text-surface-300'}`}>{nombreEq(equiposById, p.equipo_local_id)}</span>
      <span className="px-3 font-display text-lg text-ink">{p.goles_local ?? '-'}:{p.goles_visitante ?? '-'}</span>
      <span className={`flex-1 truncate text-right ${vGana ? 'text-ink font-bold' : 'text-surface-300'}`}>{nombreEq(equiposById, p.equipo_visitante_id)}</span>
    </div>
  );
}

function PartidoCalendario({ p, equiposById, canchasById }) {
  const jugado = p.estado === 'jugado';
  return (
    <div className={`card p-3 ${jugado ? 'border-pitch/40' : ''}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1 text-right font-medium text-ink truncate">{nombreEq(equiposById, p.equipo_local_id)}</span>
        <span className="px-3 font-display text-lg text-ink">{jugado ? `${p.goles_local}:${p.goles_visitante}` : 'vs'}</span>
        <span className="flex-1 font-medium text-ink truncate">{nombreEq(equiposById, p.equipo_visitante_id)}</span>
      </div>
      {(p.fecha || p.cancha_id) && (
        <div className="flex items-center justify-center gap-3 mt-1.5 text-[11px] text-surface-500">
          {p.fecha && <span className="flex items-center gap-1"><MSym name="event" className="text-[14px]" /> {new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}{p.hora ? ` · ${p.hora.slice(0, 5)}` : ''}</span>}
          {p.cancha_id && canchasById[p.cancha_id] && <span className="flex items-center gap-1"><MSym name="stadium" className="text-[14px]" /> {canchasById[p.cancha_id]}</span>}
        </div>
      )}
    </div>
  );
}

// ── Modal inscribir equipo ──────────────────────────────────────────────────
function ModalInscribir({ torneo, userId, onClose, onOk }) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [inscrito, setInscrito] = useState(false);

  const inscribir = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await inscribirEquipo({ torneo_id: torneo.id, nombre, capitan_id: userId });
      if (torneo.costo_inscripcion > 0) { setInscrito(true); toastExito('¡Equipo inscrito! Completá el pago.'); }
      else { toastExito('¡Equipo inscrito! El organizador lo confirmará.'); onOk(); }
    } catch (err) { toastError(err.message); }
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="text-lg font-bold text-ink">Inscribir equipo</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"><MSym name="close" className="text-[20px]" /></button>
        </div>

        {!inscrito ? (
          <form onSubmit={inscribir} className="p-5 space-y-4">
            <div>
              <label className="label">Nombre del equipo *</label>
              <input required type="text" className="input" placeholder="Ej: Los Galácticos" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            {torneo.costo_inscripcion > 0 && (
              <p className="text-xs text-surface-400 bg-surface-850 rounded-lg p-3">
                Inscripción: <b className="text-pitch">${torneo.costo_inscripcion}</b>. Después de inscribirte verás los datos de pago; el organizador confirma tu cupo al recibirlo.
              </p>
            )}
            <button type="submit" disabled={guardando} className="btn-primary w-full">
              {guardando ? <MSym name="progress_activity" className="text-[18px] animate-spin" /> : <><MSym name="group_add" className="text-[18px]" /> Inscribirme</>}
            </button>
          </form>
        ) : (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-pitch"><MSym name="check_circle" className="text-[20px]" /> ¡Equipo inscrito!</div>
            <p className="text-sm text-surface-300">Para asegurar tu cupo, pagá la inscripción de <b className="text-pitch">${torneo.costo_inscripcion}</b>:</p>
            <div className="card p-4 text-sm space-y-1">
              <p className="text-ink font-semibold">{PAGO_CONFIG.banco} — {PAGO_CONFIG.tipoCuenta}</p>
              <p className="text-surface-300">Cuenta: <b className="text-ink">{PAGO_CONFIG.numeroCuenta}</b></p>
              <p className="text-surface-300">Titular: {PAGO_CONFIG.propietario}</p>
              <p className="text-surface-300">WhatsApp comprobante: {PAGO_CONFIG.telefono}</p>
            </div>
            <button onClick={onOk} className="btn-primary w-full">Entendido</button>
          </div>
        )}
      </div>
    </div>
  );
}
