import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import {
  QrCode, Camera, CameraOff, Search, Loader2, CheckCircle2, XCircle,
  AlertTriangle, MapPin, User, Calendar, Clock, LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getReservaByToken, marcarIngreso } from '../../services/supabaseService';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { toastExito, toastError } from '../../lib/notify';

export default function ValidarReserva() {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const [escaneando, setEscaneando] = useState(false);
  const [tokenManual, setTokenManual] = useState('');
  const [reserva, setReserva] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  const detener = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch { /* ignore */ }
    setEscaneando(false);
  };

  useEffect(() => () => { detener(); }, []);

  const iniciar = async () => {
    setError('');
    setReserva(null);
    try {
      const html5 = new Html5Qrcode('qr-reader');
      scannerRef.current = html5;
      setEscaneando(true);
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (texto) => { await detener(); buscar(texto); },
        () => { /* lecturas fallidas: ignorar */ }
      );
    } catch (e) {
      setEscaneando(false);
      toastError('No se pudo acceder a la cámara: ' + e.message);
    }
  };

  // Busca la reserva y, si el acceso es válido, registra el ingreso automáticamente
  // (sin clicks extra: escanear = validar + marcar ingreso).
  const buscar = async (token) => {
    const t = (token || '').trim();
    if (!t) return;
    setBuscando(true);
    setError('');
    setReserva(null);
    const { data, error: err } = await getReservaByToken(t);
    if (err || !data) {
      setBuscando(false);
      return setError('No se encontró ninguna reserva con ese código QR.');
    }

    const esValida =
      data.estado === 'confirmada' &&
      !data.ingreso_at &&
      !(data.acceso_expira && new Date(data.acceso_expira) < new Date());

    if (esValida) {
      const { error: errIngreso } = await marcarIngreso(data, user.id);
      if (errIngreso) {
        setBuscando(false);
        setReserva(data);
        return toastError('Error al registrar ingreso: ' + errIngreso.message);
      }
      toastExito('Ingreso registrado ✅');
      setReserva({ ...data, ingreso_at: new Date().toISOString(), _autoIngreso: true });
    } else {
      setReserva(data);
    }
    setBuscando(false);
  };

  // Diagnóstico de la reserva
  const expirada = reserva?.acceso_expira && new Date(reserva.acceso_expira) < new Date();
  const autoIngreso = !!reserva?._autoIngreso;
  const yaIngreso = !!reserva?.ingreso_at && !autoIngreso;
  const confirmada = reserva?.estado === 'confirmada';

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="section-title flex items-center gap-2"><QrCode className="w-7 h-7 text-brand-500" /> Validar Reserva</h2>
        <p className="text-surface-400 text-sm">Escaneá el QR de acceso del estudiante o ingresá el código manualmente.</p>
      </div>

      <AyudaBox id="validar" titulo="¿Cómo validar el ingreso?" icon="qr_code_scanner">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="photo_camera" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Iniciar escáner</b> y apuntá la cámara al QR del cliente.</span></li>
          <li className="flex gap-2"><MSym name="bolt" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Al escanear, <b className="text-ink">el ingreso se registra solo</b> (no hay que tocar otro botón).</span></li>
          <li className="flex gap-2"><MSym name="keyboard" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Si la cámara falla, pegá el <b className="text-ink">código manual</b> de la reserva.</span></li>
        </ul>
      </AyudaBox>

      {/* Escáner */}
      <div className="card p-5">
        <div id="qr-reader" className={`w-full overflow-hidden rounded-2xl ${escaneando ? 'block' : 'hidden'}`} />
        {!escaneando ? (
          <button onClick={iniciar} className="btn-primary w-full py-3.5">
            <Camera className="w-5 h-5" /> Iniciar escáner de cámara
          </button>
        ) : (
          <button onClick={detener} className="btn-danger w-full py-3.5 mt-3">
            <CameraOff className="w-5 h-5" /> Detener escáner
          </button>
        )}

        {/* Entrada manual */}
        <div className="flex items-center gap-2 mt-4">
          <input
            className="input"
            placeholder="O pega aquí el código de acceso…"
            value={tokenManual}
            onChange={(e) => setTokenManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar(tokenManual)}
          />
          <button onClick={() => buscar(tokenManual)} disabled={buscando} className="btn-secondary shrink-0">
            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-5 flex items-center gap-3 border-red-300">
          <XCircle className="w-6 h-6 text-red-700 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {reserva && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          {/* Banner de estado */}
          <div className={`p-4 flex items-center gap-3 ${
            autoIngreso ? 'bg-green-500/15 text-green-700'
            : yaIngreso ? 'bg-amber-500/15 text-amber-700'
            : 'bg-red-500/15 text-red-700'}`}>
            {autoIngreso ? <CheckCircle2 className="w-7 h-7" />
              : yaIngreso ? <AlertTriangle className="w-7 h-7" />
              : <XCircle className="w-7 h-7" />}
            <div>
              <p className="font-bold">
                {autoIngreso ? 'Ingreso registrado ✅' : yaIngreso ? 'Ya registró ingreso' : expirada ? 'QR expirado' : !confirmada ? 'Reserva no confirmada' : 'Acceso no válido'}
              </p>
              <p className="text-xs opacity-80">
                {autoIngreso ? 'Acceso autorizado. El estudiante puede ingresar.'
                  : yaIngreso ? `Este QR ya fue usado: ingresó el ${new Date(reserva.ingreso_at).toLocaleString('es-EC')}`
                  : expirada ? 'El código de acceso ya venció.'
                  : 'El pago aún no ha sido aprobado.'}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <Dato icon={User} label="Estudiante" valor={reserva.perfiles?.nombre || reserva.perfiles?.email || '—'} />
            {/* Lo declara el propio estudiante: sirve para contrastarlo con el carné. */}
            <Dato icon={User} label="Código único" valor={reserva.perfiles?.codigo_unico || 'No declarado'} />
            <Dato icon={MapPin} label="Cancha" valor={reserva.canchas?.nombre || '—'} />
            <Dato icon={Calendar} label="Fecha" valor={reserva.fecha} />
            <Dato icon={Clock} label="Horario" valor={`${reserva.hora_inicio?.substring(0,5)} - ${reserva.hora_fin?.substring(0,5)}`} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Estado de la reserva:</span>
              <span className="badge badge-brand uppercase">{reserva.estado}</span>
            </div>

            {autoIngreso && (
              <p className="text-xs text-surface-500 flex items-center gap-1.5 pt-1">
                <LogIn className="w-3.5 h-3.5" /> Registrado automáticamente al escanear · {new Date(reserva.ingreso_at).toLocaleTimeString('es-EC')}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Dato({ icon: Icon, label, valor }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-surface-500 shrink-0" />
      <span className="text-sm text-surface-400 w-24">{label}</span>
      <span className="text-sm font-semibold text-ink">{valor}</span>
    </div>
  );
}
