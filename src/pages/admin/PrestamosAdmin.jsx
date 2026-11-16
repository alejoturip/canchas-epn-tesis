/**
 * PrestamosAdmin.jsx — Gestión de préstamos de implementos (versión TESIS).
 *
 * Flujo: solicitado → aprobado → prestado → devuelto (o rechazado / cancelado).
 * El stock lo mueve la base, no esta pantalla: el trigger `fn_prestamo_cambia_estado`
 * descuenta al entregar y repone al devolver (solo lo que volvió). Por eso
 * "Entregar" puede fallar con "no hay stock suficiente" — ese error viene del SQL
 * y se muestra tal cual.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { toastExito, toastError } from '../../lib/notify';
import { useAuth } from '../../context/AuthContext';
import {
  getAllPrestamos, updatePrestamoEstado, updatePrestamoItemDevueltos,
} from '../../services/supabaseService';
import {
  estadoPrestamo, estaAtrasado, resumenReserva, totalUnidades, valorReposicionTotal, faltantes,
} from '../../utils/prestamos';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const FILTROS = [
  { id: 'solicitado', label: 'Por aprobar', estados: ['solicitado'] },
  { id: 'aprobado',   label: 'Por entregar', estados: ['aprobado'] },
  { id: 'prestado',   label: 'En la calle',  estados: ['prestado'] },
  { id: 'historial',  label: 'Historial',    estados: ['devuelto', 'rechazado', 'cancelado'] },
];

export default function PrestamosAdmin() {
  const { user } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('solicitado');
  const [rechazando, setRechazando] = useState(null);   // préstamo a rechazar
  const [devolviendo, setDevolviendo] = useState(null); // préstamo a devolver
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await getAllPrestamos();
    if (error) toastError('No se pudieron cargar los préstamos: ' + error.message);
    else setPrestamos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const canal = supabase
      .channel('prestamos-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [cargar]);

  const conteos = useMemo(() => {
    const c = {};
    FILTROS.forEach((f) => { c[f.id] = prestamos.filter((p) => f.estados.includes(p.estado)).length; });
    return c;
  }, [prestamos]);

  const visibles = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro);
    return prestamos.filter((p) => f.estados.includes(p.estado));
  }, [prestamos, filtro]);

  const atrasados = useMemo(() => prestamos.filter(estaAtrasado).length, [prestamos]);

  const cambiar = async (prestamo, estado, extra = {}) => {
    setProcesando(true);
    const { error } = await updatePrestamoEstado(prestamo.id, estado, { atendido_por: user.id, ...extra });
    setProcesando(false);
    if (error) { toastError(error.message); return false; }
    toastExito({
      aprobado: 'Pedido aprobado',
      rechazado: 'Pedido rechazado',
      prestado: 'Entrega registrada',
      devuelto: 'Devolución registrada',
    }[estado] || 'Actualizado');
    cargar();
    return true;
  };

  const confirmarDevolucion = async ({ devueltosPorItem, nota }) => {
    setProcesando(true);
    // Primero las cantidades: el trigger las lee para reponer el stock.
    for (const [itemId, cant] of Object.entries(devueltosPorItem)) {
      const { error } = await updatePrestamoItemDevueltos(itemId, cant);
      if (error) { setProcesando(false); toastError('No se pudo guardar la devolución: ' + error.message); return; }
    }
    setProcesando(false);
    const ok = await cambiar(devolviendo, 'devuelto', { nota_devolucion: nota || null });
    if (ok) setDevolviendo(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Préstamos de Implementos</h1>
          <p className="text-surface-400 text-sm mt-1">Aprobá, entregá y registrá la devolución.</p>
        </div>
        {atrasados > 0 && (
          <span className="badge-amber flex items-center gap-1.5 self-start">
            <MSym name="schedule" className="text-[16px]" /> {atrasados} sin devolver
          </span>
        )}
      </div>

      <AyudaBox id="prestamos" titulo="¿Cómo funciona el préstamo?" icon="backpack">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="how_to_reg" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">El estudiante pide implementos <b className="text-ink">para una reserva suya</b>. Vos <b className="text-ink">aprobás o rechazás</b>.</span></li>
          <li className="flex gap-2"><MSym name="inventory_2" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Cuando se los das en mano, tocá <b className="text-ink">Entregar</b>: recién ahí baja el stock.</span></li>
          <li className="flex gap-2"><MSym name="assignment_turned_in" className="text-gold text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Al terminar el horario tocá <b className="text-ink">Registrar devolución</b> y anotá cuántas unidades volvieron. Lo que no vuelve, no se repone al stock.</span></li>
        </ul>
      </AyudaBox>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.id ? 'bg-brand-500 text-white' : 'bg-surface-850 text-surface-300 hover:bg-surface-700'}`}>
            {f.label}{conteos[f.id] ? ` (${conteos[f.id]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : visibles.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
          No hay préstamos en esta bandeja.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {visibles.map((p) => (
            <TarjetaPrestamo key={p.id} p={p} procesando={procesando}
              onAprobar={() => cambiar(p, 'aprobado')}
              onEntregar={() => cambiar(p, 'prestado')}
              onRechazar={() => setRechazando(p)}
              onDevolver={() => setDevolviendo(p)}
            />
          ))}
        </div>
      )}

      {rechazando && (
        <ModalRechazo procesando={procesando} onClose={() => setRechazando(null)}
          onConfirmar={async (motivo) => {
            const ok = await cambiar(rechazando, 'rechazado', { motivo_rechazo: motivo || null });
            if (ok) setRechazando(null);
          }} />
      )}

      {devolviendo && (
        <ModalDevolucion p={devolviendo} procesando={procesando}
          onClose={() => setDevolviendo(null)} onConfirmar={confirmarDevolucion} />
      )}
    </div>
  );
}

/* ──────────────────────────────── Tarjeta ──────────────────────────────── */

