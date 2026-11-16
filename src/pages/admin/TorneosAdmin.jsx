import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { TIPOS_TORNEO } from '../../utils/torneos';
import { getTorneos, crearTorneo, actualizarTorneo, eliminarTorneo } from '../../services/torneosService';
import { toastExito, toastError } from '../../lib/notify';

const ESTADOS = [
  { value: 'abierto',    label: 'Inscripciones Abiertas', color: 'badge-green' },
  { value: 'en_curso',   label: 'En Curso',               color: 'badge-brand' },
  { value: 'finalizado', label: 'Finalizado',             color: 'badge-gray'  },
];

const FORM_INICIAL = {
  id: null, nombre: '', descripcion: '', tipo: 'liga', categoria: '',
  fecha_inicio: '', max_equipos: '', costo_inscripcion: '', premio: '', reglas: '', estado: 'abierto',
};

const tipoLabel = (v) => TIPOS_TORNEO.find((t) => t.value === v)?.label || v;
const estadoInfo = (v) => ESTADOS.find((e) => e.value === v) || ESTADOS[0];

export default function TorneosAdmin() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try { setTorneos(await getTorneos()); }
    catch (e) { toastError('Error al cargar: ' + e.message); }
    setLoading(false);
  };

  const abrirModal = (torneo = null) => {
    setFormData(torneo
      ? { ...FORM_INICIAL, ...torneo, fecha_inicio: torneo.fecha_inicio ? torneo.fecha_inicio.slice(0, 10) : '' }
      : FORM_INICIAL);
    setShowModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    const datos = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      tipo: formData.tipo,
      categoria: formData.categoria || null,
      fecha_inicio: formData.fecha_inicio || null,
      max_equipos: formData.max_equipos ? parseInt(formData.max_equipos) : null,
      costo_inscripcion: formData.costo_inscripcion ? Number(formData.costo_inscripcion) : 0,
      premio: formData.premio,
      reglas: formData.reglas || null,
      estado: formData.estado,
    };
    try {
      if (formData.id) await actualizarTorneo(formData.id, datos);
      else await crearTorneo(datos);
      toastExito(formData.id ? 'Torneo actualizado' : 'Torneo creado');
      setShowModal(false);
      cargar();
    } catch (err) { toastError('Error: ' + err.message); }
    setProcesando(false);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este torneo? Se borran también equipos y partidos.')) return;
    try { await eliminarTorneo(id); cargar(); } catch (e) { toastError(e.message); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-title text-3xl text-ink flex items-center gap-2">
            <MSym name="trophy" className="text-cat-violet text-[28px]" fill /> Gestión de Torneos
          </h1>
          <p className="text-surface-400 text-sm mt-1">Creá ligas, relámpagos y eliminatorias.</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary">
          <MSym name="add" className="text-[20px]" /> Nuevo Torneo
        </button>
      </div>

      <AyudaBox id="torneos_lista" titulo="¿Cómo armar un torneo?" icon="trophy">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="add_circle" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Nuevo Torneo</b> y elegí el <b className="text-ink">tipo</b> (liga, eliminación, relámpago o grupos), premio y costo.</span></li>
          <li className="flex gap-2"><MSym name="settings" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Entrá a <b className="text-ink">Gestionar</b> para aprobar equipos, generar el fixture y cargar resultados.</span></li>
          <li className="flex gap-2"><MSym name="visibility" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Los clientes ven el torneo, la tabla y las llaves en la sección <b className="text-ink">Torneos</b>.</span></li>
        </ul>
      </AyudaBox>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16"><MSym name="progress_activity" className="text-[32px] text-cat-violet animate-spin" /></div>
      ) : torneos.length === 0 ? (
        <div className="card p-16 text-center text-surface-400 border-2 border-dashed border-line">
          <MSym name="trophy" className="text-[40px] text-surface-500 mb-3" />
          <p>No hay torneos creados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {torneos.map((t) => {
            const est = estadoInfo(t.estado);
            const equipos = t.equipos_torneo?.[0]?.count ?? 0;
            return (
              <div key={t.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-ink text-lg leading-tight truncate">{t.nombre}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="badge bg-cat-violet/15 text-cat-violet">{tipoLabel(t.tipo)}</span>
                      <span className={est.color}>{est.label}</span>
                      {t.categoria && <span className="badge-gray">{t.categoria}</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-line">
                  <div><p className="font-display text-xl text-ink">{equipos}</p><p className="text-[10px] text-surface-500 uppercase">Equipos</p></div>
                  <div><p className="font-display text-xl text-pitch">{t.costo_inscripcion > 0 ? `$${t.costo_inscripcion}` : 'Free'}</p><p className="text-[10px] text-surface-500 uppercase">Inscrip.</p></div>
                  <div><p className="font-display text-xl text-gold truncate" title={t.premio}>{t.premio || '—'}</p><p className="text-[10px] text-surface-500 uppercase">Premio</p></div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <Link to={`/admin/torneos/${t.id}`} className="btn-primary btn-sm flex-1 justify-center">
                    <MSym name="settings" className="text-[16px]" /> Gestionar
                  </Link>
                  <button onClick={() => abrirModal(t)} className="p-2 rounded-lg bg-surface-850 hover:bg-surface-700 text-surface-300" title="Editar">
                    <MSym name="edit" className="text-[18px]" />
                  </button>
                  <button onClick={() => handleEliminar(t.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700" title="Eliminar">
                    <MSym name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full sm:max-w-lg bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h3 className="text-lg font-bold text-ink">{formData.id ? 'Editar Torneo' : 'Crear Torneo'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"><MSym name="close" className="text-[20px]" /></button>
            </div>

            <form onSubmit={handleGuardar} id="form-torneo" className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="label">Nombre del torneo *</label>
                <input required type="text" className="input" placeholder="Ej: Copa Politécnica 2026"
                  value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
              </div>

              <div>
                <label className="label">Tipo de torneo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_TORNEO.map((t) => (
                    <button type="button" key={t.value} onClick={() => setFormData({ ...formData, tipo: t.value })}
                      className={`text-left p-3 rounded-xl border transition-colors ${formData.tipo === t.value ? 'border-brand-500 bg-brand-500/10' : 'border-line hover:border-line'}`}>
                      <p className="text-sm font-semibold text-ink">{t.label}</p>
                      <p className="text-[11px] text-surface-400 leading-tight">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea rows={2} className="input resize-none" placeholder="Detalles del torneo..."
                  value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <input type="text" className="input" placeholder="Ej: Fútbol 5"
                    value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} />
                </div>
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input type="date" className="input"
                    value={formData.fecha_inicio} onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Máx. equipos</label>
                  <input type="number" min="2" className="input" placeholder="Ej: 16"
                    value={formData.max_equipos} onChange={(e) => setFormData({ ...formData, max_equipos: e.target.value })} />
                </div>
                <div>
                  <label className="label">Costo inscripción ($)</label>
                  <input type="number" min="0" step="0.01" className="input" placeholder="0 = gratis"
                    value={formData.costo_inscripcion} onChange={(e) => setFormData({ ...formData, costo_inscripcion: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Premio</label>
                <input type="text" className="input" placeholder="Ej: $200 + Trofeo"
                  value={formData.premio} onChange={(e) => setFormData({ ...formData, premio: e.target.value })} />
              </div>

              <div>
                <label className="label">Reglas (opcional)</label>
                <textarea rows={2} className="input resize-none" placeholder="Reglamento, formato, etc."
                  value={formData.reglas} onChange={(e) => setFormData({ ...formData, reglas: e.target.value })} />
              </div>

              <div>
                <label className="label">Estado</label>
                <select className="input" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                  {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </form>

            <div className="flex gap-3 p-5 border-t border-line">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-torneo" disabled={procesando} className="flex-1 btn-primary">
                {procesando ? <MSym name="progress_activity" className="text-[18px] animate-spin" /> : (formData.id ? 'Guardar cambios' : 'Crear torneo')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
