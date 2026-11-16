import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { getAllPagos, updatePagoEstado } from '../../services/supabaseService';
import {
  Loader2, CreditCard, Search, Check, X, Eye, FileImage, CalendarDays,
} from 'lucide-react';
import { formatPrecio, formatFecha } from '../../utils/formatters';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { toastExito, toastError } from '../../lib/notify';

const BADGE = {
  pendiente: 'badge-amber',
  aprobado:  'badge-green',
  rechazado: 'badge-red',
};

export default function PagosAdmin() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [verComprobante, setVerComprobante] = useState(null);
  const [procesando, setProcesando] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data } = await getAllPagos();
    if (data) setPagos(data);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel(`rt_pagos_admin_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cambiarEstado = async (pago, estado) => {
    if (!window.confirm(`¿Marcar este pago como "${estado}"?`)) return;
    setProcesando(pago.id);
    const { error } = await updatePagoEstado(pago.id, estado);
    setProcesando(null);
    if (error) return toastError('Error: ' + error.message);
    toastExito(estado === 'aprobado' ? 'Pago aprobado · reserva confirmada ✅' : 'Pago rechazado');
  };

  const filtrados = useMemo(() => {
    return pagos.filter((p) => {
      if (estadoFiltro !== 'todos' && p.estado !== estadoFiltro) return false;
      if (desde && p.created_at < desde) return false;
      if (hasta && p.created_at > hasta + 'T23:59:59') return false;
      if (busqueda) {
        const txt = `${p.perfiles?.nombre || ''} ${p.perfiles?.email || ''} ${p.reservas?.canchas?.nombre || ''}`.toLowerCase();
        if (!txt.includes(busqueda.toLowerCase())) return false;
      }
      return true;
    });
  }, [pagos, estadoFiltro, desde, hasta, busqueda]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="section-title flex items-center gap-2"><CreditCard className="w-7 h-7 text-brand-500" /> Gestión de Pagos</h2>
        <p className="text-surface-400 text-sm">Revisa comprobantes, aprueba o rechaza pagos.</p>
      </div>

      <AyudaBox id="pagos" titulo="¿Cómo aprobar un pago?" icon="task_alt">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="visibility" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá el comprobante para verlo en grande.</span></li>
          <li className="flex gap-2"><MSym name="check" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Aprobar</b> (1 click): la reserva se <b className="text-ink">confirma sola</b>, se genera el QR de acceso y se avisa al cliente.</span></li>
          <li className="flex gap-2"><MSym name="block" className="text-red-700 text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Rechazar</b>: se libera el horario y se notifica al cliente para que reintente.</span></li>
        </ul>
      </AyudaBox>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9" placeholder="Buscar por cliente, correo o cancha…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="input" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label mb-1">Desde</label>
            <input type="date" className="input min-w-0" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label mb-1">Hasta</label>
            <input type="date" className="input min-w-0" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">No hay pagos que coincidan.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{p.perfiles?.nombre || 'Cliente'}</p>
                  <p className="text-xs text-surface-500">{p.perfiles?.email}</p>
                </div>
                <span className={`uppercase tracking-wider ${BADGE[p.estado] || 'badge-gray'}`}>{p.estado}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-surface-500">Monto</p>
                  <p className="text-brand-600 font-bold text-lg">{formatPrecio(p.monto)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-500">Cancha</p>
                  <p className="text-ink">{p.reservas?.canchas?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-500">Fecha reserva</p>
                  <p className="text-surface-200">{p.reservas?.fecha || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-500">Método</p>
                  <p className="text-surface-200">{p.metodo_pago || '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
                {p.comprobante_url ? (
                  <button onClick={() => setVerComprobante(p.comprobante_url)} className="btn-secondary btn-sm">
                    <Eye className="w-4 h-4" /> Ver comprobante
                  </button>
                ) : (
                  <span className="text-xs text-surface-500 flex items-center gap-1"><FileImage className="w-4 h-4" /> Sin comprobante</span>
                )}

                {p.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <button onClick={() => cambiarEstado(p, 'rechazado')} disabled={procesando === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-700 hover:bg-red-500/20 rounded-lg transition text-xs font-medium">
                      <X className="w-4 h-4" /> Rechazar
                    </button>
                    <button onClick={() => cambiarEstado(p, 'aprobado')} disabled={procesando === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-700 hover:bg-green-500/20 rounded-lg transition text-xs font-medium">
                      {procesando === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Aprobar
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-surface-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatFecha(p.created_at, 'short')}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Visor de comprobante */}
      {verComprobante && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setVerComprobante(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVerComprobante(null)} className="absolute -top-12 right-0 p-2 bg-surface-800 rounded-full text-ink hover:bg-surface-700">
              <X className="w-5 h-5" />
            </button>
            <img src={verComprobante} alt="Comprobante" className="w-full rounded-2xl border border-line" />
            <a href={verComprobante} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm w-full mt-3 justify-center">
              Abrir en tamaño completo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
