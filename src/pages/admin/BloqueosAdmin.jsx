/**
 * BloqueosAdmin.jsx — Cerrar escenarios por un período.
 *
 * Para cuando la cancha se ocupa por algo que no es una reserva: clases de
 * cultura física, mantenimiento, un campeonato o un feriado. Sin esto, el
 * encargado tenía que cancelar a mano las reservas ya hechas.
 *
 * La regla real la aplica `fn_horario_bloqueado` desde la base (ver
 * supabase/bloqueos_horarios.sql): esta pantalla solo carga los datos.
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { toastExito, toastError } from '../../lib/notify';
import { useAuth } from '../../context/AuthContext';

const hoy = () => new Date().toISOString().split('T')[0];
const FORM_INICIAL = {
  cancha_id: '', fecha_inicio: hoy(), fecha_fin: hoy(),
  todo_el_dia: true, hora_inicio: '07:00', hora_fin: '09:00', motivo: '',
};

const fmt = (f) => (f ? f.split('-').reverse().join('/') : '—');

export default function BloqueosAdmin() {
  const { user } = useAuth();
  const [bloqueos, setBloqueos] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const cargar = useCallback(async () => {
    const [{ data: blq }, { data: cnc }] = await Promise.all([
      supabase.from('bloqueos').select('*, canchas(nombre)').order('fecha_inicio', { ascending: false }),
      supabase.from('canchas').select('id, nombre').order('nombre'),
    ]);
    setBloqueos(blq || []);
    setCanchas(cnc || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    if (form.fecha_fin < form.fecha_inicio) {
      toastError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    if (!form.todo_el_dia && form.hora_fin <= form.hora_inicio) {
      toastError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('bloqueos').insert([{
      cancha_id: form.cancha_id || null,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      hora_inicio: form.todo_el_dia ? null : form.hora_inicio,
      hora_fin: form.todo_el_dia ? null : form.hora_fin,
      motivo: form.motivo,
      creado_por: user?.id || null,
    }]);
    setGuardando(false);
    if (error) { toastError('No se pudo guardar: ' + error.message); return; }
    toastExito('Bloqueo creado');
    setModal(false);
    setForm(FORM_INICIAL);
    cargar();
  };

  const eliminar = async (b) => {
    if (!window.confirm(`¿Quitar el bloqueo "${b.motivo}"?`)) return;
    const { error } = await supabase.from('bloqueos').delete().eq('id', b.id);
    if (error) toastError(error.message);
    else { toastExito('Bloqueo eliminado'); cargar(); }
  };

  const vigente = (b) => b.fecha_fin >= hoy();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bloqueos de horario</h1>
          <p className="text-surface-400 text-sm mt-1">Cerrá un escenario por mantenimiento, clases o eventos.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Nuevo bloqueo
        </button>
      </div>

      <AyudaBox id="bloqueos" titulo="¿Para qué sirve?" icon="event_busy">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="construction" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Mantenimiento:</b> elegí las fechas y dejá marcado "todo el día".</span></li>
          <li className="flex gap-2"><MSym name="school" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Clases de cultura física:</b> destildá "todo el día" y poné la franja (ej: 07:00 a 09:00) sobre todo el período.</span></li>
          <li className="flex gap-2"><MSym name="public" className="text-gold text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Si no elegís escenario, el bloqueo aplica a <b className="text-ink">todos</b>.</span></li>
          <li className="flex gap-2"><MSym name="warning" className="text-amber-700 text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Ojo: <b className="text-ink">no cancela las reservas que ya existían</b> en ese horario. Revisalas en Reservas.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : bloqueos.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
          No hay bloqueos cargados. Los escenarios se pueden reservar en todo su horario.
        </div>
      ) : (
        <div className="space-y-3">
          {bloqueos.map((b) => (
            <div key={b.id} className={`card p-4 flex flex-wrap items-center gap-3 border-l-4 ${vigente(b) ? 'border-l-amber-400' : 'border-l-surface-600 opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{b.motivo}</p>
                <p className="text-sm text-surface-400 mt-0.5">
                  {b.canchas?.nombre || 'Todos los escenarios'} · {fmt(b.fecha_inicio)}
                  {b.fecha_fin !== b.fecha_inicio && ` al ${fmt(b.fecha_fin)}`}
                  {' · '}
                  {b.hora_inicio ? `${b.hora_inicio.slice(0, 5)} a ${b.hora_fin.slice(0, 5)}` : 'todo el día'}
                </p>
              </div>
              {!vigente(b) && <span className="badge-gray">Vencido</span>}
              <button onClick={() => eliminar(b)} className="p-2 text-red-700 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-800 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-card-hover">
            <div className="flex justify-between items-center p-5 border-b border-line flex-shrink-0">
              <h2 className="text-lg font-bold text-ink">Nuevo bloqueo</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-surface-850 text-surface-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardar} id="form-bloqueo" className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="label">Escenario</label>
                <select className="input" value={form.cancha_id} onChange={(e) => setForm({ ...form, cancha_id: e.target.value })}>
                  <option value="">Todos los escenarios</option>
                  {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Desde</label>
                  <input type="date" required className="input" value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label className="label">Hasta</label>
                  <input type="date" required className="input" value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-850 border border-line cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-brand-500" checked={form.todo_el_dia}
                  onChange={(e) => setForm({ ...form, todo_el_dia: e.target.checked })} />
                <span className="text-sm font-medium text-ink">Todo el día</span>
              </label>

              {!form.todo_el_dia && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Hora inicio</label>
                    <input type="time" required className="input" value={form.hora_inicio}
                      onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Hora fin</label>
                    <input type="time" required className="input" value={form.hora_fin}
                      onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Motivo</label>
                <input type="text" required className="input" placeholder="Ej: Clases de cultura física"
                  value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                <p className="text-xs text-surface-500 mt-1.5">Se lo muestra al estudiante cuando intente reservar.</p>
              </div>
            </form>

            <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
              <button type="button" onClick={() => setModal(false)} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-bloqueo" disabled={guardando} className="flex-1 btn-primary">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear bloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
