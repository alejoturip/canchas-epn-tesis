import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Headset, Loader2, CheckCircle2, Clock, Mail, RotateCcw } from 'lucide-react';
import { formatFecha } from '../../utils/formatters';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { toastExito, toastError } from '../../lib/notify';

const BADGE = {
  abierto:  'badge-amber',
  resuelto: 'badge-green',
};

export default function SoporteAdmin() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [tablaFalta, setTablaFalta] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets_soporte')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      // 42P01 = la tabla no existe todavía
      if (error.code === '42P01') setTablaFalta(true);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel(`rt_tickets_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets_soporte' }, () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cambiarEstado = async (ticket, estado) => {
    const { error } = await supabase.from('tickets_soporte').update({ estado }).eq('id', ticket.id);
    if (error) return toastError('No se pudo actualizar: ' + error.message);
    toastExito(estado === 'resuelto' ? 'Ticket marcado como resuelto ✅' : 'Ticket reabierto');
  };

  const filtrados = tickets.filter((t) => filtro === 'todos' || t.estado === filtro);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="section-title flex items-center gap-2"><Headset className="w-7 h-7 text-brand-500" /> Tickets de Soporte</h2>
        <p className="text-surface-400 text-sm">Mensajes que los estudiantes envían desde la página de Soporte.</p>
      </div>

      <AyudaBox id="soporte" titulo="¿Cómo responder soporte?" icon="support_agent">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="inbox" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Acá llegan los mensajes que los clientes mandan desde <b className="text-ink">Soporte</b> en la app.</span></li>
          <li className="flex gap-2"><MSym name="mail" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Respondé al cliente por su <b className="text-ink">correo o WhatsApp</b>, y marcá el ticket como <b className="text-ink">resuelto</b>.</span></li>
        </ul>
      </AyudaBox>

      {tablaFalta ? (
        <div className="card p-8 text-center text-surface-300 space-y-2">
          <p className="font-medium text-ink">Falta crear la tabla <code>tickets_soporte</code>.</p>
          <p className="text-sm text-surface-400">
            Ejecutá el script <code>supabase/crear_tickets_soporte.sql</code> en Supabase &gt; SQL Editor y recargá.
          </p>
        </div>
      ) : (
        <>
          {/* Filtro */}
          <div className="flex gap-2">
            {['todos', 'abierto', 'resuelto'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border capitalize
                  ${filtro === f
                    ? 'bg-brand-500/10 text-brand-600 border-brand-300'
                    : 'bg-surface-800 text-surface-300 border-line hover:text-ink'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
          ) : filtrados.length === 0 ? (
            <div className="card p-12 text-center text-surface-400">No hay tickets que coincidan.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtrados.map((t) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink truncate">{t.asunto}</p>
                      <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {t.email || 'sin email'}
                      </p>
                    </div>
                    <span className={`uppercase tracking-wider shrink-0 ${BADGE[t.estado] || 'badge-gray'}`}>{t.estado}</span>
                  </div>

                  <p className="text-sm text-surface-300 whitespace-pre-wrap border-t border-line pt-3">{t.mensaje}</p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-surface-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatFecha(t.created_at, 'short')}
                    </span>
                    {t.estado === 'abierto' ? (
                      <button onClick={() => cambiarEstado(t, 'resuelto')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-lg transition text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Marcar resuelto
                      </button>
                    ) : (
                      <button onClick={() => cambiarEstado(t, 'abierto')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-850 text-surface-300 hover:bg-surface-700 rounded-lg transition text-xs font-medium">
                        <RotateCcw className="w-4 h-4" /> Reabrir
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
