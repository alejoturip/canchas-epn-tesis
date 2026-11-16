import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';
import AyudaBox from '../../components/AyudaBox';
import MSym from '../../components/MSym';
import CatalogoRecompensas from './CatalogoRecompensas';

export default function PremiosAdmin() {
  const [premios, setPremios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ganados');

  useEffect(() => { fetchPremios(); }, []);

  const fetchPremios = async () => {
    const { data, error } = await supabase
      .from('premios')
      .select('*, perfiles(nombre, email)')
      .order('created_at', { ascending: false });
    if (!error) setPremios(data);
    setLoading(false);
  };

  const marcarCanjeado = async (id) => {
    if (!window.confirm('¿Confirmas que ya entregaste este premio?')) return;
    const { error } = await supabase.from('premios').update({ estado_canje: 'canjeado' }).eq('id', id);
    if (!error) fetchPremios();
    else alert('Error: ' + error.message);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <Gift className="w-6 h-6 text-brand-500" /> Gestión de Premios
        </h1>
        <p className="text-surface-400 text-sm mt-1">Revisa y entrega las recompensas de tus clientes.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 rounded-xl p-1 w-full sm:w-fit">
        <button onClick={() => setTab('ganados')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'ganados' ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white'}`}>
          <MSym name="emoji_events" className="text-[18px]" /> Premios ganados
        </button>
        <button onClick={() => setTab('catalogo')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'catalogo' ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white'}`}>
          <MSym name="redeem" className="text-[18px]" /> Catálogo
        </button>
      </div>

      {tab === 'catalogo' ? <CatalogoRecompensas /> : (
      <>
      <AyudaBox id="premios" titulo="¿Cómo funcionan los premios?" icon="redeem">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><MSym name="auto_awesome" className="text-cat-blue text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Se generan <b className="text-ink">solos</b> por fidelidad (a las 5 y 12 reservas jugadas del cliente).</span></li>
          <li className="flex gap-2"><MSym name="check_circle" className="text-pitch text-[18px] flex-shrink-0 mt-0.5" /><span className="flex-1">Cuando el cliente lo reclama en el local, tocá <b className="text-ink">marcar como entregado</b>.</span></li>
        </ul>
      </AyudaBox>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : premios.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">Aún no hay premios generados.</div>
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-surface-300">
                <thead className="bg-surface-950/50 text-surface-400 border-b border-line">
                  <tr>
                    <th className="p-4 font-medium">Cliente</th>
                    <th className="p-4 font-medium">Premio</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {premios.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-850 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-ink">{p.perfiles?.nombre || 'Usuario'}</p>
                        <p className="text-xs text-surface-500">{p.perfiles?.email}</p>
                      </td>
                      <td className="p-4 text-ink">{p.descripcion}</td>
                      <td className="p-4">
                        <span className={p.tipo === 'premium' ? 'badge-brand' : 'badge-gray'}>{p.tipo}</span>
                      </td>
                      <td className="p-4">
                        <span className={p.estado_canje === 'canjeado' ? 'badge-gray' : 'badge-amber'}>{p.estado_canje}</span>
                      </td>
                      <td className="p-4">
                        {p.estado_canje === 'pendiente' ? (
                          <button onClick={() => marcarCanjeado(p.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 rounded-lg transition text-xs font-medium">
                            <CheckCircle className="w-4 h-4" /> Entregar
                          </button>
                        ) : (
                          <span className="text-surface-500 text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Entregado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {premios.map((p) => (
              <div key={p.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink text-sm">{p.perfiles?.nombre || 'Usuario'}</p>
                    <p className="text-xs text-surface-500">{p.perfiles?.email}</p>
                  </div>
                  <span className={p.estado_canje === 'canjeado' ? 'badge-gray' : 'badge-amber'}>
                    {p.estado_canje}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-surface-200 text-sm">{p.descripcion}</p>
                    <span className={`mt-1 inline-block ${p.tipo === 'premium' ? 'badge-brand' : 'badge-gray'}`}>{p.tipo}</span>
                  </div>
                  {p.estado_canje === 'pendiente' ? (
                    <button onClick={() => marcarCanjeado(p.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 rounded-xl transition text-xs font-medium">
                      <CheckCircle className="w-4 h-4" /> Entregar
                    </button>
                  ) : (
                    <span className="text-surface-500 text-xs flex items-center gap-1 flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Entregado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
