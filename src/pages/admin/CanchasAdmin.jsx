import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon, X, MapPin, Navigation, Clock } from 'lucide-react';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { DIAS } from '../../utils/horarios';
import { FEATURES } from '../../config/features';

const FORM_INICIAL = {
  id: null, nombre: '', descripcion: '', precio_hora: '', activa: true, direccion: '', latitud: '', longitud: '',
  hora_apertura: '08:00', hora_cierre: '22:00', dias_atencion: [0, 1, 2, 3, 4, 5, 6],
};

export default function CanchasAdmin() {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [ubicando, setUbicando] = useState(false);

  const cargarCanchas = async () => {
    setLoading(true);
    const { data } = await supabase.from('canchas').select('*').order('created_at', { ascending: false });
    if (data) setCanchas(data);
    setLoading(false);
  };

  useEffect(() => { cargarCanchas(); }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    let imagen_url = formData.imagen_url;

    if (imagenArchivo) {
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('canchas').upload(fileName, imagenArchivo);
      if (!uploadError) {
        const { data } = supabase.storage.from('canchas').getPublicUrl(fileName);
        imagen_url = data.publicUrl;
      } else {
        alert('Error subiendo imagen: ' + uploadError.message);
      }
    }

    if (!formData.dias_atencion || formData.dias_atencion.length === 0) {
      setProcesando(false);
      return alert('Elegí al menos un día de atención.');
    }
    const toNum = (v) => (v === '' || v == null ? null : parseFloat(v));
    const datos = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio_hora: parseFloat(formData.precio_hora) || 0,
      activa: formData.activa,
      imagen_url,
      direccion: formData.direccion || null,
      latitud: toNum(formData.latitud),
      longitud: toNum(formData.longitud),
      hora_apertura: formData.hora_apertura,
      hora_cierre: formData.hora_cierre,
      dias_atencion: [...formData.dias_atencion].sort((a, b) => a - b),
    };
    if (formData.id) {
      await supabase.from('canchas').update(datos).eq('id', formData.id);
    } else {
      await supabase.from('canchas').insert([datos]);
    }

    setShowModal(false);
    setImagenArchivo(null);
    setProcesando(false);
    cargarCanchas();
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Seguro que quieres borrar esta cancha? No se puede deshacer.')) {
      await supabase.from('canchas').delete().eq('id', id);
      cargarCanchas();
    }
  };

  const abrirModal = (cancha = null) => {
    setFormData(
      cancha
        ? {
            ...cancha,
            direccion: cancha.direccion ?? '',
            latitud: cancha.latitud ?? '',
            longitud: cancha.longitud ?? '',
            hora_apertura: (cancha.hora_apertura ?? '08:00').slice(0, 5),
            hora_cierre: (cancha.hora_cierre ?? '22:00').slice(0, 5),
            dias_atencion: Array.isArray(cancha.dias_atencion) && cancha.dias_atencion.length
              ? cancha.dias_atencion : [0, 1, 2, 3, 4, 5, 6],
          }
        : FORM_INICIAL
    );
    setImagenArchivo(null);
    setShowModal(true);
  };

  const toggleDia = (n) => {
    setFormData((f) => {
      const tiene = f.dias_atencion.includes(n);
      return { ...f, dias_atencion: tiene ? f.dias_atencion.filter((d) => d !== n) : [...f.dias_atencion, n] };
    });
  };

  const usarMiUbicacion = () => {
    if (!('geolocation' in navigator)) return alert('Tu navegador no soporta geolocalización.');
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((f) => ({ ...f, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }));
        setUbicando(false);
      },
      () => { alert('No se pudo obtener tu ubicación.'); setUbicando(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Gestión de Escenarios Deportivos</h2>
          <p className="text-surface-400 text-sm">Agrega, edita o elimina los escenarios deportivos de la institución.</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Nuevo Escenario
        </button>
      </div>

      <AyudaBox id="canchas" titulo="¿Cómo gestionar los escenarios?" icon="stadium">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="add_circle" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Nuevo Escenario</b> y cargá nombre, foto, <b className="text-ink">horario y días de atención</b> y la ubicación.</span></li>
          <li className="flex gap-2"><MSym name="toggle_on" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Solo los escenarios <b className="text-ink">activos</b> aparecen para reservar en el inicio del estudiante.</span></li>
          <li className="flex gap-2"><MSym name="edit" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Editá o eliminá con los botones de cada tarjeta.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : canchas.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
          No hay canchas aún. ¡Crea la primera!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {canchas.map(cancha => (
            <div key={cancha.id} className={`card overflow-hidden flex flex-col ${!cancha.activa && 'opacity-60'}`}>
              <div className="h-40 bg-surface-950 relative">
                {cancha.imagen_url
                  ? <img src={cancha.imagen_url} alt="cancha" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-surface-500" /></div>
                }
                <div className={`absolute top-2 right-2 ${cancha.activa ? 'badge-green' : 'badge-red'}`}>
                  {cancha.activa ? 'Activa' : 'Inactiva'}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-base text-ink">{cancha.nombre}</h3>
                {FEATURES.PAGOS && <p className="text-brand-600 font-bold mt-0.5 text-sm">${cancha.precio_hora} / hora</p>}
                <p className="text-surface-500 text-xs mt-1 line-clamp-2">{cancha.descripcion}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                  <button onClick={() => abrirModal(cancha)} className="flex-1 btn-secondary py-2 text-sm">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => handleEliminar(cancha.id)} className="px-3 py-2 rounded-xl bg-red-500/10 text-red-700 hover:bg-red-500/20 transition-colors border border-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
              <h3 className="text-lg font-bold text-ink">{formData.id ? 'Editar Escenario' : 'Crear Escenario'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal body — scrollable */}
            <div className="overflow-y-auto flex-1 p-5">
              <form onSubmit={handleGuardar} className="space-y-4" id="form-cancha">
                <div>
                  <label className="label">Nombre</label>
                  <input required type="text" className="input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea className="input min-h-[80px] resize-none" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                </div>
                {/* Sin cobro: la columna `precio_hora` queda con su DEFAULT 0
                    (ver supabase/reglas_reserva_epn.sql). Vuelve si se prende PAGOS. */}
                {FEATURES.PAGOS && (
                  <div>
                    <label className="label">Precio por Hora ($)</label>
                    <input required type="number" step="0.01" className="input" value={formData.precio_hora} onChange={e => setFormData({...formData, precio_hora: e.target.value})} />
                  </div>
                )}

                {/* Horario de atención */}
                <div className="rounded-xl border border-line bg-surface-950/40 p-3 space-y-3">
                  <p className="label flex items-center gap-1.5 mb-0"><Clock className="w-4 h-4" /> Horario de atención</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-surface-400">Abre</label>
                      <input required type="time" className="input" value={formData.hora_apertura}
                        onChange={e => setFormData({ ...formData, hora_apertura: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400">Cierra</label>
                      <input required type="time" className="input" value={formData.hora_cierre}
                        onChange={e => setFormData({ ...formData, hora_cierre: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400">Días que atiende</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {DIAS.map((d) => {
                        const activo = formData.dias_atencion.includes(d.n);
                        return (
                          <button type="button" key={d.n} onClick={() => toggleDia(d.n)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${activo
                              ? 'bg-brand-500 text-white border-brand-400'
                              : 'bg-surface-800 text-surface-400 border-line hover:text-ink'}`}>
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Dirección</label>
                  <input type="text" className="input" placeholder="Ej: Campus Rubén Orellana, Ladrón de Guevara E11-253" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Latitud</label>
                    <input type="number" step="any" className="input" placeholder="-0.210200" value={formData.latitud} onChange={e => setFormData({...formData, latitud: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Longitud</label>
                    <input type="number" step="any" className="input" placeholder="-78.489000" value={formData.longitud} onChange={e => setFormData({...formData, longitud: e.target.value})} />
                  </div>
                </div>
                <button type="button" onClick={usarMiUbicacion} disabled={ubicando} className="btn-secondary btn-sm w-full">
                  {ubicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Usar mi ubicación actual
                </button>
                <div>
                  <label className="label">Subir Imagen</label>
                  <input type="file" accept="image/*" className="input p-2 text-sm" onChange={e => setImagenArchivo(e.target.files[0])} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="activa" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} className="w-4 h-4 accent-brand-500" />
                  <label htmlFor="activa" className="text-sm text-surface-300">Espacio activo (visible para los estudiantes)</label>
                </div>
              </form>
            </div>
            {/* Modal footer — fijo abajo */}
            <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-cancha" disabled={procesando} className="flex-1 btn-primary">
                {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
