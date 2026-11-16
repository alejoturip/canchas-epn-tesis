import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MSym from '../components/MSym';
import { esEmailValido, esCorreoDeDominio } from '../utils/validators';
import { INSTITUCION, CORREO_SUFIJO } from '../config/institucion';
import { MARCA } from '../config/marca';

/** A dónde va cada rol al entrar. El guardia solo tiene la pantalla de escanear. */
const destinoSegunRol = (rol) =>
  rol === 'admin' ? '/admin' : rol === 'guardia' ? '/admin/validar' : '/';

// Sistema de uso interno: no hay registro abierto ni captación de clientes.
const FEATURES = [
  { icon: 'event_available',     titulo: 'Reserva en línea',  desc: 'Elegí cancha, día y hora desde el celular.' },
  { icon: 'verified',            titulo: 'Sin costo',         desc: 'El encargado aprueba tu reserva y listo.' },
  { icon: 'confirmation_number', titulo: 'Acceso con QR',     desc: 'Entrá mostrando tu código en la puerta.' },
  { icon: 'sports_soccer',       titulo: 'Implementos',       desc: 'Pedí prestado el material para tu partido.' },
];

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Vista: Login | Registro | Recuperar clave
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);

  // Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [nombre, setNombre] = useState('');
  const [verPass, setVerPass] = useState(false); // toggle ver/ocultar contraseña

  // Estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Redirección automática si ya hay sesión
  useEffect(() => {
    const redirigirPorRol = async () => {
      if (user) {
        const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
        navigate(destinoSegunRol(data?.rol));
      }
    };
    redirigirPorRol();
  }, [user, navigate]);

  const limpiarMsgs = () => { setError(null); setMensaje(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    limpiarMsgs();

    try {
      // Validación de correo real (formato) en registro y recuperación
      if ((!isLogin || isReset) && !esEmailValido(email)) {
        throw new Error('Ingresa un correo electrónico válido.');
      }

      // CASO 1: Recuperar contraseña
      if (isReset) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/actualizar-password`,
        });
        if (resetError) throw resetError;
        setMensaje('¡Listo! Revisa tu correo (y la carpeta de spam) para restablecer tu contraseña.');
        return;
      }

      // CASO 2: Iniciar sesión
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', authData.user.id).single();
        navigate(destinoSegunRol(perfil?.rol));
        return;
      }

      // CASO 3: Registro
      // La regla de verdad la aplica el trigger sobre auth.users; esto es para
      // que el estudiante se entere acá y no con un error genérico del servidor.
      if (!esCorreoDeDominio(email, INSTITUCION.dominio)) {
        throw new Error(`Usá tu correo institucional ${CORREO_SUFIJO} para crear la cuenta.`);
      }
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (password !== confirmar) throw new Error('Las contraseñas no coinciden.');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre }, emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;

      // Si la confirmación de correo está activada, no hay sesión todavía
      if (!authData.session) {
        setMensaje('¡Cuenta creada! Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja (y el spam).');
        setIsLogin(true);
        setPassword(''); setConfirmar('');
        return;
      }

      // Sin confirmación: ya hay sesión → guardamos el nombre y entramos
      if (authData.user) {
        await supabase.from('perfiles').update({ nombre }).eq('id', authData.user.id);
      }
      navigate('/');
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const tituloForm = isReset ? 'Recuperar acceso' : isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta';
  const subtituloForm = isReset
    ? 'Recupera el acceso a tu cuenta'
    : isLogin ? 'Ingresá para gestionar tus reservas' : `Con tu correo ${CORREO_SUFIJO}`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2" style={{ background: '#FFFFFF' }}>

      {/* ── Panel de marca (solo desktop) ── */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'radial-gradient(120% 90% at 18% 18%, #1E3E72, #16305C 55%, #102A43)' }}
      >
        {/* Líneas de cancha diagonales muy sutiles */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'repeating-linear-gradient(115deg, transparent 0 46px, rgba(255,255,255,.02) 46px 47px)' }}
        />
        {/* Halo rojo difuso arriba a la derecha */}
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-brand-600/25 blur-[120px] animate-pulse-slow pointer-events-none" />

        {/* Logo */}
        <div className="relative">
          <img src={MARCA.logo} alt={MARCA.logoAlt} className="h-44 w-auto object-contain" />
        </div>

        {/* Pitch + features */}
        <div className="relative space-y-8 max-w-md">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90">
            <span className="w-2 h-2 rounded-full bg-pitch animate-pulse" /> Acceso con correo {CORREO_SUFIJO}
          </span>

          <h2 className="display-title text-5xl text-white">
            Las canchas de tu <span className="text-brand-500">universidad</span>
          </h2>
          <p className="text-white/80 -mt-3">
            Reservá los escenarios deportivos de la {INSTITUCION.siglas}, pedí prestados los
            implementos y entrá mostrando tu código de acceso. Todo desde el celular.
          </p>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-5">
            {FEATURES.map((f) => (
              <li key={f.titulo} className="flex items-start gap-3">
                <span className="icon-chip bg-brand-500/15 border border-brand-300">
                  <MSym name={f.icon} className="text-brand-600 text-[22px]" />
                </span>
                <div>
                  <p className="font-bold text-white text-sm">{f.titulo}</p>
                  <p className="text-xs text-white/70 leading-snug">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Pie institucional */}
        <div className="relative">
          <div className="glass-dark rounded-2xl p-5 flex items-center gap-4">
            <MSym name="school" className="text-white/80 text-[28px] flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white">{INSTITUCION.nombre}</p>
              <p className="text-sm text-white/70">Sistema de uso interno para la comunidad politécnica.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Formulario ── */}
      <main className="flex items-center justify-center p-4 sm:p-8 bg-hero-mesh lg:bg-none min-h-screen lg:min-h-0">
        <div className="w-full max-w-md animate-slide-up">

        {/* Cabecera / Logo */}
        <div className="text-center lg:text-left mb-8">
          <img src={MARCA.logo} alt={MARCA.logoAlt} className="h-24 sm:h-28 w-auto object-contain mx-auto mb-5 lg:hidden" />
          <h2 className="display-title text-3xl lg:text-4xl text-ink mb-1">{tituloForm}</h2>
          <p className="text-surface-400">{subtituloForm}</p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="card p-8" style={{ background: '#FFFFFF' }}>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-300 rounded-xl text-red-700 text-sm text-center flex items-center justify-center gap-2">
              <MSym name="error" className="text-[18px]" /> {error}
            </div>
          )}
          {mensaje && (
            <div className="mb-6 p-4 bg-pitch/10 border border-pitch/40 rounded-xl text-pitch text-sm text-center flex items-center justify-center gap-2">
              <MSym name="check_circle" className="text-[18px]" /> {mensaje}
            </div>
          )}

          {/* Acceso restringido: se avisa antes de que llene el formulario */}
          {!isLogin && !isReset && (
            <div className="mb-6 p-3.5 rounded-xl bg-surface-850 border border-line flex items-start gap-3">
              <MSym name="school" className="text-surface-300 text-[20px] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-surface-300 leading-snug">
                Solo se puede crear una cuenta con el correo institucional
                <b className="text-ink"> {CORREO_SUFIJO}</b>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre (solo registro) */}
            {!isLogin && !isReset && (
              <div>
                <label className="label">Nombre completo</label>
                <div className="relative">
                  <MSym name="person" className="absolute left-4 top-3.5 text-surface-500 text-[20px]" />
                  <input type="text" required className="input pl-12" placeholder="Juan Pérez"
                    value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
              </div>
            )}

            {/* Correo */}
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <MSym name="mail" className="absolute left-4 top-3.5 text-surface-500 text-[20px]" />
                <input type="email" required className="input pl-12" placeholder={`usuario${CORREO_SUFIJO}`}
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Contraseña (oculto en recuperar) */}
            {!isReset && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-surface-300">Contraseña</label>
                  {isLogin && (
                    <button type="button" onClick={() => { setIsReset(true); limpiarMsgs(); }}
                      className="text-xs text-brand-600 hover:text-brand-600 transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <MSym name="lock" className="absolute left-4 top-3.5 text-surface-500 text-[20px]" />
                  <input type={verPass ? 'text' : 'password'} required className="input pl-12 pr-12" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                  <BotonVerPass ver={verPass} onClick={() => setVerPass((v) => !v)} />
                </div>
              </div>
            )}

            {/* Confirmar contraseña (solo registro) */}
            {!isLogin && !isReset && (
              <div>
                <label className="label">Confirmar contraseña</label>
                <div className="relative">
                  <MSym name="lock" className="absolute left-4 top-3.5 text-surface-500 text-[20px]" />
                  <input type={verPass ? 'text' : 'password'} required className="input pl-12 pr-12" placeholder="Repite tu contraseña"
                    value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                  <BotonVerPass ver={verPass} onClick={() => setVerPass((v) => !v)} />
                </div>
                {confirmar && password !== confirmar && (
                  <p className="text-xs text-red-700 mt-1.5">Las contraseñas no coinciden.</p>
                )}
              </div>
            )}

            {/* Botón principal */}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
              {loading ? <span className="animate-pulse">Procesando...</span>
                : isReset ? <><MSym name="key" className="text-[20px]" /> Enviar Enlace</>
                : isLogin ? <><MSym name="login" className="text-[20px]" /> Iniciar Sesión</>
                : <><MSym name="person_add" className="text-[20px]" /> Crear Cuenta</>}
            </button>
          </form>

          {/* Navegación entre vistas */}
          <div className="mt-6 text-center">
            {isReset ? (
              <button onClick={() => { setIsReset(false); limpiarMsgs(); }}
                className="inline-flex items-center gap-2 text-surface-400 hover:text-ink transition-colors text-sm font-medium">
                <MSym name="arrow_back" className="text-[18px]" /> Volver a Iniciar Sesión
              </button>
            ) : (
              <button onClick={() => { setIsLogin(!isLogin); limpiarMsgs(); setPassword(''); setConfirmar(''); }}
                className="text-surface-400 hover:text-ink transition-colors text-sm font-medium">
                {isLogin
                  ? <>¿No tenés cuenta? <span className="text-brand-600 font-semibold">Registrate</span></>
                  : <>¿Ya tenés cuenta? <span className="text-brand-600 font-semibold">Iniciá sesión</span></>}
              </button>
            )}
          </div>

        </div>

        {/* Nota legal */}
        <p className="text-center text-xs text-surface-500 mt-5">
          Al continuar aceptás nuestros Términos y la Política de privacidad.
        </p>

        </div>
      </main>
    </div>
  );
}

/** Toggle de ver/ocultar contraseña con íconos Material Symbols. */
function BotonVerPass({ ver, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
      aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-400 hover:text-ink hover:bg-surface-850 transition-all"
    >
      <MSym name={ver ? 'visibility_off' : 'visibility'} className="text-[20px]" />
    </button>
  );
}
