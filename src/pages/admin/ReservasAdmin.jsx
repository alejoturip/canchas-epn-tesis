import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, XCircle, Calendar, Clock, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import { FEATURES } from '../../config/features';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { toastExito, toastError } from '../../lib/notify';

const MENSAJE_ESTADO = {
  confirmada: 'Reserva confirmada — ya tiene su QR de acceso',
  cancelada:  'Reserva cancelada',
  completada: 'Reserva marcada como jugada 🏆',
  ausente:    'Registrada como ausencia',
};

const BADGE = {
  pendiente:  'badge-amber',
  confirmada: 'badge-green',
  completada: 'badge-brand',
  ausente:    'badge-amber',
  cancelada:  'badge-red',
};

export default function ReservasAdmin() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarReservas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reservas')
      .select('*, perfiles(nombre, email), canchas(nombre)')
      .order('fecha', { ascending: false });
    if (!error && data) setReservas(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarReservas();
    // 🔴 Realtime: refrescar automáticamente ante cualquier cambio en reservas
    const canal = supabase
      .channel(`rt_reservas_admin_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => cargarReservas())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cambiarEstado = async (id, nuevoEstado) => {
    if (!window.confirm(`¿Cambiar reserva a "${nuevoEstado}"?`)) return;
    const { error } = await supabase.from('reservas').update({ estado: nuevoEstado }).eq('id', id);
    if (error) toastError('No se pudo actualizar: ' + error.message);
    else toastExito(MENSAJE_ESTADO[nuevoEstado] || 'Reserva actualizada');
    cargarReservas();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="section-title">Gestión de Reservas</h2>
        <p className="text-surface-400 text-sm">Confirmá, cancelá y hacé seguimiento de las reservas de los estudiantes.</p>
      </div>

      <AyudaBox id="reservas" titulo="¿Cómo manejar las reservas?" icon="event_available">
        <ul className="space-y-1.5">
          {FEATURES.PAGOS ? (
            <li className="flex gap-2"><MSym name="payments" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Las reservas se <b className="text-ink">confirman solas</b> al aprobar el pago en <b className="text-ink">Pagos</b> (no hay botón "confirmar" acá).</span></li>
          ) : (
            <li className="flex gap-2"><MSym name="task_alt" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Confirmar</b> y se genera el <b className="text-ink">QR de acceso</b> del estudiante al instante (le llega el aviso).</span></li>
          )}
          <li className="flex gap-2"><MSym name="sports_soccer" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Cuando el estudiante jugó, marcala como <b className="text-ink">jugada</b> (suma a su fidelidad).</span></li>
          <li className="flex gap-2"><MSym name="cancel" className="text-red-700 text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Cancelar</b> libera el horario para que otro pueda reservarlo.</span></li>
          <li className="flex gap-2"><MSym name="person_off" className="text-amber-700 text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Si no se presentó, <b className="text-ink">No asistió</b>. A las 3 ausencias el sistema le suspende las reservas 15 días.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : reservas.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">No hay reservas aún.</div>
      ) : (
        <>
          {/* ── Tabla (md+) ── */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-surface-300">
                <thead className="text-xs uppercase bg-surface-950/50 text-surface-400 border-b border-line">
                  <tr>
                    <th className="px-6 py-4">Estudiante</th>
                    <th className="px-6 py-4">Cancha</th>
                    <th className="px-6 py-4">Fecha y Hora</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {reservas.map((res) => (
                    <tr key={res.id} className="hover:bg-surface-850 transition group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-ink">{res.perfiles?.nombre}</p>
                        <p className="text-xs text-surface-500">{res.perfiles?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">{res.canchas?.nombre}</td>
                      <td className="px-6 py-4">
                        <p className="text-ink">{res.fecha}</p>
                        <p className="text-xs text-surface-400">{res.hora_inicio?.substring(0,5)} - {res.hora_fin?.substring(0,5)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`uppercase tracking-wider ${BADGE[res.estado] || 'badge-gray'}`}>{res.estado}</span>
                      </td>
                      <td className="px-6 py-4">
                        <AccionesBotones res={res} onCambiar={cambiarEstado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Cards (mobile) ── */}
          <div className="md:hidden space-y-3">
            {reservas.map((res) => (
              <div key={res.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                      {res.perfiles?.nombre?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-ink text-sm">{res.perfiles?.nombre}</p>
                      <p className="text-xs text-surface-500">{res.perfiles?.email}</p>
                    </div>
                  </div>
                  <span className={`uppercase tracking-wider flex-shrink-0 ${BADGE[res.estado] || 'badge-gray'}`}>{res.estado}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-surface-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-surface-200">{res.canchas?.nombre}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-surface-200">{res.fecha}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-surface-200">{res.hora_inicio?.substring(0,5)} — {res.hora_fin?.substring(0,5)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <AccionesBotones res={res} onCambiar={cambiarEstado} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AccionesBotones({ res, onCambiar }) {
  // Con PAGOS prendido la confirmación es automática (ocurre al aprobar el pago).
  // Con PAGOS apagado la confirma el admin acá, y el trigger genera el QR.
  if (res.estado === 'pendiente') return (
    <>
      {FEATURES.PAGOS ? (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 rounded-lg text-xs font-medium" title="Se confirmará automáticamente al aprobar su pago">
          <CreditCard className="w-4 h-4" /> Esperando pago
        </span>
      ) : (
        <button onClick={() => onCambiar(res.id, 'confirmada')} title="Confirma la reserva y genera su QR de acceso"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch/10 text-pitch hover:bg-pitch/20 rounded-lg transition text-xs font-medium">
          <CheckCircle2 className="w-4 h-4" /> Confirmar
        </button>
      )}
      <button onClick={() => onCambiar(res.id, 'cancelada')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 rounded-lg transition text-xs font-medium">
        <XCircle className="w-4 h-4" /> Cancelar
      </button>
    </>
  );
  if (res.estado === 'confirmada') return (
    <>
      {/* La ausencia también se detecta sola (barrido de fn_marcar_ausencias),
          pero el encargado puede registrarla en el momento. */}
      <button onClick={() => onCambiar(res.id, 'ausente')} title="El estudiante no se presentó"
        className="px-3 py-1.5 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg transition text-xs font-medium">
        No asistió
      </button>
      <button onClick={() => onCambiar(res.id, 'completada')}
        className="px-3 py-1.5 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 rounded-lg transition text-xs font-medium">
        ✓ Marcar jugada
      </button>
    </>
  );
  return null;
}
