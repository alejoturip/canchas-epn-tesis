/**
 * UsuariosAdmin.jsx — Personal, estudiantes y política de sanciones.
 *
 * Tres cosas en una pantalla porque están relacionadas:
 *   · El interruptor de sanciones (y sus dos números).
 *   · Los guardias: crearlos, activarlos, desactivarlos.
 *   · Los estudiantes: ver sus ausencias y levantar o aplicar una sanción.
 *
 * 🔴 Por qué las sanciones arrancan APAGADAS: la ausencia se deduce de que
 * nadie escaneó el QR. Sin un guardia en la puerta, TODAS las reservas se
 * leerían como ausencia y se sancionaría a gente que sí fue. El interruptor se
 * prende recién cuando haya alguien validando.
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, X, ShieldCheck, ShieldOff } from 'lucide-react';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { toastExito, toastError } from '../../lib/notify';
import { supabaseAlta } from '../../lib/supabaseAlta';
import { CORREO_SUFIJO } from '../../config/institucion';
import {
  getConfiguracion, updateConfiguracion, getEstudiantes, getPersonal,
  levantarSancion, aplicarSancion, setPersonalActivo, setRol,
} from '../../services/supabaseService';

const hoy = () => new Date().toISOString().split('T')[0];
const fmt = (f) => (f ? f.split('-').reverse().join('/') : null);
const sancionado = (p) => p.bloqueado_hasta && p.bloqueado_hasta >= hoy();

export default function UsuariosAdmin() {
  const [tab, setTab] = useState('personal');
  const [cfg, setCfg] = useState(null);
  const [personal, setPersonal] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    const [{ data: c }, { data: p }, { data: e }] = await Promise.all([
      getConfiguracion(), getPersonal(), getEstudiantes(),
    ]);
    setCfg(c);
    setPersonal(p || []);
    setEstudiantes(e || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarCfg = async (cambios) => {
    setCfg({ ...cfg, ...cambios });          // optimista: el switch responde al toque
    const { error } = await updateConfiguracion(cambios);
    if (error) { toastError('No se pudo guardar: ' + error.message); cargar(); return; }
    toastExito('Configuración actualizada');
  };

  const filtrados = estudiantes.filter((e) => {
    if (!busqueda) return true;
    const t = `${e.nombre || ''} ${e.apellido || ''} ${e.email || ''} ${e.codigo_unico || ''}`.toLowerCase();
    return t.includes(busqueda.toLowerCase());
  });

  const sancionados = estudiantes.filter(sancionado).length;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Usuarios y sanciones</h1>
        <p className="text-surface-400 text-sm mt-1">Personal de puerta, estudiantes y política de uso.</p>
      </div>

      {/* ── El interruptor ── */}
      <div className={`card p-5 border-l-4 ${cfg?.sanciones_activas ? 'border-l-pitch' : 'border-l-amber-400'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <MSym name={cfg?.sanciones_activas ? 'gavel' : 'pause_circle'} className="text-[20px]" />
              Sanciones automáticas · {cfg?.sanciones_activas ? 'ACTIVAS' : 'APAGADAS'}
            </h2>
            <p className="text-sm text-surface-400 mt-1.5 max-w-2xl">
              {cfg?.sanciones_activas ? (
                <>
                  Las reservas confirmadas a las que nadie asistió se marcan como ausencia.
                  A las <b className="text-ink">{cfg.ausencias_umbral}</b> ausencias, el estudiante
                  no puede reservar por <b className="text-ink">{cfg.dias_sancion}</b> días.
                </>
              ) : (
                <>
                  <b className="text-amber-700">Dejalas apagadas hasta que haya un guardia escaneando.</b> La
                  ausencia se detecta porque nadie validó el QR: sin alguien en la puerta,
                  todas las reservas se leerían como ausencia y se sancionaría a gente que sí fue.
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => guardarCfg({ sanciones_activas: !cfg?.sanciones_activas })}
            className={cfg?.sanciones_activas ? 'btn-secondary' : 'btn-primary'}
          >
            {cfg?.sanciones_activas
              ? <><ShieldOff className="w-4 h-4" /> Apagar</>
              : <><ShieldCheck className="w-4 h-4" /> Activar</>}
          </button>
        </div>

        {cfg?.sanciones_activas && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-line max-w-md">
            <div>
              <label className="label">Ausencias para sancionar</label>
              <input type="number" min="1" className="input" value={cfg.ausencias_umbral}
                onChange={(e) => setCfg({ ...cfg, ausencias_umbral: Number(e.target.value) })}
                onBlur={(e) => guardarCfg({ ausencias_umbral: Math.max(1, Number(e.target.value)) })} />
            </div>
            <div>
              <label className="label">Días de sanción</label>
              <input type="number" min="1" className="input" value={cfg.dias_sancion}
                onChange={(e) => setCfg({ ...cfg, dias_sancion: Number(e.target.value) })}
                onBlur={(e) => guardarCfg({ dias_sancion: Math.max(1, Number(e.target.value)) })} />
            </div>
          </div>
        )}
      </div>

      {/* ── Pestañas ── */}
      <div className="flex gap-2 border-b border-line">
        <Tab activo={tab === 'personal'} onClick={() => setTab('personal')} icon="badge">
          Personal ({personal.length})
        </Tab>
        <Tab activo={tab === 'estudiantes'} onClick={() => setTab('estudiantes')} icon="school"
          badge={sancionados || null}>
          Estudiantes ({estudiantes.length})
        </Tab>
      </div>

      {tab === 'personal' ? (
        <>
          <div className="flex justify-between items-center gap-3">
            <AyudaBox id="guardias" titulo="¿Qué hace un guardia?" icon="badge">
              <ul className="space-y-1.5">
                <li className="flex gap-2"><MSym name="qr_code_scanner" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Entra a la app y <b className="text-ink">solo ve la pantalla de escanear el QR</b>. No accede a reservas, canchas ni estudiantes.</span></li>
                <li className="flex gap-2"><MSym name="mail" className="text-gold text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Al crearle la cuenta le llega un <b className="text-ink">correo de confirmación</b>: tiene que abrirlo antes de poder entrar.</span></li>
                <li className="flex gap-2"><MSym name="toggle_off" className="text-surface-500 text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1"><b className="text-ink">Desactivar</b> le quita el acceso sin borrarle la cuenta.</span></li>
              </ul>
            </AyudaBox>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setModal(true)} className="btn-primary">
              <Plus className="w-5 h-5" /> Nuevo guardia
            </button>
          </div>

          <div className="space-y-3">
            {personal.map((p) => (
              <div key={p.id} className="card p-4 flex flex-wrap items-center gap-3">
                <div className={`icon-chip ${p.rol === 'admin' ? 'bg-brand-500/15 text-brand-600' : 'bg-cat-blue/15 text-cat-blue'}`}>
                  <MSym name={p.rol === 'admin' ? 'shield_person' : 'badge'} className="text-[22px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{p.nombre || 'Sin nombre'}</p>
                  <p className="text-sm text-surface-400 truncate">{p.email}</p>
                </div>
                <span className={p.rol === 'admin' ? 'badge-brand' : 'badge-gray'}>
                  {p.rol === 'admin' ? 'Administrador' : 'Guardia'}
                </span>
                {p.rol === 'guardia' && (
                  <>
                    <span className={p.activo ? 'badge-green' : 'badge-red'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      onClick={async () => {
                        const { error } = await setPersonalActivo(p.id, !p.activo);
                        if (error) toastError(error.message);
                        else { toastExito(p.activo ? 'Guardia desactivado' : 'Guardia activado'); cargar(); }
                      }}
                      className="btn-ghost btn-sm"
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="relative max-w-md">
            <MSym name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-[20px]" />
            <input className="input pl-11" placeholder="Buscar por nombre, correo o código…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          {filtrados.length === 0 ? (
            <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
              {estudiantes.length === 0 ? 'Todavía no hay estudiantes registrados.' : 'Nadie coincide con esa búsqueda.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtrados.map((e) => (
                <FilaEstudiante key={e.id} e={e} onCambio={cargar} dias={cfg?.dias_sancion || 15} />
              ))}
            </div>
          )}
        </>
      )}

      {modal && <ModalNuevoGuardia onClose={() => setModal(false)} onCreado={cargar} />}
    </div>
  );
}

/* ─────────────────────────────── Estudiante ────────────────────────────── */

function FilaEstudiante({ e, onCambio, dias }) {
  const [procesando, setProcesando] = useState(false);
  const bloqueado = sancionado(e);

  const accion = async (fn, msg) => {
    setProcesando(true);
    const { error } = await fn();
    setProcesando(false);
    if (error) toastError(error.message);
    else { toastExito(msg); onCambio(); }
  };

  const hastaEnDias = () => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className={`card p-4 flex flex-wrap items-center gap-3 ${bloqueado ? 'border-l-4 border-l-red-400' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink truncate">
          {[e.nombre, e.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
        </p>
        <p className="text-sm text-surface-400 truncate">
          {e.codigo_unico ? <span className="font-mono">{e.codigo_unico}</span> : 'Sin código'}
          {e.facultad ? ` · ${e.facultad}` : ''}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xs text-surface-500">Ausencias</p>
        <p className="font-bold text-ink">
          {e.ausencias}
          {e.ausencias_totales > e.ausencias && (
            <span className="text-xs text-surface-500 font-normal"> ({e.ausencias_totales} histórico)</span>
          )}
        </p>
      </div>

      {bloqueado ? (
        <>
          <span className="badge-red">Suspendido hasta {fmt(e.bloqueado_hasta)}</span>
          <button disabled={procesando} className="btn-secondary btn-sm"
            onClick={() => accion(() => levantarSancion(e.id), 'Sanción levantada')}>
            Levantar
          </button>
        </>
      ) : (
        <button disabled={procesando} className="btn-ghost btn-sm text-red-700"
          onClick={() => {
            if (!window.confirm(`¿Suspender las reservas de este estudiante por ${dias} días?`)) return;
            accion(() => aplicarSancion(e.id, hastaEnDias()), 'Sanción aplicada');
          }}>
          Sancionar
        </button>
      )}
    </div>
  );
}

/* ────────────────────────── Alta de guardia ────────────────────────────── */

function ModalNuevoGuardia({ onClose, onCreado }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [creando, setCreando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toastError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setCreando(true);

    // Se usa un cliente aparte para no perder la sesión del admin (ver lib/supabaseAlta.js)
    const { data, error } = await supabaseAlta.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { nombre: form.nombre.trim() } },
    });

    if (error || !data?.user) {
      setCreando(false);
      toastError(
        /already/i.test(error?.message || '')
          ? 'Ya existe una cuenta con ese correo.'
          : 'No se pudo crear la cuenta: ' + (error?.message || 'error desconocido')
      );
      return;
    }

    // El trigger `al_registrar_usuario` ya creó el perfil con rol 'cliente';
    // acá se lo asciende. El admin sí puede: lo permite `proteger_rol_perfil`.
    const { error: errRol } = await setRol(data.user.id, 'guardia');
    setCreando(false);

    if (errRol) {
      toastError('La cuenta se creó pero no se pudo asignar el rol: ' + errRol.message);
      return;
    }
    toastExito('Guardia creado. Tiene que confirmar su correo para poder entrar.');
    onClose();
    onCreado();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-surface-800 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-card-hover">
        <div className="flex justify-between items-center p-5 border-b border-line flex-shrink-0">
          <h2 className="text-lg font-bold text-ink">Nuevo guardia</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-850 text-surface-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={crear} id="form-guardia" className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input required className="input" value={form.nombre}
              onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} placeholder="Nombre del encargado" />
          </div>
          <div>
            <label className="label">Correo institucional</label>
            <input required type="email" className="input" value={form.email}
              onChange={(ev) => setForm({ ...form, email: ev.target.value })}
              placeholder={`guardia${CORREO_SUFIJO}`} />
            <p className="text-xs text-surface-500 mt-1.5">
              Tiene que ser <b>{CORREO_SUFIJO}</b>. Si no lo es, agregalo antes a
              <code className="mx-1">correos_autorizados</code> desde el SQL Editor.
            </p>
          </div>
          <div>
            <label className="label">Contraseña provisional</label>
            <input required type="text" className="input font-mono" value={form.password}
              onChange={(ev) => setForm({ ...form, password: ev.target.value })}
              placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-surface-500 mt-1.5">
              Puede cambiarla después desde "¿Olvidaste tu contraseña?".
            </p>
          </div>

        
        </form>

        <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 btn-ghost">Cancelar</button>
          <button type="submit" form="form-guardia" disabled={creando} className="flex-1 btn-primary">
            {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear guardia'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tab({ activo, onClick, icon, badge, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        activo ? 'border-brand-500 text-ink' : 'border-transparent text-surface-400 hover:text-surface-200'}`}>
      <MSym name={icon} className="text-[18px]" fill={activo} /> {children}
      {badge ? <span className="badge-red text-[10px]">{badge}</span> : null}
    </button>
  );
}
