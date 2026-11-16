import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Loader2, Megaphone, X, ExternalLink, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import { toastExito, toastError } from '../../lib/notify';

const FORM_INICIAL = { id: null, nombre: '', descripcion: '', enlace: '', imagen_url: null };

export default function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [imagen, setImagen] = useState(null);

  const fetchSponsors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sponsors').select('*').order('created_at', { ascending: false });
    if (!error && data) setSponsors(data);
    setLoading(false);
  };

  useEffect(() => { fetchSponsors(); }, []);

  const abrirModal = (sponsor = null) => {
    setForm(sponsor
      ? { id: sponsor.id, nombre: sponsor.nombre || '', descripcion: sponsor.descripcion || '', enlace: sponsor.enlace || '', imagen_url: sponsor.imagen_url || null }
      : FORM_INICIAL);
    setImagen(null);
    setShowModal(true);
  };

  const cerrarModal = () => { setShowModal(false); setForm(FORM_INICIAL); setImagen(null); };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!imagen && !form.imagen_url) return toastError('Subí el logo del sponsor.');
    setGuardando(true);
    try {
      let imagen_url = form.imagen_url;
      if (imagen) {
        const fileExt = imagen.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('sponsors').upload(fileName, imagen);
        if (uploadError) throw uploadError;
        imagen_url = supabase.storage.from('sponsors').getPublicUrl(fileName).data.publicUrl;
      }

      const datos = {
        nombre: form.nombre || 'Sponsor',
        descripcion: form.descripcion || null,
        enlace: form.enlace || null,
        imagen_url,
      };
      const { error: dbError } = form.id
        ? await supabase.from('sponsors').update(datos).eq('id', form.id)
        : await supabase.from('sponsors').insert([datos]);
      if (dbError) throw dbError;

      toastExito(form.id ? 'Sponsor actualizado ✅' : 'Sponsor agregado ✅');
      cerrarModal();
      fetchSponsors();
    } catch (error) {
      toastError('Error al guardar: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id, url) => {
    if (!window.confirm('¿Seguro que quieres borrar a este auspiciante?')) return;
    await supabase.from('sponsors').delete().eq('id', id);
    const fileName = url?.split('/').pop();
    if (fileName) await supabase.storage.from('sponsors').remove([fileName]);
    fetchSponsors();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-500" /> Gestión de Sponsors
          </h1>
          <p className="text-surface-400 text-sm mt-1">Logo, nombre, descripción y enlace de las marcas que te auspician.</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary w-full sm:w-auto">
          <Plus className="w-5 h-5" /> Nuevo Sponsor
        </button>
      </div>

      <AyudaBox id="sponsors" titulo="¿Para qué sirven los sponsors?" icon="visibility">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="public" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Los logos se muestran a <b className="text-ink">todos los clientes</b>: en la <b className="text-ink">página principal</b> (carrusel "Marcas que nos apoyan") y en la sección <b className="text-ink">Sponsors</b>.</span></li>
          <li className="flex gap-2"><MSym name="add_photo_alternate" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tocá <b className="text-ink">Nuevo Sponsor</b> y subí el <b className="text-ink">logo</b>, el nombre y (opcional) un enlace a su web o Instagram.</span></li>
          <li className="flex gap-2"><MSym name="lightbulb" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Tip: usá logos con fondo transparente (PNG) para que se vean mejor sobre el tema oscuro.</span></li>
        </ul>
      </AyudaBox>

      <div className="card p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-10 text-surface-400 border-2 border-dashed border-line rounded-2xl">
            <Megaphone className="w-10 h-10 text-surface-500 mx-auto mb-3" />
            Aún no tienes sponsors. ¡Agregá el primero!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className="relative bg-surface-950 border border-line rounded-xl overflow-hidden p-5 flex flex-col items-center text-center gap-3">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => abrirModal(sponsor)}
                    className="p-1.5 bg-surface-700 text-ink rounded-lg hover:bg-surface-700 transition-colors shadow-lg"
                    title="Editar Sponsor"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sponsor.id, sponsor.imagen_url)}
                    className="p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                    title="Eliminar Sponsor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="h-16 flex items-center justify-center">
                  <img src={sponsor.imagen_url} alt={sponsor.nombre} className="max-h-16 max-w-[150px] object-contain" />
                </div>
                <p className="font-bold text-ink text-sm line-clamp-1">{sponsor.nombre}</p>
                {sponsor.descripcion && <p className="text-xs text-surface-400 line-clamp-2">{sponsor.descripcion}</p>}
                {sponsor.enlace && (
                  <a href={sponsor.enlace} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-brand-600 flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {sponsor.enlace.replace(/^https?:\/\//, '').slice(0, 28)}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-surface-900 border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
              <h3 className="text-lg font-bold text-ink">{form.id ? 'Editar Sponsor' : 'Nuevo Sponsor'}</h3>
              <button onClick={cerrarModal} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              <form onSubmit={handleGuardar} id="form-sponsor" className="space-y-4">
                <div>
                  <label className="label">Nombre de la marca</label>
                  <input required type="text" className="input" value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Gatorade" />
                </div>
                <div>
                  <label className="label">Descripción (opcional)</label>
                  <textarea className="input resize-none min-h-[70px]" value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Breve descripción del sponsor" />
                </div>
                <div>
                  <label className="label">Enlace / sitio web (opcional)</label>
                  <input type="url" className="input" value={form.enlace}
                    onChange={e => setForm({ ...form, enlace: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">Logo (imagen)</label>
                  {form.imagen_url && !imagen && (
                    <div className="mb-2 h-16 flex items-center justify-center bg-surface-950 rounded-lg border border-line">
                      <img src={form.imagen_url} alt="" className="max-h-14 max-w-[150px] object-contain" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="input p-2 text-sm"
                    onChange={e => setImagen(e.target.files[0])} />
                  {form.id && <p className="text-xs text-surface-500 mt-1">Dejá vacío para conservar el logo actual.</p>}
                </div>
              </form>
            </div>

            <div className="flex gap-3 p-5 border-t border-line flex-shrink-0">
              <button type="button" onClick={cerrarModal} className="flex-1 btn-ghost">Cancelar</button>
              <button type="submit" form="form-sponsor" disabled={guardando} className="flex-1 btn-primary">
                {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : (form.id ? 'Guardar cambios' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
