import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, X } from 'lucide-react';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { PromocionesSkeleton } from '../../components/Skeletons';
import { toastExito, toastError } from '../../lib/notify';

const FORM_INICIAL = { id: null, titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', activa: true, mostrar_en_inicio: false, imagen_url: null };

export default function PromocionesAdmin() {
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [imagenArchivo, setImagenArchivo] = useState(null);

  const cargarPromociones = async () => {
    const { data } = await supabase.from('promociones').select('*').order('created_at', { ascending: false });
    if (data) setPromociones(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarPromociones();
    const canal = supabase
      .channel(`rt_promociones_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promociones' }, () => cargarPromociones())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const abrirModal = (promo = null) => {
    setFormData(promo
      ? {
          id: promo.id, titulo: promo.titulo || '', descripcion: promo.descripcion || '',
          fecha_inicio: promo.fecha_inicio || '', fecha_fin: promo.fecha_fin || '',
          activa: promo.activa, mostrar_en_inicio: promo.mostrar_en_inicio, imagen_url: promo.imagen_url || null,
        }
      : FORM_INICIAL);
    setImagenArchivo(null);
    setShowModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      // Imagen: si subieron una nueva, la guardamos; si no, mantenemos la actual
      let imagen_url = formData.imagen_url;
      if (imagenArchivo) {
        const fileExt = imagenArchivo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('promociones').upload(fileName, imagenArchivo);
        if (upErr) throw upErr;
        imagen_url = supabase.storage.from('promociones').getPublicUrl(fileName).data.publicUrl;
      }

      const datos = {
        titulo: formData.titulo, descripcion: formData.descripcion,
        fecha_inicio: formData.fecha_inicio || null, fecha_fin: formData.fecha_fin || null,
        activa: formData.activa, mostrar_en_inicio: formData.mostrar_en_inicio, imagen_url,
      };

      const { error } = formData.id
        ? await supabase.from('promociones').update(datos).eq('id', formData.id)
        : await supabase.from('promociones').insert([datos]);
      if (error) throw error;

      toastExito(formData.id ? 'Promoción actualizada' : 'Promoción creada');
      setShowModal(false);
      setImagenArchivo(null);
      cargarPromociones();
    } catch (err) { toastError('Error: ' + err.message); }
    setProcesando(false);
  };

  const toggleCampo = async (promo, campo) => {
    const { error } = await supabase.from('promociones').update({ [campo]: !promo[campo] }).eq('id', promo.id);
    if (error) toastError(error.message);
    else cargarPromociones();
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Borrar esta promoción?')) {
      await supabase.from('promociones').delete().eq('id', id);
      cargarPromociones();
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Promociones</h2>
          <p className="text-surface-400 text-sm">Banners informativos para el inicio de los estudiantes.</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary w-full sm:w-auto">
          <MSym name="add" className="text-[20px]" /> Nueva Promo
        </button>
      </div>

      <AyudaBox id="promociones" titulo="¿Cómo crear una promoción?" icon="sell">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="add_circle" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Nueva Promo</b>: título, descripción, fechas y un <b className="text-ink">banner</b> (imagen).</span></li>
          <li className="flex gap-2"><MSym name="home" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Marcá <b className="text-ink">"Mostrar en la página principal"</b> para que salga en el <b className="text-ink">carrusel del inicio</b> del cliente.</span></li>
          <li className="flex gap-2"><MSym name="edit" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Con los botones de cada tarjeta podés <b className="text-ink">editar</b>, prender/apagar <b className="text-ink">Activa</b> y <b className="text-ink">En inicio</b> al toque.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <PromocionesSkeleton />
      ) : promociones.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
          No hay promociones. ¡Creá la primera para comunicar algo a los estudiantes!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {promociones.map(promo => (
            <div key={promo.id} className={`card overflow-hidden ${!promo.activa && 'opacity-60'}`}>
              {promo.imagen_url && (
                <div className="h-36 w-full bg-surface-950">
                  <img src={promo.imagen_url} alt="promo" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-base text-ink leading-tight">{promo.titulo}</h3>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={promo.activa ? 'badge-green' : 'badge-gray'}>{promo.activa ? 'Activa' : 'Inactiva'}</span>
                    {promo.mostrar_en_inicio && <span className="badge-brand">En inicio</span>}
                  </div>
                </div>
                <p className="text-sm text-surface-400 mb-3 line-clamp-2">{promo.descripcion}</p>

                <div className="flex items-center gap-1.5 text-xs text-surface-500 mb-3">
                  <MSym name="calendar_month" className="text-[15px]" />
                  <span>{promo.fecha_inicio || '—'} → {promo.fecha_fin || '—'}</span>
                </div>

                {/* Acciones rápidas */}
                <div className="flex items-center gap-1.5 border-t border-line pt-3">
                  <button onClick={() => toggleCampo(promo, 'activa')} title={promo.activa ? 'Desactivar' : 'Activar'}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition ${promo.activa ? 'bg-pitch/15 text-pitch' : 'bg-surface-850 text-surface-400'}`}>
                    <MSym name={promo.activa ? 'toggle_on' : 'toggle_off'} className="text-[18px]" /> Activa
                  </button>
                  <button onClick={() => toggleCampo(promo, 'mostrar_en_inicio')} title="Mostrar en el carrusel del inicio"
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition ${promo.mostrar_en_inicio ? 'bg-brand-500/15 text-brand-600' : 'bg-surface-850 text-surface-400'}`}>
                    <MSym name="home" className="text-[16px]" /> En inicio
                  </button>
                  <button onClick={() => abrirModal(promo)} title="Editar"
                    className="p-2 rounded-lg bg-surface-850 hover:bg-surface-700 text-surface-300">
                    <MSym name="edit" className="text-[18px]" />
                  </button>
                  <button onClick={() => handleEliminar(promo.id)} title="Eliminar"
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700">
                    <MSym name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
              <h3 className="text-lg font-bold text-ink">{formData.id ? 'Editar Promoción' : 'Crear Promoción'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              <form onSubmit={handleGuardar} id="form-promo" className="space-y-4">
                <div>
                  <label className="label">Título</label>
                  <input required type="text" className="input" value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea className="input resize-none min-h-[70px]" value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Inicio</label>
                    <input type="date" className="input" value={formData.fecha_inicio}
                      onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Fin</label>
                    <input type="date" className="input" value={formData.fecha_fin}
                      onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Banner (imagen)</label>
                  {formData.imagen_url && !imagenArchivo && (
                    <img src={formData.imagen_url} alt="" className="w-full h-28 object-cover rounded-lg mb-2 border border-line" />
                  )}
                  <input type="file" accept="image/*" className="input p-2 text-sm"
                    onChange={e => setImagenArchivo(e.target.files[0])} />
                  {formData.id && <p className="text-[11px] text-surface-500 mt-1">Si no elegís una nueva, se mantiene la imagen actual.</p>}
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-850 border border-line cursor-pointer hover:bg-white/[0.07] transition-colors">
                  <input type="checkbox" className="w-5 h-5 accent-pitch cursor-pointer"
                    checked={formData.activa} onChange={e => setFormData({ ...formData, activa: e.target.checked })} />
                  <span className="text-sm">
                    <span className="font-medium text-ink">Activa</span>
                    <span className="block text-xs text-surface-400">Si la desactivás, no se muestra en ningún lado.</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-850 border border-line cursor-pointer hover:bg-white/[0.07] transition-colors">
                  <input type="checkbox" className="w-5 h-5 accent-brand-500 cursor-pointer"
                    checked={formData.mostrar_en_inicio} onChange={e => setFormData({ ...formData, mostrar_en_inicio: e.target.checked })} />
                  <span className="text-sm">
                    <span className="font-medium text-ink">Mostrar en la página principal</span>
                    <span className="block text-xs text-surface-400">Aparece en el carrusel del inicio del estudiante.</span>
                  </span>
                </label>
              </form>
            </div>

            <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-promo" disabled={procesando} className="flex-1 btn-primary">
                {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : (formData.id ? 'Guardar cambios' : 'Crear promoción')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
