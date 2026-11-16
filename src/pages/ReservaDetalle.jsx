import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, MapPin, Calendar, Clock, Ticket, QrCode,
  Clock4, CheckCircle2, LogIn,
} from 'lucide-react';
import { getReservaById } from '../services/supabaseService';
import { FEATURES } from '../config/features';
import { INSTITUCION } from '../config/institucion';
import { MARCA } from '../config/marca';
import { formatFecha } from '../utils/formatters';

const BADGE = {
  pendiente:  'badge-amber',
  confirmada: 'badge-green',
  completada: 'badge-brand',
  cancelada:  'badge-red',
};

export default function ReservaDetalle() {
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data } = await getReservaById(id);
      if (activo) { setReserva(data); setLoading(false); }
    })();
    return () => { activo = false; };
  }, [id]);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;

  if (!reserva) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-surface-400 mb-4">No encontramos esta reserva.</p>
        <Link to="/mis-reservas" className="btn-primary">Volver a Mis Reservas</Link>
      </div>
    );
  }

  const confirmada = reserva.estado === 'confirmada' && reserva.acceso_token;
  const yaIngreso = !!reserva.ingreso_at;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto p-4 md:p-8">
      <Link to="/mis-reservas" className="inline-flex items-center gap-2 text-surface-400 hover:text-ink text-sm mb-5">
        <ArrowLeft className="w-4 h-4" /> Mis Reservas
      </Link>

      {/* Ticket */}
      <div className="card overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 relative">
          <div className="absolute inset-0 bg-hero-mesh opacity-40" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Ticket className="w-6 h-6" />
              <span className="font-display font-bold text-lg">Pase de Acceso</span>
            </div>
            <span className={`uppercase tracking-wider ${BADGE[reserva.estado] || 'badge-gray'}`}>{reserva.estado}</span>
          </div>
          <h1 className="relative text-white text-2xl font-display font-bold mt-3">{reserva.canchas?.nombre || 'Cancha'}</h1>
        </div>

        {/* Separador troquelado */}
        <div className="relative h-6 bg-surface-800">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-900" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-900" />
          <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-line" />
        </div>

        {/* Cuerpo */}
        <div className="p-6 bg-surface-800 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Dato icon={Calendar} label="Fecha" valor={formatFecha(reserva.fecha, 'short')} />
            <Dato icon={Clock} label="Horario" valor={`${reserva.hora_inicio?.substring(0,5)} - ${reserva.hora_fin?.substring(0,5)}`} />
            {reserva.canchas?.direccion && (
              <div className="col-span-2"><Dato icon={MapPin} label="Ubicación" valor={reserva.canchas.direccion} /></div>
            )}
          </div>

          {/* QR / estados */}
          {yaIngreso ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-14 h-14 text-green-700 mx-auto" />
              <p className="font-bold text-ink">Ingreso registrado</p>
              <p className="text-xs text-surface-400 flex items-center justify-center gap-1">
                <LogIn className="w-3.5 h-3.5" /> {new Date(reserva.ingreso_at).toLocaleString('es-EC')}
              </p>
            </div>
          ) : confirmada ? (
            /* Credencial de acceso. Es la pantalla que se muestra en la puerta
               (y la que se proyecta en la defensa): se enmarca institucionalmente. */
            <div className="text-center space-y-3 rounded-2xl border border-line bg-surface-850 p-5">
              <p className="text-[11px] uppercase tracking-[2px] text-surface-400">
                Credencial de acceso
              </p>
              <div className="bg-white p-4 rounded-2xl inline-block shadow-glow-md">
                <QRCodeSVG value={reserva.acceso_token} size={210} level="M" />
              </div>

              {/* Los datos del estudiante van EN la credencial: el encargado los
                  contrasta con el carné sin tener que abrir otra pantalla. */}
              <div className="text-left rounded-xl bg-surface-800 border border-line p-3.5 space-y-1.5">
                <DatoCredencial label="Estudiante"
                  valor={[reserva.perfiles?.nombre, reserva.perfiles?.apellido].filter(Boolean).join(' ') || '—'} />
                <DatoCredencial label="Código único" valor={reserva.perfiles?.codigo_unico || '—'} mono />
                <DatoCredencial label="Facultad" valor={reserva.perfiles?.facultad || '—'} />
                {reserva.perfiles?.carrera && (
                  <DatoCredencial label="Carrera" valor={reserva.perfiles.carrera} />
                )}
              </div>

              <p className="text-sm text-surface-300 flex items-center justify-center gap-1.5 max-w-xs mx-auto">
                <QrCode className="w-4 h-4 flex-shrink-0" />
                Presentá este código al ingresar a las instalaciones deportivas.
              </p>
              <div className="pt-3 border-t border-line">
                <p className="text-xs font-semibold text-surface-300">{INSTITUCION.nombre}</p>
                <p className="text-[11px] text-surface-500">{MARCA.nombre} · {MARCA.descriptor}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2 border-2 border-dashed border-line rounded-2xl">
              <Clock4 className="w-12 h-12 text-amber-700 mx-auto" />
              <p className="font-bold text-ink">QR pendiente</p>
              <p className="text-xs text-surface-400 max-w-xs mx-auto">
                {FEATURES.PAGOS
                  ? 'Tu QR de acceso se generará cuando el administrador apruebe tu pago.'
                  : 'Tu QR de acceso se generará cuando el encargado confirme tu reserva.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Fila de dato dentro de la credencial: etiqueta a la izquierda, valor a la derecha. */
function DatoCredencial({ label, valor, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-surface-500 flex-shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-ink text-right ${mono ? 'font-mono tracking-wide' : ''}`}>
        {valor}
      </span>
    </div>
  );
}

function Dato({ icon: Icon, label, valor }) {
  return (
    <div>
      <p className="text-[11px] text-surface-500 flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {label}</p>
      <p className="text-sm font-semibold text-ink mt-0.5">{valor}</p>
    </div>
  );
}
