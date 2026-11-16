import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toastExito, toastError, toastInfo } from '../lib/notify';
import {
  soportaPush, estadoPermiso, necesitaInstalarEnIOS,
  yaSuscrito, activarPush, desactivarPush,
} from '../lib/push';

/**
 * Tarjeta "Activar avisos" — pide el permiso de notificaciones y suscribe el
 * aparato al push. Sirve igual para el cliente y para el admin (cambia el texto).
 *
 * OJO: el permiso SIEMPRE se pide con un click del usuario (nunca al cargar la
 * página), porque si le da "Bloquear" el navegador no lo vuelve a preguntar.
 */
export default function ActivarNotificaciones({ admin = false }) {
  const { user } = useAuth();
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const permiso = estadoPermiso();
  const bloqueado = permiso === 'denied';
  const iosSinInstalar = necesitaInstalarEnIOS();

  useEffect(() => {
    yaSuscrito()
      .then(setActivo)
      .finally(() => setCargando(false));
  }, []);

  const handleToggle = async () => {
    setProcesando(true);
    try {
      if (activo) {
        const r = await desactivarPush();
        if (!r.ok) return toastError(r.motivo);
        setActivo(false);
        toastInfo('Avisos desactivados en este aparato', '🔕');
      } else {
        const r = await activarPush(user?.id);
        if (!r.ok) return toastError(r.motivo);
        setActivo(true);
        toastExito('¡Listo! Vas a recibir avisos 🔔');
      }
    } finally {
      setProcesando(false);
    }
  };

  // Navegador viejo o sin soporte: no mostramos nada (no tiene sentido ofrecerlo).
  if (!soportaPush()) return null;

  const texto = admin
    ? 'Te avisamos al celular cuando entre una reserva nueva o alguien suba un comprobante, aunque tengas la app cerrada.'
    : 'Te avisamos al celular cuando aprobemos tu pago y tu reserva quede confirmada, aunque tengas la app cerrada.';

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            activo ? 'bg-pitch/15 text-pitch' : 'bg-brand-500/10 text-brand-600'
          }`}
        >
          {activo ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">
            {activo ? 'Avisos activados' : 'Activar avisos'}
          </h3>
          <p className="text-sm text-surface-400 mt-0.5">{texto}</p>

          {/* iPhone: sin instalar la PWA, Apple no permite push. */}
          {iosSinInstalar && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3">
              <Smartphone className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-xs text-surface-200">
                En iPhone primero instalá la app: tocá <b>Compartir</b> y después{' '}
                <b>«Agregar a inicio»</b>. Recién ahí vas a poder activar los avisos.
              </p>
            </div>
          )}

          {/* El usuario bloqueó el permiso: no se puede volver a pedir desde el código. */}
          {bloqueado && !iosSinInstalar && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand-300 bg-brand-500/10 p-3">
              <BellOff className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-surface-200">
                Tenés las notificaciones <b>bloqueadas</b> en este navegador. Habilitalas desde el
                candado 🔒 de la barra de direcciones y volvé a intentar.
              </p>
            </div>
          )}

          {!bloqueado && !iosSinInstalar && (
            <button
              onClick={handleToggle}
              disabled={procesando || cargando}
              className={`mt-3 btn-sm ${activo ? 'btn-secondary' : 'btn-primary'}`}
            >
              {procesando || cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activo ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {cargando ? 'Cargando…' : activo ? 'Desactivar en este aparato' : 'Activar avisos'}
            </button>
          )}

          {activo && (
            <p className="text-[11px] text-surface-500 mt-2">
              Activado solo en <b>este</b> aparato. Si usás otro celular o computadora, activalo también ahí.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
