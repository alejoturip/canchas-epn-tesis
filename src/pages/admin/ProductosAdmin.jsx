import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Image as ImageIcon, X, Loader2, Edit2 } from 'lucide-react';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';

const FORM_INICIAL = { id: null, nombre: '', descripcion: '', precio: '', stock: '', categoria: '', imagen_url: '', activa: true };

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => { fetchProductos(); }, []);

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos_tienda').select('*').order('id', { ascending: false });
    if (!error) setProductos(data);
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(fileName);
      setFormData(f => ({ ...f, imagen_url: publicUrl }));
    } catch (error) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const abrirModal = (prod = null) => {
    setFormData(prod
      ? { id: prod.id, nombre: prod.nombre || '', descripcion: prod.descripcion || '', precio: prod.precio ?? '',
          stock: prod.stock ?? '', categoria: prod.categoria || '', imagen_url: prod.imagen_url || '', activa: prod.activa }
      : FORM_INICIAL);
    setIsModalOpen(true);
  };

  const cerrarModal = () => { setIsModalOpen(false); setFormData(FORM_INICIAL); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    const payload = {
      nombre: formData.nombre, descripcion: formData.descripcion,
      precio: parseFloat(formData.precio), stock: parseInt(formData.stock),
      imagen_url: formData.imagen_url, activa: formData.activa,
    };
    // Solo enviamos `categoria` si se completó (evita error si la columna no existe aún)
    if (formData.categoria) payload.categoria = formData.categoria;
    const { error } = formData.id
      ? await supabase.from('productos_tienda').update(payload).eq('id', formData.id)
      : await supabase.from('productos_tienda').insert([payload]);
    if (!error) {
      cerrarModal();
      fetchProductos();
    } else {
      alert('Error: ' + error.message);
    }
    setProcesando(false);
  };

  const toggleActiva = async (prod) => {
    const { error } = await supabase.from('productos_tienda').update({ activa: !prod.activa }).eq('id', prod.id);
    if (!error) fetchProductos();
    else alert('Error: ' + error.message);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este implemento?')) {
      await supabase.from('productos_tienda').delete().eq('id', id);
      fetchProductos();
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Inventario de Implementos</h1>
          <p className="text-surface-400 text-sm mt-1">Los implementos que se prestan y cuántas unidades hay de cada uno.</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Nuevo Implemento
        </button>
      </div>

      <AyudaBox id="productos" titulo="¿Cómo manejar los implementos?" icon="sports_soccer">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="add_circle" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Nuevo Implemento</b> y cargá foto, nombre, <b className="text-ink">unidades</b> y valor de reposición.</span></li>
          <li className="flex gap-2"><MSym name="inventory_2" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Los estudiantes los piden prestados desde <b className="text-ink">Implementos</b>; los pedidos se gestionan en <b className="text-ink">Préstamos</b>.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : productos.length === 0 ? (
        <div className="card p-12 text-center text-surface-400 border-dashed border-2 border-line">
          Aún no hay implementos cargados. ¡Agregá el primero!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {productos.map((prod) => (
            <div key={prod.id} className={`card p-0 overflow-hidden flex flex-col ${!prod.activa && 'opacity-60'}`}>
              <div className="h-44 bg-surface-900 relative">
                {prod.imagen_url
                  ? <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-surface-500"><ImageIcon className="w-8 h-8 opacity-50" /></div>
                }
                <button onClick={() => toggleActiva(prod)} title={prod.activa ? 'Tocar para desactivar' : 'Tocar para activar'}
                  className="absolute top-3 right-3">
                  <span className={prod.activa ? 'badge-green' : 'badge-red'}>{prod.activa ? 'Activo' : 'Inactivo'}</span>
                </button>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-base text-ink">{prod.nombre}</h3>
                <p className="text-surface-400 text-xs mt-0.5">Reposición <span className="text-surface-200 font-semibold">${prod.precio}</span></p>
                <p className="text-surface-400 text-xs mt-1 mb-3 line-clamp-2">{prod.descripcion}</p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-sm text-surface-300">Disponibles: <strong className="text-ink">{prod.stock}</strong></span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirModal(prod)}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-surface-200 bg-surface-850 hover:bg-surface-700 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    <button onClick={() => handleDelete(prod.id)}
                      className="p-2 text-red-700 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-line flex-shrink-0">
              <h2 className="text-lg font-bold text-ink">{formData.id ? 'Editar Implemento' : 'Añadir Implemento'}</h2>
              <button onClick={cerrarModal} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              <form onSubmit={handleSubmit} id="form-producto" className="space-y-4">
                <div>
                  <label className="label">Nombre del implemento</label>
                  <input type="text" required className="input" placeholder="Ej: Balón de fútbol #5"
                    value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Valor reposición ($)</label>
                    <input type="number" step="0.01" required className="input" placeholder="0.00"
                      value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Unidades</label>
                    <input type="number" required className="input" placeholder="10"
                      value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="label">Categoría <span className="text-surface-500 font-normal">(opcional)</span></label>
                  <input type="text" className="input" placeholder="Ej: Fútbol, Básquet, Vóley" list="cats-productos"
                    value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
                  <datalist id="cats-productos">
                    {[...new Set(productos.map(p => p.categoria).filter(Boolean))].map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea required className="input min-h-[70px] resize-none" placeholder="Estado, marca, detalles de uso..."
                    value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                </div>
                <div>
                  <label className="label">Foto del implemento</label>
                  <div className="flex items-center gap-3">
                    <label className="btn-secondary cursor-pointer flex-1 justify-center text-sm">
                      {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : 'Seleccionar imagen'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {formData.imagen_url && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-line">
                        <img src={formData.imagen_url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-850 border border-line cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-pitch" checked={formData.activa}
                    onChange={e => setFormData({ ...formData, activa: e.target.checked })} />
                  <span className="text-sm font-medium text-ink">Activo (se puede pedir prestado)</span>
                </label>
              </form>
            </div>

            <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
              <button type="button" onClick={cerrarModal} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-producto" disabled={uploading || procesando} className="flex-1 btn-primary">
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : (formData.id ? 'Guardar cambios' : 'Guardar Implemento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
