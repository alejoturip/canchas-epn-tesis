/**
 * CompletarPerfil.jsx — Pantalla de bienvenida obligatoria.
 *
 * Se muestra en lugar de la app cuando el estudiante recién se registró y le
 * faltan datos. No es decorativa: sin código único y facultad no se sabe quién
 * entra al escenario ni a qué facultad imputarle el uso, que es la métrica del
 * sistema. La base rechaza igual la reserva con el perfil incompleto
 * (`fn_validar_reserva_estudiante`); esto evita que se entere recién ahí.
 *
 * Qué campos son obligatorios: la misma lista que valida el SQL, definida en
 * `utils/perfil.js` para que no se desincronicen.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import MSym from './MSym';
import { useAuth } from '../context/AuthContext';
import { updatePerfil } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { toastExito, toastError } from '../lib/notify';
import { INSTITUCION, FACULTADES, CODIGO_UNICO } from '../config/institucion';
import { esCodigoUnicoValido } from '../utils/validators';
import { MARCA } from '../config/marca';

export default function CompletarPerfil() {
  const { user, perfil, refrescarPerfil, logout } = useAuth();
  const [form, setForm] = useState({
    nombre: perfil?.nombre || '',
    apellido: perfil?.apellido || '',
    codigo_unico: perfil?.codigo_unico || '',
    facultad: perfil?.facultad || '',
    carrera: perfil?.carrera || '',
    telefono: perfil?.telefono || '',
  });
  const [guardando, setGuardando] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const codigoOk = esCodigoUnicoValido(form.codigo_unico, CODIGO_UNICO.digitos);

  const guardar = async (e) => {
    e.preventDefault();
    if (!codigoOk) {
      toastError(`El código único son ${CODIGO_UNICO.digitos} dígitos. Ej: ${CODIGO_UNICO.ejemplo}`);
      return;
    }
    setGuardando(true);
    const { error } = await updatePerfil(user.id, {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      codigo_unico: form.codigo_unico.trim(),
      facultad: form.facultad,
      carrera: form.carrera.trim(),
      telefono: form.telefono.trim() || null,
    });

    if (error) {
      setGuardando(false);
      // 23505 = índice único violado. Es el caso más probable acá: alguien más
      // ya declaró ese código. El mensaje crudo de Postgres no se entiende.
      toastError(error.code === '23505'
        ? 'Ese código único ya está registrado por otra cuenta. Revisá que sea el tuyo.'
        : 'No se pudo guardar: ' + error.message);
      return;
    }

    // El header saluda con el nombre de los metadatos de Auth, no del perfil.
    await supabase.auth.updateUser({ data: { nombre: form.nombre.trim() } });
    await refrescarPerfil();
    setGuardando(false);
    toastExito('¡Listo! Ya podés reservar.');
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 bg-hero-mesh">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg">

        <div className="text-center mb-6">
          <img src={MARCA.logo} alt={MARCA.logoAlt} className="h-24 w-auto object-contain mx-auto mb-4" />
          <h1 className="display-title text-2xl text-ink">Completá tu perfil</h1>
          <p className="text-surface-400 text-sm mt-2 max-w-sm mx-auto">
            Es la primera y única vez. Necesitamos estos datos para identificarte en la puerta
            y llevar el registro de uso de los escenarios de la {INSTITUCION.siglas}.
          </p>
        </div>

        <form onSubmit={guardar} className="card p-6 md:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input required className="input" value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input required className="input" value={form.apellido} onChange={set('apellido')} placeholder="Tu apellido" />
            </div>
          </div>

          <div>
            <label className="label">Código único</label>
            <input
              required
              className={`input font-mono tracking-wider ${form.codigo_unico && !codigoOk ? 'input-error' : ''}`}
              value={form.codigo_unico}
              inputMode="numeric"
              maxLength={CODIGO_UNICO.digitos}
              /* Solo dígitos: se filtra al tipear para que no haya forma de meter otra cosa. */
              onChange={(e) => setForm({ ...form, codigo_unico: e.target.value.replace(/\D/g, '') })}
              placeholder={CODIGO_UNICO.ejemplo}
            />
            <p className={`text-xs mt-1.5 ${form.codigo_unico && !codigoOk ? 'text-red-700' : 'text-surface-500'}`}>
              {form.codigo_unico && !codigoOk
                ? `Son ${CODIGO_UNICO.digitos} dígitos exactos (llevás ${form.codigo_unico.length}).`
                : `${CODIGO_UNICO.digitos} dígitos. El encargado lo compara con tu carné al escanear el QR.`}
            </p>
          </div>

          <div>
            <label className="label">Facultad</label>
            <select required className="input" value={form.facultad} onChange={set('facultad')}>
              <option value="">Elegí tu facultad…</option>
              {FACULTADES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Carrera</label>
            <input required className="input" value={form.carrera} onChange={set('carrera')}
              placeholder="Ej: Ingeniería de Software" />
          </div>

          <div>
            <label className="label">Teléfono <span className="text-surface-500 font-normal">(opcional)</span></label>
            <input className="input" value={form.telefono} onChange={set('telefono')} placeholder="Ej: 0991234567" />
          </div>

          <button type="submit" disabled={guardando || !codigoOk} className="btn-primary w-full py-3.5 text-base mt-2">
            {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MSym name="check" className="text-[20px]" /> Guardar y continuar</>}
          </button>
        </form>

        <button onClick={logout} className="w-full text-center text-sm text-surface-500 hover:text-ink mt-5 transition-colors">
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
