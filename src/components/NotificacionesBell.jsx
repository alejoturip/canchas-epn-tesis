import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CalendarCheck, CalendarX2, Gift, Megaphone, CheckCheck, BellOff,
} from 'lucide-react';
import { useNotificaciones } from '../hooks/useNotificaciones';
import { tiempoRelativo } from '../utils/formatters';

const ICONOS = {
  reserva:   CalendarCheck,
  cancelada: CalendarX2,
  premio:    Gift,
  promocion: Megaphone,
  info:      Bell,
};

const COLORES = {
  reserva:   'text-green-700 bg-green-500/10',
  cancelada: 'text-red-700 bg-red-500/10',
  premio:    'text-accent-light bg-accent/10',
  promocion: 'text-brand-600 bg-brand-500/10',
  info:      'text-surface-300 bg-surface-850',
};

export default function NotificacionesBell() {
  const { notificaciones, noLeidas, loading, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n) => {
    if (!n.leida) marcarLeida(n.id);
    if (n.enlace) {
      navigate(n.enlace);
      setAbierto(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Campana */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative p-2.5 text-surface-300 hover:text-ink hover:bg-surface-850 rounded-xl transition-all"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-brand-500 rounded-full border-2 border-surface-900 shadow-glow-sm">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-16 w-auto max-w-none sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-sm bg-surface-900 border border-line rounded-2xl shadow-card-hover overflow-hidden z-[70]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h3 className="font-bold text-ink">Notificaciones</h3>
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  className="text-xs text-brand-600 hover:text-brand-600 flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-surface-500 text-sm">Cargando…</div>
              ) : notificaciones.length === 0 ? (
                <div className="p-10 text-center text-surface-500 flex flex-col items-center gap-3">
                  <BellOff className="w-10 h-10 text-surface-500" />
                  <p className="text-sm">No tienes notificaciones todavía.</p>
                </div>
              ) : (
                notificaciones.map((n) => {
                  const Icon = ICONOS[n.tipo] || Bell;
                  const color = COLORES[n.tipo] || COLORES.info;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-line transition-colors hover:bg-surface-850
                        ${!n.leida ? 'bg-brand-500/5' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink leading-snug">{n.titulo}</p>
                        {n.mensaje && <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{n.mensaje}</p>}
                        <p className="text-[11px] text-surface-500 mt-1">{tiempoRelativo(n.created_at)}</p>
                      </div>
                      {!n.leida && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5 shadow-glow-sm" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
