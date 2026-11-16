import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, CalendarClock, Camera, Loader2,
  Pencil, Check, X, CalendarCheck, CheckCircle2, Gift, Star, Crown,
  Trophy, Target, Activity, Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePerfil } from '../hooks/usePerfil';
import { calcularNivel, NIVELES } from '../utils/niveles';
import { formatFecha, iniciales } from '../utils/formatters';
import { toastExito, toastError } from '../lib/notify';
import { PerfilSkeleton } from '../components/Skeletons';
import ActivarNotificaciones from '../components/ActivarNotificaciones';
import { FEATURES } from '../config/features';
import { FACULTADES, CODIGO_UNICO } from '../config/institucion';

export default function Perfil() {
  const { user } = useAuth();
  const { perfil, stats, loading, saving, subiendo, actualizarPerfil, subirAvatar } = usePerfil();
  const fileRef = useRef(null);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', ciudad: '', facultad: '', carrera: '', codigo_unico: '' });

  // Sincronizamos el formulario cuando llega el perfil
  useEffect(() => {
    if (perfil) {
      setForm({
        nombre: perfil.nombre || '',
        apellido: perfil.apellido || '',
        telefono: perfil.telefono || '',
        ciudad: perfil.ciudad || '',
        facultad: perfil.facultad || '',
        carrera: perfil.carrera || '',
        codigo_unico: perfil.codigo_unico || '',
      });
    }
  }, [perfil]);

  const nivel = calcularNivel(stats.puntos);

  const handleGuardar = async () => {
    const { error } = await actualizarPerfil(form);
    if (error) toastError('No se pudo guardar: ' + error.message);
    else {
      toastExito('Perfil actualizado con éxito ✨');
      setEditando(false);
    }
  };

  const handleCancelar = () => {
    if (perfil) {
      setForm({
        nombre: perfil.nombre || '',
        apellido: perfil.apellido || '',
        telefono: perfil.telefono || '',
        ciudad: perfil.ciudad || '',
        facultad: perfil.facultad || '',
        carrera: perfil.carrera || '',
        codigo_unico: perfil.codigo_unico || '',
      });
    }
    setEditando(false);
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toastError('Selecciona una imagen válida.');
    if (file.size > 3 * 1024 * 1024) return toastError('La imagen debe pesar menos de 3 MB.');

    const { error } = await subirAvatar(file);
    if (error) toastError('Error al subir la foto: ' + error.message);
    else toastExito('Foto de perfil actualizada 📸');
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-4 md:p-8"><PerfilSkeleton /></div>;
  }

  const avatarUrl = perfil?.avatar_url || user?.user_metadata?.avatar_url;
  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Jugador';
  const fechaRegistro = perfil?.created_at || user?.created_at;

  // Sin `flag` la tarjeta siempre se ve; con flag, solo si ese módulo está prendido.
  const tarjetasStats = [
    { label: 'Total Reservas',    valor: stats.totalReservas, icon: CalendarCheck, color: 'text-brand-600',  bg: 'bg-brand-500/10' },
    { label: 'Completadas',       valor: stats.completadas,   icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-500/10' },
    { label: 'Premios Obtenidos', valor: stats.premios,       icon: Gift,          color: 'text-accent-light', bg: 'bg-accent/10',     flag: 'FIDELIZACION' },
    { label: 'Torneos Inscrito',  valor: stats.torneos,       icon: Trophy,        color: 'text-purple-300', bg: 'bg-purple-500/10', flag: 'TORNEOS'      },
    { label: 'Puntos Acumulados', valor: stats.puntos,        icon: Star,          color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   flag: 'FIDELIZACION' },
  ].filter((t) => !t.flag || FEATURES[t.flag]);

  const prox = stats.proximaReserva;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-8"
    >
      {/* ── Cabecera de perfil ── */}
      <div className="card relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
        <div className={`absolute inset-0 bg-gradient-to-br ${nivel.actual.gradient} opacity-[0.07] pointer-events-none`} />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className={`w-28 h-28 rounded-full overflow-hidden bg-surface-900 border-2 border-line ring-4 ${nivel.actual.ring} flex items-center justify-center shadow-glow-md`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold gradient-text">
                  {iniciales(nombreCompleto)}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              className="absolute bottom-0 right-0 p-2.5 bg-brand-500 hover:bg-brand-400 rounded-full text-white shadow-glow-sm transition-all disabled:opacity-60"
              title="Cambiar foto"
            >
              {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          {/* Nombre + nivel */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-ink">{nombreCompleto}</h1>
            <p className="text-surface-400 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-4 h-4" /> {perfil?.email || user?.email}
            </p>
            {FEATURES.FIDELIZACION && (
              <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${nivel.actual.badge}`}>
                <Crown className="w-3.5 h-3.5" /> Nivel {nivel.actual.nombre}
              </span>
            )}
          </div>

          {/* Botón editar */}
          {!editando && (
            <button onClick={() => setEditando(true)} className="btn-secondary">
              <Pencil className="w-4 h-4" /> Editar Perfil
            </button>
          )}
        </div>
      </div>

      {/* ── Avisos push (pago aprobado, reserva confirmada) ── */}
      {FEATURES.PUSH && <ActivarNotificaciones />}

      {/* ── Estadísticas ── */}
      <div>
        <h2 className="section-title text-xl mb-4">Estadísticas</h2>
        {/* La grilla se adapta a cuántas tarjetas quedaron según los flags */}
        <div className={`grid grid-cols-2 gap-4 ${
          { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[tarjetasStats.length] || 'lg:grid-cols-5'
        }`}>
          {tarjetasStats.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card p-5 flex flex-col gap-3"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.bg}`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-ink">{t.valor}</p>
                <p className="text-xs text-surface-400 mt-0.5">{t.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Próxima reserva ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <CalendarClock className="w-6 h-6 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-surface-400">Próxima reserva</p>
          {prox ? (
            <p className="text-ink font-semibold truncate">
              {formatFecha(prox.fecha, 'long')} · {prox.hora_inicio?.substring(0, 5)} · {prox.canchas?.nombre}
            </p>
          ) : (
            <p className="text-surface-500 text-sm">No tienes reservas próximas</p>
          )}
        </div>
      </motion.div>

      {/* ── Sistema de niveles ── (apagado en la versión tesis) */}
      {FEATURES.FIDELIZACION && (
      <div className="card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title text-xl">Sistema de Niveles</h2>
          <span className="text-sm text-surface-400">{stats.puntos} puntos</span>
        </div>

        {/* Insignias */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {NIVELES.map((n, i) => {
            const desbloqueado = i <= nivel.indice;
            const esActual = i === nivel.indice;
            return (
              <div
                key={n.nombre}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all
                  ${esActual ? `${n.badge} scale-[1.03]` : desbloqueado ? 'border-line bg-surface-850' : 'border-line bg-surface-900 opacity-40'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${n.gradient} ${desbloqueado ? '' : 'grayscale'}`}>
                  <Crown className="w-6 h-6 text-ink drop-shadow" />
                </div>
                <span className={`text-xs font-semibold ${desbloqueado ? 'text-ink' : 'text-surface-500'}`}>{n.nombre}</span>
                <span className="text-[10px] text-surface-500">{n.min}+ pts</span>
              </div>
            );
          })}
        </div>

        {/* Progreso al siguiente nivel */}
        {nivel.esMaximo ? (
          <div className="text-center py-2">
            <p className="text-accent-light font-semibold flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" /> ¡Alcanzaste el nivel máximo, leyenda!
            </p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-300">
                Progreso a <strong className="text-ink">{nivel.siguiente.nombre}</strong>
              </span>
              <span className="text-surface-400">
                Te faltan <strong className="text-ink">{nivel.puntosParaSiguiente}</strong> pts
              </span>
            </div>
            <div className="w-full bg-surface-900 rounded-full h-3 border border-line overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${nivel.progreso}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-3 rounded-full bg-gradient-to-r ${nivel.siguiente.gradient}`}
              />
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Información personal ── */}
      <div className="card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title text-xl">Información Personal</h2>
          {editando && (
            <div className="flex gap-2">
              <button onClick={handleCancelar} className="btn-ghost btn-sm" disabled={saving}>
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={handleGuardar} className="btn-primary btn-sm" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Campo icon={User} label="Nombre" editando={editando}
            value={form.nombre} display={perfil?.nombre}
            onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Tu nombre" />

          <Campo icon={User} label="Apellido" editando={editando}
            value={form.apellido} display={perfil?.apellido}
            onChange={(v) => setForm({ ...form, apellido: v })} placeholder="Tu apellido" />

          <Campo icon={Phone} label="Teléfono" editando={editando}
            value={form.telefono} display={perfil?.telefono}
            onChange={(v) => setForm({ ...form, telefono: v })} placeholder="Ej: 0991234567" />

          <Campo icon={MapPin} label="Ciudad" editando={editando}
            value={form.ciudad} display={perfil?.ciudad}
            onChange={(v) => setForm({ ...form, ciudad: v })} placeholder="Tu ciudad" />

          {/* Correo (no editable) */}
          <Campo icon={Mail} label="Correo" editando={false}
            display={perfil?.email || user?.email} />

          {/* Fecha de registro (no editable) */}
          <Campo icon={CalendarClock} label="Miembro desde" editando={false}
            display={fechaRegistro ? formatFecha(fechaRegistro, 'long') : '—'} />
        </div>
      </div>

      {/* ── Información académica ──
          Reemplazó a "Información Deportiva" (posición favorita / nivel de
          juego), que venía de la app comercial de fútbol. `facultad` es lo que
          habilita el reporte de uso de escenarios por facultad. */}
      <div className="card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h2 className="section-title text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-600" /> Información Académica
          </h2>
          {editando && <span className="text-xs text-surface-500">Se guarda con tu información personal</span>}
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <CampoSelect icon={Target} label="Facultad" editando={editando}
            value={form.facultad} display={perfil?.facultad}
            onChange={(v) => setForm({ ...form, facultad: v })}
            opciones={FACULTADES} />

          <Campo icon={Activity} label="Carrera" editando={editando}
            value={form.carrera} display={perfil?.carrera}
            onChange={(v) => setForm({ ...form, carrera: v })}
            placeholder="Ej: Ingeniería de Software" />

          <Campo icon={Hash} label="Código único" editando={editando}
            value={form.codigo_unico} display={perfil?.codigo_unico}
            onChange={(v) => setForm({ ...form, codigo_unico: v.replace(/\D/g, '').slice(0, CODIGO_UNICO.digitos) })}
            placeholder={CODIGO_UNICO.ejemplo} />
        </div>
        <p className="text-xs text-surface-500 mt-4">
          El código son {CODIGO_UNICO.digitos} dígitos y no se puede repetir entre cuentas. Lo declarás
          vos: no se valida contra ningún sistema de la EPN. Sirve para que el encargado lo
          contraste con tu carné al escanear el QR en la puerta.
        </p>
      </div>
    </motion.div>
  );
}

/** Campo de selección reutilizable: muestra texto o un <select> según el modo edición. */
function CampoSelect({ icon: Icon, label, editando, value, display, onChange, opciones }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-surface-500" /> {label}
      </label>
      {editando ? (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecciona…</option>
          {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <p className="px-4 py-3 bg-surface-850 border border-line rounded-xl text-sm text-ink min-h-[46px] flex items-center">
          {display || <span className="text-surface-500">No especificado</span>}
        </p>
      )}
    </div>
  );
}

/** Campo reutilizable: muestra texto o input según el modo edición. */
function Campo({ icon: Icon, label, editando, value, display, onChange, placeholder }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-surface-500" /> {label}
      </label>
      {editando ? (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className="px-4 py-3 bg-surface-850 border border-line rounded-xl text-sm text-ink min-h-[46px] flex items-center">
          {display || <span className="text-surface-500">No especificado</span>}
        </p>
      )}
    </div>
  );
}
