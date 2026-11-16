import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Loader2, Calendar, Clock, Upload, CheckCircle2, ArrowLeft } from 'lucide-react';
import { createPago, updatePagoComprobante } from '../services/supabaseService';
import { PAGO_CONFIG } from '../config/pago';
import { FEATURES } from '../config/features';
import { toastExito, toastError } from '../lib/notify';
import { horariosBase, cierreInt, atiendeFecha, nombreDia, formatHorario } from '../utils/horarios';
import QRPago from './QRPago';

export default function ReservaModal({ cancha, isOpen = true, onClose }) {
  const { user, perfil } = useAuth();
  // seleccion | pago | listo   ('pago' solo existe con FEATURES.PAGOS prendido)
  const [paso, setPaso] = useState('seleccion');
  const [fecha, setFecha] = useState('');
  // Regla EPN: 1 hora por reserva. Ya no se elige, y la base lo valida
  // igual con `trg_validar_reserva_estudiante` (reglas_reserva_epn.sql).
  const duracion = 1;
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHorarios, setFetchingHorarios] = useState(false);
  const [yaReservoHoy, setYaReservoHoy] = useState(false);
  const [bloqueos, setBloqueos] = useState([]);   // cierres del escenario ese día

  // Pago
  const [reservaCreada, setReservaCreada] = useState(null);
  const [pagoCreado, setPagoCreado] = useState(null);
  const [metodo, setMetodo] = useState(PAGO_CONFIG.metodos[0]);
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const HORA_CIERRE = cierreInt(cancha);
  const HORARIOS_BASE = useMemo(() => horariosBase(cancha), [cancha]);
  const atiendeEseDia = atiendeFecha(cancha, fecha);
  const horarioTxt = formatHorario(cancha);

  useEffect(() => {
    if (!fecha || !cancha) return;

    const checkDisponibilidad = async () => {
      setFetchingHorarios(true);
      setHoraSeleccionada('');

      const { data, error } = await supabase
        .from('reservas')
        .select('hora_inicio, hora_fin')
        .eq('cancha_id', cancha.id)
        .eq('fecha', fecha)
        .in('estado', ['pendiente', 'confirmada']);

      if (!error && data) {
        let ocupados = [];
        data.forEach((reserva) => {
          const inicio = parseInt(reserva.hora_inicio.split(':')[0]);
          const fin = parseInt(reserva.hora_fin.split(':')[0]);
          for (let i = inicio; i < fin; i++) {
            ocupados.push(`${i < 10 ? '0' : ''}${i}:00`);
          }
        });
        setHorariosOcupados(ocupados);
      }

      // Cierres del escenario ese día (mantenimiento, clases, eventos).
      // `cancha_id` en null significa "todos los escenarios".
      const { data: blqs } = await supabase
        .from('bloqueos')
        .select('hora_inicio, hora_fin, motivo, cancha_id')
        .or(`cancha_id.is.null,cancha_id.eq.${cancha.id}`)
        .lte('fecha_inicio', fecha)
        .gte('fecha_fin', fecha);
      setBloqueos(blqs || []);

      // Regla EPN: una reserva por día y por estudiante, en cualquier cancha.
      // Se avisa acá para que no llene el formulario al pedo; la que manda es
      // la validación de la base.
      if (user) {
        const { count } = await supabase
          .from('reservas')
          .select('id', { count: 'exact', head: true })
          .eq('perfil_id', user.id)
          .eq('fecha', fecha)
          .in('estado', ['pendiente', 'confirmada', 'completada']);
        setYaReservoHoy((count || 0) > 0);
      }

      setFetchingHorarios(false);
    };

    checkDisponibilidad();
  }, [fecha, cancha, user]);

  /** Devuelve el motivo si esa hora está cerrada por un bloqueo; si no, null. */
  const motivoBloqueo = (horaStr) => {
    const ini = horaStr;
    const finNum = parseInt(horaStr.split(':')[0]) + duracion;
    const fin = `${finNum < 10 ? '0' : ''}${finNum}:00`;
    const b = bloqueos.find((x) => (
      !x.hora_inicio                              // día completo
      || (ini < x.hora_fin && fin > x.hora_inicio) // se pisa con la franja
    ));
    return b ? b.motivo : null;
  };

  const diaCompletoBloqueado = bloqueos.some((b) => !b.hora_inicio);

  const isBloqueOcupado = (horaStr) => {
    const horaNum = parseInt(horaStr.split(':')[0]);
    for (let i = 0; i < duracion; i++) {
      const horaCheck = `${horaNum + i < 10 ? '0' : ''}${horaNum + i}:00`;
      if (horaNum + i > HORA_CIERRE || horariosOcupados.includes(horaCheck)) {
        return true;
      }
    }
    if (motivoBloqueo(horaStr)) {
      return true;
    }
    return false;
  };

  const precioTotal = (cancha?.precio_hora || 0) * duracion;

  // Sanción por ausencias (ver supabase/ausencias_y_sanciones.sql). El dato ya
  // viene en el perfil que carga AuthContext; la base lo valida igual.
  const sancionadoHasta = perfil?.bloqueado_hasta && perfil.bloqueado_hasta >= new Date().toISOString().split('T')[0]
    ? perfil.bloqueado_hasta
    : null;

  // Paso 1 → crea la reserva en estado `pendiente`.
  // Con PAGOS apagado ahí termina: la confirma el admin desde /admin/reservas y
  // el trigger `trg_reserva_confirmada` genera el QR. Con PAGOS prendido, además
  // se crea la solicitud de pago y se pasa a la pantalla del comprobante.
  const handleContinuar = async () => {
    if (!fecha || !horaSeleccionada) return;
    setLoading(true);

    const horaFinNum = parseInt(horaSeleccionada.split(':')[0]) + duracion;
    const horaFinStr = `${horaFinNum < 10 ? '0' : ''}${horaFinNum}:00`;

    const { data: reserva, error } = await supabase
      .from('reservas')
      .insert([{
        perfil_id: user.id,
        cancha_id: cancha.id,
        fecha,
        hora_inicio: horaSeleccionada,
        hora_fin: horaFinStr,
        estado: 'pendiente',
      }])
      .select()
      .single();

    if (error) {
      setLoading(false);
      return toastError('No se pudo crear la reserva: ' + error.message);
    }

    if (!FEATURES.PAGOS) {
      setLoading(false);
      setReservaCreada(reserva);
      setPaso('listo');
      toastExito('Reserva enviada. Te avisamos cuando la confirmen.');
      return;
    }

    const { data: pago, error: errPago } = await createPago({
      reserva_id: reserva.id,
      usuario_id: user.id,
      monto: precioTotal,
      estado: 'pendiente',
    });

    setLoading(false);
    if (errPago) return toastError('Error al generar el pago: ' + errPago.message);

    setReservaCreada(reserva);
    setPagoCreado(pago);
    setPaso('pago');
    toastExito('Reserva creada. Realiza el pago para confirmarla.');
  };

  // Paso 2 → sube el comprobante
  const handleEnviarComprobante = async () => {
    if (!comprobante) return toastError('Selecciona la imagen del comprobante.');
    setSubiendo(true);
    try {
      const ext = comprobante.name.split('.').pop();
      const filePath = `${user.id}/comp-${pagoCreado.id}-${Date.now()}.${ext}`;
      const { error: upError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, comprobante, { upsert: true });
      if (upError) throw upError;

      const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
      const { error: dbError } = await updatePagoComprobante(pagoCreado.id, publicUrl, metodo);
      if (dbError) throw dbError;

      setEnviado(true);
      toastExito('Comprobante enviado. Espera la validación del administrador.');
    } catch (e) {
      toastError('Error al subir el comprobante: ' + e.message);
    } finally {
      setSubiendo(false);
    }
  };

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-md bg-surface-900 border border-line rounded-3xl overflow-hidden shadow-card-hover flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-line bg-surface-950 shrink-0">
              <div className="flex items-center gap-2">
                {paso === 'pago' && !enviado && (
                  <button onClick={() => setPaso('seleccion')} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-300">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h3 className="font-bold text-lg text-ink">
                  {paso === 'seleccion' ? 'Agendar Cancha' : 'Pago de Reserva'}
                </h3>
              </div>
              <button onClick={onClose} className="p-2 bg-surface-800 rounded-full hover:bg-surface-700 transition">
                <X className="w-5 h-5 text-surface-300" />
              </button>
            </div>

            {/* ── PASO 1: SELECCIÓN ── */}
            {paso === 'seleccion' && (
              <>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-surface-800 overflow-hidden border border-line shrink-0">
                      <img src={cancha.imagen_url || 'https://images.unsplash.com/photo-1518605368461-1ee711689bcf?w=500&auto=format&fit=crop&q=60'} alt="Cancha" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-ink text-lg line-clamp-1">{cancha.nombre}</h4>
                      <p className="text-pitch font-semibold">Sin costo <span className="text-sm text-surface-400 font-normal">/ hora</span></p>
                      <p className="text-xs text-surface-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {horarioTxt.diasTxt} · {horarioTxt.horas}</p>
                    </div>
                  </div>

                  <div>
                    <label className="label flex items-center gap-2 text-surface-300"><Calendar className="w-4 h-4" /> Selecciona una fecha</label>
                    <input
                      type="date"
                      min={hoy}
                      className="input cursor-pointer text-ink"
                      value={fecha}
                      onChange={(e) => { setFecha(e.target.value); setHoraSeleccionada(''); }}
                    />
                  </div>

                  {fecha && !atiendeEseDia && (
                    <div className="rounded-xl border border-amber-300 bg-amber-500/10 p-4 text-sm text-amber-700">
                      La cancha no atiende los <b className="capitalize">{nombreDia(fecha)}</b>. Elegí otra fecha.
                    </div>
                  )}

                  {fecha && atiendeEseDia && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-850 p-3.5 text-sm text-surface-300">
                      <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-surface-500" />
                      <span>
                        Cada reserva dura <b className="text-ink">1 hora</b> y podés reservar
                        <b className="text-ink"> una sola por día</b>: los escenarios son
                        compartidos por toda la comunidad.
                      </span>
                    </div>
                  )}

                  {sancionadoHasta && (
                    <div className="rounded-xl border border-red-300 bg-red-500/10 p-4 text-sm text-red-700">
                      <b>Tenés las reservas suspendidas hasta el {sancionadoHasta.split('-').reverse().join('/')}.</b>
                      <br />Fue por no asistir a reservas que habías confirmado. Los escenarios son
                      compartidos: si no vas a usar tu turno, cancelalo con tiempo.
                    </div>
                  )}

                  {diaCompletoBloqueado && (
                    <div className="rounded-xl border border-amber-300 bg-amber-500/10 p-4 text-sm text-amber-700">
                      El escenario está cerrado ese día: <b>{bloqueos.find((b) => !b.hora_inicio)?.motivo}</b>.
                      Elegí otra fecha.
                    </div>
                  )}

                  {yaReservoHoy && (
                    <div className="rounded-xl border border-amber-300 bg-amber-500/10 p-4 text-sm text-amber-700">
                      Ya tenés una reserva para ese día. Elegí otra fecha o cancelá la anterior
                      desde <b>Mis Reservas</b>.
                    </div>
                  )}

                  {fecha && atiendeEseDia && (
                    <div>
                      <label className="label flex items-center gap-2 mb-3 text-surface-300"><Clock className="w-4 h-4" /> Elige tu hora de inicio</label>
                      {fetchingHorarios ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {HORARIOS_BASE.map((hora) => {
                            const ocupado = isBloqueOcupado(hora);
                            const seleccionado = horaSeleccionada === hora;
                            return (
                              <button
                                key={hora}
                                disabled={ocupado}
                                onClick={() => setHoraSeleccionada(hora)}
                                className={`py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                                  ${ocupado ? 'bg-surface-800/30 text-surface-500 border-transparent cursor-not-allowed opacity-50' :
                                    seleccionado ? 'bg-white text-ink border-white shadow-glow-sm' :
                                    'bg-surface-800 text-surface-300 border-line hover:border-surface-500 hover:text-ink'}`}
                              >
                                {hora}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-line bg-surface-950 shrink-0">
                  <div className="flex justify-between items-center mb-4 px-2">
                    {FEATURES.PAGOS ? (
                      <>
                        <span className="text-surface-300 font-medium">Total a pagar:</span>
                        <span className="text-2xl font-bold text-brand-600">${precioTotal.toFixed(2)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-surface-300 font-medium">Uso de la cancha:</span>
                        <span className="text-lg font-bold text-pitch">Sin costo</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleContinuar}
                    disabled={!fecha || !horaSeleccionada || loading || yaReservoHoy || !!sancionadoHasta || diaCompletoBloqueado}
                    className="w-full btn-primary py-4 text-base font-bold tracking-wide"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                      : FEATURES.PAGOS ? 'Continuar al pago' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            )}

            {/* ── PASO 2 (sin cobro): confirmación ── */}
            {paso === 'listo' && (
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="text-center py-8 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-700" />
                  </div>
                  <h3 className="text-xl font-bold text-ink">¡Reserva enviada!</h3>
                  <p className="text-surface-400 text-sm max-w-xs mx-auto">
                    Queda pendiente de aprobación. Cuando el encargado la confirme te avisamos
                    y vas a poder ver tu QR de acceso en el detalle de la reserva.
                  </p>
                  <button onClick={onClose} className="btn-primary mt-2">Entendido</button>
                </div>
              </div>
            )}

            {/* ── PASO 2: PAGO ── */}
            {paso === 'pago' && (
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {enviado ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-green-700" />
                    </div>
                    <h3 className="text-xl font-bold text-ink">¡Comprobante enviado!</h3>
                    <p className="text-surface-400 text-sm max-w-xs mx-auto">
                      Tu pago está en revisión. Cuando el administrador lo apruebe, tu reserva se confirmará y recibirás tu QR de acceso.
                    </p>
                    <button onClick={onClose} className="btn-primary mt-2">Entendido</button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <QRPago monto={precioTotal} referencia={`RES-${reservaCreada?.id}`} />

                    <div>
                      <label className="label">Método de pago usado</label>
                      <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                        {PAGO_CONFIG.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="label">Comprobante de pago</label>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-2xl p-6 cursor-pointer hover:border-brand-500/40 transition-colors">
                        {comprobante ? (
                          <span className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {comprobante.name}</span>
                        ) : (
                          <>
                            <Upload className="w-7 h-7 text-surface-500" />
                            <span className="text-sm text-surface-400">Toca para subir una foto del comprobante</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setComprobante(e.target.files?.[0] || null)} />
                      </label>
                    </div>

                    <button
                      onClick={handleEnviarComprobante}
                      disabled={subiendo || !comprobante}
                      className="w-full btn-primary py-3.5 text-base font-bold"
                    >
                      {subiendo ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Enviar comprobante'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
