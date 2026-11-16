import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import MSym from '../../components/MSym';
import AyudaBox from '../../components/AyudaBox';
import { toastExito, toastError } from '../../lib/notify';

const FORM_INICIAL = { id: null, nivel: 5, titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', activa: true, imagen_url: null };

export default function CatalogoRecompensas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [archivo, setArchivo] = useState(null);

  const cargar = async () => {
    const { data } = await supabase.from('recompensas_catalogo').select('*').order('nivel', { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel(`rt_recompensas_cat_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recompensas_catalogo' }, () => cargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const abrirModal = (item = null) => {
    setFormData(item
      ? { id: item.id, nivel: item.nivel, titulo: item.titulo || '', descripcion: item.descripcion || '',
          fecha_inicio: item.fecha_inicio || '', fecha_fin: item.fecha_fin || '', activa: item.activa, imagen_url: item.imagen_url || null }
      : FORM_INICIAL);
    setArchivo(null);
    setShowModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      let imagen_url = formData.imagen_url;
      if (archivo) {
        const ext = archivo.name.split('.').pop();
        const fileName = `recompensa_${Math.random()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('promociones').upload(fileName, archivo);
        if (upErr) throw upErr;
        imagen_url = supabase.storage.from('promociones').getPublicUrl(fileName).data.publicUrl;
      }
      const datos = {
        nivel: parseInt(formData.nivel) || 0, titulo: formData.titulo, descripcion: formData.descripcion,
        fecha_inicio: formData.fecha_inicio || null, fecha_fin: formData.fecha_fin || null,
        activa: formData.activa, imagen_url,
      };
      const { error } = formData.id
        ? await supabase.from('recompensas_catalogo').update(datos).eq('id', formData.id)
        : await supabase.from('recompensas_catalogo').insert([datos]);
      if (error) throw error;
      toastExito(formData.id ? 'Premio actualizado' : 'Premio agregado');
      setShowModal(false); setArchivo(null); cargar();
    } catch (err) { toastError('Error: ' + err.message); }
    setProcesando(false);
  };

  const toggleActiva = async (item) => {
    const { error } = await supabase.from('recompensas_catalogo').update({ activa: !item.activa }).eq('id', item.id);
    if (error) toastError(error.message); else cargar();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Borrar este premio del catálogo?')) return;
    await supabase.from('recompensas_catalogo').delete().eq('id', id);
    cargar();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-surface-400 text-sm">Definí qué gana el cliente al llegar a cada cantidad de reservas.</p>
        <button onClick={() => abrirModal()} className="btn-primary btn-sm"><MSym name="add" className="text-[18px]" /> Nuevo premio</button>
      </div>

      <AyudaBox id="catalogo" titulo="¿Cómo armar el catálogo?" icon="redeem">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="flag" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Poné el <b className="text-ink">nivel</b> (cuántas reservas hacen falta, ej: 5 o 12), el premio y una foto.</span></li>
          <li className="flex gap-2"><MSym name="event" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Las <b className="text-ink">fechas</b> son la vigencia (ej: premios de julio). Podés cambiarlos cada mes.</span></li>
          <li className="flex gap-2"><MSym name="visibility" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Lo que marques como <b className="text-ink">activo</b> es lo que el cliente ve en "Mis Recompensas".</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-12"><MSym name="progress_activity" className="text-[28px] text-brand-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-surface-400 border-2 border-dashed border-line">
          Todavía no cargaste premios. Tocá <b className="text-ink">Nuevo premio</b> para empezar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className={`card overflow-hidden ${!it.activa && 'opacity-60'}`}>
              {it.imagen_url && <div className="h-32 bg-surface-950"><img src={it.imagen_url} alt="" className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="badge bg-gold/15 text-gold mb-1"><MSym name="military_tech" className="text-[14px]" /> {it.nivel} reservas</span>
                    <h4 className="font-bold text-ink leading-tight">{it.titulo}</h4>
                  </div>
                  <span className={it.activa ? 'badge-green' : 'badge-gray'}>{it.activa ? 'Activo' : 'Inactivo'}</span>
                </div>
                {it.descripcion && <p className="text-sm text-surface-400 mt-1 line-clamp-2">{it.descripcion}</p>}
                {(it.fecha_inicio || it.fecha_fin) && (
                  <p className="text-xs text-surface-500 mt-2 flex items-center gap-1"><MSym name="event" className="text-[14px]" /> {it.fecha_inicio || '—'} → {it.fecha_fin || '—'}</p>
                )}
                <div className="flex items-center gap-1.5 border-t border-line pt-3 mt-3">
                  <button onClick={() => toggleActiva(it)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium ${it.activa ? 'bg-pitch/15 text-pitch' : 'bg-surface-850 text-surface-400'}`}>
                    <MSym name={it.activa ? 'toggle_on' : 'toggle_off'} className="text-[18px]" /> {it.activa ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => abrirModal(it)} className="p-2 rounded-lg bg-surface-850 hover:bg-surface-700 text-surface-300"><MSym name="edit" className="text-[18px]" /></button>
                  <button onClick={() => eliminar(it.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700"><MSym name="delete" className="text-[18px]" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h3 className="text-lg font-bold text-ink">{formData.id ? 'Editar premio' : 'Nuevo premio'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"><MSym name="close" className="text-[20px]" /></button>
            </div>
            <form onSubmit={guardar} id="form-cat" className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Nivel</label>
                  <input required type="number" min="1" className="input" value={formData.nivel}
                    onChange={e => setFormData({ ...formData, nivel: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Premio</label>
                  <input required type="text" className="input" placeholder="Ej: Camiseta EPN"
                    value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea className="input resize-none min-h-[60px]" placeholder="Detalles del premio..."
                  value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Vigente desde</label>
                  <input type="date" className="input" value={formData.fecha_inicio} onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })} /></div>
                <div><label className="label">Hasta</label>
                  <input type="date" className="input" value={formData.fecha_fin} onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })} /></div>
              </div>
              <div>
                <label className="label">Foto del premio</label>
                {formData.imagen_url && !archivo && <img src={formData.imagen_url} alt="" className="w-full h-28 object-cover rounded-lg mb-2 border border-line" />}
                <input type="file" accept="image/*" className="input p-2 text-sm" onChange={e => setArchivo(e.target.files[0])} />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-850 border border-line cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-pitch" checked={formData.activa} onChange={e => setFormData({ ...formData, activa: e.target.checked })} />
                <span className="text-sm font-medium text-ink">Activo (visible para el cliente)</span>
              </label>
            </form>
            <div className="flex gap-3 p-5 border-t border-line">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-cat" disabled={procesando} className="flex-1 btn-primary">
                {procesando ? <MSym name="progress_activity" className="text-[18px] animate-spin" /> : (formData.id ? 'Guardar' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