function TarjetaPrestamo({ p, procesando, onAprobar, onEntregar, onRechazar, onDevolver }) {
  const est = estadoPrestamo(p.estado);
  const atrasado = estaAtrasado(p);
  const cliente = p.perfiles;
  const items = p.prestamo_items || [];
  const sinDevolver = p.estado === 'devuelto' ? faltantes(items) : 0;

  return (
    <div className={`card p-5 flex flex-col border-l-4 ${atrasado ? 'border-l-amber-400' : 'border-l-brand-600'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink leading-tight truncate">{cliente?.nombre || 'Estudiante'}</h3>
          <p className="text-surface-500 text-xs truncate">{cliente?.email}</p>
        </div>
        <span className={est.badge}>{est.label}</span>
      </div>

      <p className="text-sm text-surface-300 mt-3 flex items-center gap-1.5">
        <MSym name="event" className="text-[16px] text-surface-500" /> {resumenReserva(p.reservas)}
      </p>
      {atrasado && (
        <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1.5">
          <MSym name="schedule" className="text-[16px]" /> El horario ya terminó y no se devolvieron.
        </p>
      )}

      <ul className="mt-3 space-y-1 border-t border-line pt-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between text-sm">
            <span className="text-surface-200"><strong className="text-ink">{i.cantidad}×</strong> {i.nombre}</span>
            <span className="text-surface-500 text-xs">
              {p.estado === 'devuelto'
                ? `volvieron ${i.devueltos}/${i.cantidad}`
                : money(Number(i.valor_reposicion) * i.cantidad)}
            </span>
          </li>
        ))}
      </ul>

      {p.observaciones && (
        <p className="text-sm text-surface-300 bg-surface-850 rounded-lg p-2.5 mt-3">
          <span className="text-surface-500 text-xs block mb-0.5">Nota del estudiante</span>{p.observaciones}
        </p>
      )}
      {p.motivo_rechazo && (
        <p className="text-sm text-red-700 bg-red-500/10 rounded-lg p-2.5 mt-3">{p.motivo_rechazo}</p>
      )}
      {sinDevolver > 0 && (
        <p className="text-sm text-amber-700 bg-amber-500/10 rounded-lg p-2.5 mt-3">
          Quedaron {sinDevolver} unidad(es) sin devolver.
        </p>
      )}

      <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 border-t border-line">
        <span className="text-xs text-surface-500">
          {totalUnidades(items)} u. · {money(valorReposicionTotal(items))}
        </span>
        <div className="flex items-center gap-2">
          {p.estado === 'solicitado' && (
            <>
              <button onClick={onRechazar} disabled={procesando} className="btn-ghost btn-sm text-red-700">Rechazar</button>
              <button onClick={onAprobar} disabled={procesando} className="btn-primary btn-sm">
                <MSym name="check" className="text-[16px]" /> Aprobar
              </button>
            </>
          )}
          {p.estado === 'aprobado' && (
            <>
              <button onClick={onRechazar} disabled={procesando} className="btn-ghost btn-sm text-red-700">Anular</button>
              <button onClick={onEntregar} disabled={procesando} className="btn-primary btn-sm">
                <MSym name="inventory_2" className="text-[16px]" /> Entregar
              </button>
            </>
          )}
          {p.estado === 'prestado' && (
            <button onClick={onDevolver} disabled={procesando} className="btn-primary btn-sm">
              <MSym name="assignment_turned_in" className="text-[16px]" /> Registrar devolución
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────── Modales ──────────────────────────────── */

function ModalRechazo({ procesando, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal titulo="Rechazar pedido" onClose={onClose}>
      <p className="text-sm text-surface-400 mb-3">
        El estudiante recibe el aviso con el motivo. El stock no se toca (todavía no salió nada de bodega).
      </p>
      <label className="label">Motivo <span className="text-surface-500 font-normal">(opcional)</span></label>
      <textarea className="input min-h-[80px] resize-none" placeholder="Ej: los balones están en mantenimiento"
        value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 btn-ghost">Volver</button>
        <button onClick={() => onConfirmar(motivo)} disabled={procesando} className="flex-1 btn-primary">
          {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechazar'}
        </button>
      </div>
    </Modal>
  );
}

function ModalDevolucion({ p, procesando, onClose, onConfirmar }) {
  const items = p.prestamo_items || [];
  const [devueltos, setDevueltos] = useState(
    () => Object.fromEntries(items.map((i) => [i.id, i.cantidad])));
  const [nota, setNota] = useState('');

  const setCant = (id, valor, max) => {
    const n = Math.max(0, Math.min(max, Number(valor) || 0));
    setDevueltos((d) => ({ ...d, [id]: n }));
  };
  const faltan = items.reduce((s, i) => s + (i.cantidad - (devueltos[i.id] ?? 0)), 0);

  return (
    <Modal titulo="Registrar devolución" onClose={onClose}>
      <p className="text-sm text-surface-400 mb-4">
        Confirmá cuántas unidades volvieron. Solo esas se reponen al stock.
      </p>
      <div className="space-y-2.5">
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-850">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{i.nombre}</p>
              <p className="text-xs text-surface-500">Se prestaron {i.cantidad}</p>
            </div>
            <input type="number" min="0" max={i.cantidad} className="input w-20 text-center"
              value={devueltos[i.id] ?? 0} onChange={(e) => setCant(i.id, e.target.value, i.cantidad)} />
          </div>
        ))}
      </div>

      {faltan > 0 && (
        <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-300 rounded-lg p-2.5 mt-3">
          Faltan {faltan} unidad(es). Valor de reposición a cargo del estudiante.
        </p>
      )}

      <label className="label mt-4">Observación <span className="text-surface-500 font-normal">(opcional)</span></label>
      <textarea className="input min-h-[70px] resize-none" placeholder="Ej: la red volvió con un desgarro"
        value={nota} onChange={(e) => setNota(e.target.value)} />

      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 btn-ghost">Volver</button>
        <button onClick={() => onConfirmar({ devueltosPorItem: devueltos, nota })} disabled={procesando} className="flex-1 btn-primary">
          {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar devolución'}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-line flex-shrink-0">
          <h2 className="text-lg font-bold text-ink">{titulo}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors">
            <MSym name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
