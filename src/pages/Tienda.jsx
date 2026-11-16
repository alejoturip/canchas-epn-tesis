/**
 * Tienda.jsx — Implementos deportivos (versión TESIS).
 *
 * OJO: acá NO se vende nada. El estudiante arma una "mochila" con los
 * implementos que necesita y la pide contra una de sus reservas de cancha; el
 * admin aprueba, entrega y después registra la devolución. El monto que se ve
 * es el VALOR DE REPOSICIÓN (referencial, por si se pierde o se daña algo), no
 * un precio de venta: no hay cobro ni checkout.
 *
 * El checkout por WhatsApp que traía "La Fija" se quitó a propósito.
 * Base de datos: supabase/prestamos_implementos.sql
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MSym from '../components/MSym';
import { ProductosSkeleton } from '../components/Skeletons';
import { toastExito, toastError } from '../lib/notify';
import { useAuth } from '../context/AuthContext';
import {
  getImplementos, getReservasParaPrestamo, getPrestamosByUser,
  crearPrestamo, cancelarPrestamo,
} from '../services/supabaseService';
import {
  estadoPrestamo, estaAtrasado, resumenReserva, totalUnidades, valorReposicionTotal,
} from '../utils/prestamos';

const MOCHILA_KEY = 'mochila_prestamo';
const ESTADOS_VIVOS = ['solicitado', 'aprobado', 'prestado'];
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const contenedor = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

export default function Tienda() {
  const { user } = useAuth();
  const [tab, setTab] = useState('catalogo');       // catalogo | mis
  const [productos, setProductos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [mochila, setMochila] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MOCHILA_KEY)) || []; } catch { return []; }
  });

  const cargar = useCallback(async () => {
    if (!user) return;
    const [{ data: prods }, { data: pres }, { data: res }] = await Promise.all([
      getImplementos(),
      getPrestamosByUser(user.id),
      getReservasParaPrestamo(user.id),
    ]);
    setProductos(prods || []);
    setPrestamos(pres || []);
    setReservas(res || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  // El admin aprueba/entrega desde su panel: que se vea sin recargar.
  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel('prestamos-cliente')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prestamos', filter: `perfil_id=eq.${user.id}` },
        () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [user, cargar]);

  useEffect(() => {
    try { localStorage.setItem(MOCHILA_KEY, JSON.stringify(mochila)); } catch { /* noop */ }
  }, [mochila]);

  const categorias = useMemo(
    () => [...new Set(productos.map((p) => p.categoria).filter(Boolean))],
    [productos]);

  const filtrados = useMemo(() => productos.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (busqueda) {
      const t = `${p.nombre} ${p.descripcion || ''}`.toLowerCase();
      if (!t.includes(busqueda.toLowerCase())) return false;
    }
    return true;
  }), [productos, categoria, busqueda]);

  const activos = useMemo(
    () => prestamos.filter((p) => ESTADOS_VIVOS.includes(p.estado)),
    [prestamos]);

  // Una reserva con un préstamo vivo ya no puede recibir otro pedido.
  const reservasLibres = useMemo(
    () => reservas.filter((r) => !activos.some((p) => p.reserva_id === r.id)),
    [reservas, activos]);

  const enMochila = (id) => mochila.find((m) => m.id === id)?.cantidad || 0;
  const totalItems = totalUnidades(mochila);

  const agregar = (p) => {
    if (enMochila(p.id) >= p.stock) { toastError('No queda más disponibilidad de este implemento'); return; }
    setMochila((prev) => {
      const ex = prev.find((m) => m.id === p.id);
      if (ex) return prev.map((m) => (m.id === p.id ? { ...m, cantidad: m.cantidad + 1 } : m));
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, stock: p.stock, cantidad: 1 }];
    });
    toastExito(`"${p.nombre}" va en la mochila`);
  };

  const cambiarCantidad = (id, delta) => {
    setMochila((prev) => prev
      .map((m) => (m.id === id ? { ...m, cantidad: Math.min(m.stock, m.cantidad + delta) } : m))
      .filter((m) => m.cantidad > 0));
  };
  const quitar = (id) => setMochila((prev) => prev.filter((m) => m.id !== id));
  const vaciar = () => setMochila([]);

  const enviarSolicitud = async ({ reserva_id, observaciones }) => {
    const { error } = await crearPrestamo({ perfil_id: user.id, reserva_id, observaciones }, mochila);
    if (error) { toastError('No se pudo enviar el pedido: ' + error.message); return false; }
    vaciar();
    setPanelAbierto(false);
    setTab('mis');
    await cargar();
    toastExito('Pedido enviado. Te avisamos cuando lo aprueben.');
    return true;
  };

  const anular = async (id) => {
    if (!window.confirm('¿Dar de baja este pedido de implementos?')) return;
    const { error } = await cancelarPrestamo(id);
    if (error) toastError('No se pudo cancelar: ' + error.message);
    else { toastExito('Pedido dado de baja'); cargar(); }
  };

  const atrasados = activos.filter(estaAtrasado).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <MSym name="sports_soccer" className="text-brand-500 text-[32px]" fill />
          <div>
            <h1 className="display-title text-3xl text-ink">Implementos</h1>
            <p className="text-surface-400 text-xs mt-0.5">Préstamo gratuito para tu reserva</p>
          </div>
        </div>
        <button onClick={() => setPanelAbierto(true)} className="relative btn-secondary">
          <MSym name="backpack" className="text-[20px]" /> Mochila
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">{totalItems}</span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-line">
        <Tab activo={tab === 'catalogo'} onClick={() => setTab('catalogo')} icon="inventory_2">Catálogo</Tab>
        <Tab activo={tab === 'mis'} onClick={() => setTab('mis')} icon="assignment" badge={activos.length || null}>
          Mis préstamos
        </Tab>
      </div>

      {atrasados > 0 && tab === 'catalogo' && (
        <button onClick={() => setTab('mis')}
          className="w-full mb-5 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-700 text-sm text-left">
          <MSym name="schedule" className="text-[20px] flex-shrink-0" />
          <span className="flex-1">
            Tenés {atrasados === 1 ? 'un préstamo' : `${atrasados} préstamos`} sin devolver. Devolvelos en bodega para poder pedir de nuevo.
          </span>
        </button>
      )}

      {tab === 'catalogo' ? (
        <Catalogo
          loading={loading} productos={productos} filtrados={filtrados}
          categorias={categorias} categoria={categoria} setCategoria={setCategoria}
          busqueda={busqueda} setBusqueda={setBusqueda}
          enMochila={enMochila} onAgregar={agregar} onDetalle={setDetalle}
        />
      ) : (
        <MisPrestamos loading={loading} prestamos={prestamos} onCancelar={anular} onIrCatalogo={() => setTab('catalogo')} />
      )}

      {/* Botón flotante (mobile) */}
      {totalItems > 0 && tab === 'catalogo' && (
        <button onClick={() => setPanelAbierto(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 btn-primary shadow-glow-md rounded-full px-5 py-3">
          <MSym name="backpack" className="text-[20px] mr-1" /> {totalItems} · Pedir
        </button>
      )}

      <AnimatePresence>
        {detalle && (
          <ModalDetalle p={detalle} enMochila={enMochila(detalle.id)}
            onAgregar={() => agregar(detalle)} onClose={() => setDetalle(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelAbierto && (
          <PanelMochila
            mochila={mochila} reservas={reservasLibres} hayReservas={reservas.length > 0}
            onClose={() => setPanelAbierto(false)} onCambiar={cambiarCantidad}
            onQuitar={quitar} onVaciar={vaciar} onEnviar={enviarSolicitud}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────── Catálogo ──────────────────────────────── */

function Catalogo({ loading, productos, filtrados, categorias, categoria, setCategoria,
  busqueda, setBusqueda, enMochila, onAgregar, onDetalle }) {
  return (
    <>
      <div className="space-y-3 mb-6">
        <div className="relative max-w-md">
          <MSym name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-[20px]" />
          <input className="input pl-11" placeholder="Buscar implemento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip activo={categoria === ''} onClick={() => setCategoria('')}>Todos</Chip>
            {categorias.map((c) => <Chip key={c} activo={categoria === c} onClick={() => setCategoria(c)}>{c}</Chip>)}
          </div>
        )}
      </div>

      {loading ? (
        <ProductosSkeleton />
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-2 border-dashed border-line">
          {productos.length === 0 ? 'Todavía no hay implementos cargados.' : 'No encontramos implementos con ese filtro.'}
        </div>
      ) : (
        <motion.div variants={contenedor} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filtrados.map((p) => {
            const sinStock = p.stock <= 0;
            const enMo = enMochila(p.id);
            return (
              <motion.div variants={item} key={p.id} className="card-hover flex flex-col overflow-hidden">
                <button onClick={() => onDetalle(p)} className="h-44 w-full bg-surface-800 relative block">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-surface-500"><MSym name="image" className="text-[32px]" /></div>
                  )}
                  {sinStock ? (
                    <span className="absolute top-2 right-2 badge bg-red-500/80 text-white">Todos prestados</span>
                  ) : p.stock <= 3 ? (
                    <span className="absolute top-2 right-2 badge bg-gold/80 text-ink">Quedan {p.stock}</span>
                  ) : (
                    <span className="absolute top-2 right-2 badge bg-slate-900/40 text-white">{p.stock} disponibles</span>
                  )}
                  {p.categoria && <span className="absolute top-2 left-2 badge bg-slate-900/40 text-white">{p.categoria}</span>}
                </button>

                <div className="p-4 flex flex-col flex-1">
                  <button onClick={() => onDetalle(p)} className="text-left font-bold text-ink leading-tight hover:text-brand-600 transition-colors line-clamp-1">{p.nombre}</button>
                  <p className="text-surface-400 text-xs mb-3 line-clamp-2">{p.descripcion}</p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-[11px] text-surface-500 leading-tight">
                      Reposición<br /><span className="text-surface-300 font-semibold">{money(p.precio)}</span>
                    </span>
                    <button onClick={() => onAgregar(p)} disabled={sinStock || enMo >= p.stock} className="btn-primary btn-sm">
                      <MSym name="add" className="text-[16px]" /> {enMo > 0 ? `(${enMo})` : 'Pedir'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
}

/* ───────────────────────────── Mis préstamos ───────────────────────────── */

function MisPrestamos({ loading, prestamos, onCancelar, onIrCatalogo }) {
  if (loading) return <ProductosSkeleton />;

  if (prestamos.length === 0) {
    return (
      <div className="card p-12 text-center border-2 border-dashed border-line flex flex-col items-center gap-3">
        <MSym name="backpack" className="text-[44px] text-surface-500" />
        <p className="text-surface-400">Todavía no pediste implementos.</p>
        <button onClick={onIrCatalogo} className="btn-primary mt-1">Ver el catálogo</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prestamos.map((p) => {
        const est = estadoPrestamo(p.estado);
        const atrasado = estaAtrasado(p);
        return (
          <div key={p.id} className={`card p-5 border-l-4 ${atrasado ? 'border-l-amber-400' : 'border-l-brand-600'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-ink leading-tight">{resumenReserva(p.reservas)}</p>
                <p className="text-surface-500 text-xs mt-1">
                  Retiro al inicio del horario · devolución al terminar
                </p>
              </div>
              <span className={est.badge}>{est.label}</span>
            </div>

            <ul className="space-y-1.5 mb-3">
              {(p.prestamo_items || []).map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span className="text-surface-200">
                    <strong className="text-ink">{i.cantidad}×</strong> {i.nombre}
                  </span>
                  {p.estado === 'devuelto' && i.devueltos < i.cantidad && (
                    <span className="text-amber-700 text-xs">Faltaron {i.cantidad - i.devueltos}</span>
                  )}
                </li>
              ))}
            </ul>

            {p.estado === 'rechazado' && p.motivo_rechazo && (
              <p className="text-sm text-red-700 bg-red-500/10 border border-red-300 rounded-lg p-2.5 mb-3">
                {p.motivo_rechazo}
              </p>
            )}
            {p.estado === 'devuelto' && p.nota_devolucion && (
              <p className="text-sm text-surface-300 bg-surface-850 rounded-lg p-2.5 mb-3">{p.nota_devolucion}</p>
            )}
            {atrasado && (
              <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-300 rounded-lg p-2.5 mb-3">
                Tu horario ya terminó y los implementos siguen sin devolverse.
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-xs text-surface-500">
                Valor de reposición: <strong className="text-surface-300">{money(valorReposicionTotal(p.prestamo_items))}</strong>
              </span>
              {p.estado === 'solicitado' && (
                <button onClick={() => onCancelar(p.id)} className="text-xs text-red-700 hover:text-red-700">
                  Dar de baja
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────── Componentes ────────────────────────────── */

function Tab({ activo, onClick, icon, badge, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        activo ? 'border-brand-500 text-ink' : 'border-transparent text-surface-400 hover:text-surface-200'}`}>
      <MSym name={icon} className="text-[18px]" fill={activo} /> {children}
      {badge ? <span className="badge-brand text-[10px]">{badge}</span> : null}
    </button>
  );
}

function Chip({ activo, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${activo ? 'bg-brand-500 text-white' : 'bg-surface-850 text-surface-300 hover:bg-surface-700'}`}>
      {children}
    </button>
  );
}

function ModalDetalle({ p, enMochila, onAgregar, onClose }) {
  const sinStock = p.stock <= 0;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="h-56 bg-surface-800 relative flex-shrink-0">
          {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-surface-500"><MSym name="image" className="text-[40px]" /></div>}
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-lg bg-slate-900/40 text-white hover:bg-slate-900/40"><MSym name="close" className="text-[20px]" /></button>
          {p.categoria && <span className="absolute top-3 left-3 badge bg-slate-900/40 text-white">{p.categoria}</span>}
        </div>
        <div className="p-5 overflow-y-auto">
          <h3 className="text-xl font-bold text-ink">{p.nombre}</h3>
          <p className="text-surface-300 text-sm mt-2 whitespace-pre-line">{p.descripcion}</p>
          <p className={`text-sm mt-3 ${sinStock ? 'text-red-700' : 'text-surface-400'}`}>
            {sinStock ? 'Ahora mismo están todos prestados' : `Disponibles para prestar: ${p.stock}`}
          </p>
          <p className="text-xs text-surface-500 mt-1">
            Valor de reposición {money(p.precio)} — es referencial, solo se cobra si el implemento se pierde o vuelve dañado.
          </p>
          <button onClick={onAgregar} disabled={sinStock || enMochila >= p.stock} className="btn-primary w-full mt-4">
            <MSym name="backpack" className="text-[18px]" /> {enMochila > 0 ? `Sumar otro (${enMochila} en la mochila)` : 'Sumar a la mochila'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** Panel lateral: la mochila + a qué reserva se ata el préstamo. */
function PanelMochila({ mochila, reservas, hayReservas, onClose, onCambiar, onQuitar, onVaciar, onEnviar }) {
  const [reservaId, setReservaId] = useState(reservas[0]?.id || '');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!reservaId) { toastError('Elegí para qué reserva son los implementos'); return; }
    setEnviando(true);
    await onEnviar({ reserva_id: reservaId, observaciones });
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="relative w-full max-w-md bg-surface-900 border-l border-line flex flex-col h-full">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="text-lg font-bold text-ink flex items-center gap-2"><MSym name="backpack" className="text-[22px]" /> Tu mochila</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"><MSym name="close" className="text-[20px]" /></button>
        </div>

        {mochila.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-400 gap-2 px-8 text-center">
            <MSym name="backpack" className="text-[40px] text-surface-500" />
            Tu mochila está vacía. Elegí implementos del catálogo.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mochila.map((m) => (
                <div key={m.id} className="flex items-center gap-3 card p-3">
                  <div className="w-14 h-14 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
                    {m.imagen_url ? <img src={m.imagen_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><MSym name="image" className="text-surface-500 text-[22px]" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm truncate">{m.nombre}</p>
                    <p className="text-surface-500 text-xs">Reposición {money(m.precio)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onCambiar(m.id, -1)} className="p-1.5 rounded-lg bg-surface-850 text-surface-300 hover:bg-surface-700"><MSym name="remove" className="text-[16px]" /></button>
                    <span className="w-6 text-center font-semibold text-ink">{m.cantidad}</span>
                    <button onClick={() => onCambiar(m.id, 1)} disabled={m.cantidad >= m.stock} className="p-1.5 rounded-lg bg-surface-850 text-surface-300 hover:bg-surface-700 disabled:opacity-40"><MSym name="add" className="text-[16px]" /></button>
                  </div>
                  <button onClick={() => onQuitar(m.id)} className="p-1.5 rounded-lg text-red-700 hover:bg-red-500/10"><MSym name="delete" className="text-[18px]" /></button>
                </div>
              ))}
              <button onClick={onVaciar} className="text-xs text-surface-500 hover:text-red-700">Vaciar mochila</button>

              {/* A qué reserva se ata el préstamo */}
              <div className="pt-4 border-t border-line space-y-3">
                <div>
                  <label className="label">¿Para qué reserva?</label>
                  {reservas.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-700 text-sm">
                      {hayReservas
                        ? 'Todas tus reservas próximas ya tienen un pedido de implementos en curso.'
                        : 'Primero reservá una cancha: los implementos se retiran y se devuelven en el horario de tu reserva.'}
                      <Link to="/" onClick={onClose} className="block mt-2 font-semibold underline">Ir a reservar</Link>
                    </div>
                  ) : (
                    <select className="input" value={reservaId} onChange={(e) => setReservaId(e.target.value)}>
                      <option value="">Elegí una reserva…</option>
                      {reservas.map((r) => (
                        <option key={r.id} value={r.id}>{resumenReserva(r)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="label">Nota para el encargado <span className="text-surface-500 font-normal">(opcional)</span></label>
                  <textarea className="input min-h-[64px] resize-none" placeholder="Ej: los retiro 10 minutos antes"
                    value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-line space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-400">Valor de reposición total</span>
                <span className="text-surface-200 font-semibold">{money(valorReposicionTotal(
                  mochila.map((m) => ({ valor_reposicion: m.precio, cantidad: m.cantidad }))))}</span>
              </div>
              <button onClick={confirmar} disabled={enviando || reservas.length === 0} className="btn-primary w-full py-3.5">
                <MSym name="send" className="text-[20px]" /> {enviando ? 'Enviando…' : 'Pedir prestado'}
              </button>
              <p className="text-[11px] text-surface-500 text-center">
                El encargado aprueba el pedido y te lo entrega en bodega. Al terminar tu horario tenés que devolver todo.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
