import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

export default function TiendaAdmin() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Estado para guardar la info del producto que estamos creando/editando
  const [formData, setFormData] = useState({ id: null, nombre: '', descripcion: '', precio: '', stock: '', activa: true });
  const [imagenArchivo, setImagenArchivo] = useState(null);

  const cargarProductos = async () => {
    setLoading(true);
    const { data } = await supabase.from('productos_tienda').select('*').order('created_at', { ascending: false });
    if (data) setProductos(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    let imagen_url = formData.imagen_url;

    // Lógica para subir la imagen al bucket 'productos'
    if (imagenArchivo) {
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('productos').upload(fileName, imagenArchivo);

      if (!uploadError) {
        const { data } = supabase.storage.from('productos').getPublicUrl(fileName);
        imagen_url = data.publicUrl;
      }
    }

    const datosProducto = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
      activa: formData.activa,
      imagen_url
    };

    // Si tiene ID actualizamos, si no, creamos uno nuevo
    if (formData.id) {
      await supabase.from('productos_tienda').update(datosProducto).eq('id', formData.id);
    } else {
      await supabase.from('productos_tienda').insert([datosProducto]);
    }

    setShowModal(false);
    setImagenArchivo(null);
    setProcesando(false);
    cargarProductos();
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Seguro que quieres borrar este producto?')) {
      await supabase.from('productos_tienda').delete().eq('id', id);
      cargarProductos();
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-title">Tienda Deportiva</h2>
          <p className="text-surface-400">Gestiona los productos que vendes.</p>
        </div>
        <button onClick={() => { setFormData({ id: null, nombre: '', descripcion: '', precio: '', stock: '', activa: true }); setShowModal(true); }} className="btn-primary">
          <Plus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map(prod => (
            <div key={prod.id} className={`card overflow-hidden flex flex-col ${!prod.activa && 'opacity-50'}`}>
              <div className="h-40 bg-surface-950 relative">
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} alt="producto" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-surface-500" /></div>
                )}
                <div className="absolute top-2 left-2 badge badge-gray">Stock: {prod.stock}</div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg leading-tight mb-1">{prod.nombre}</h3>
                <p className="text-brand-500 font-bold mb-3">${prod.precio}</p>
                
                <div className="mt-auto flex gap-2 border-t border-line pt-3">
                  <button onClick={() => { setFormData(prod); setShowModal(true); }} className="flex-1 btn-secondary py-1.5"><Edit2 className="w-4 h-4" /> Editar</button>
                  <button onClick={() => handleEliminar(prod.id)} className="px-3 btn-danger py-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-900 border border-line rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">{formData.id ? 'Editar Producto' : 'Crear Producto'}</h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div><label className="label">Nombre</label><input required type="text" className="input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
              <div><label className="label">Descripción</label><textarea className="input" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Precio ($)</label><input required type="number" step="0.01" className="input" value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} /></div>
                <div><label className="label">Stock</label><input required type="number" className="input" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} /></div>
              </div>
              <div><label className="label">Subir Imagen</label><input type="file" accept="image/*" className="input p-2 text-sm" onChange={e => setImagenArchivo(e.target.files[0])} /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-ghost">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex-1 btn-primary">{procesando ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}