import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MSym from '../components/MSym';
import { PremiosSkeleton } from '../components/Skeletons';

const hoy = new Date().toISOString().split('T')[0];
const fmtFecha = (f) => (f ? new Date(f + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : null);

export default function Recompensas() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [premios, setPremios] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDatos = useCallback(async () => {
    const [{ data: userData }, { data: premiosData }, { data: catData }] = await Promise.all([
      supabase.from('perfiles').select('reservas_completadas').eq('id', user.id).single(),
      supabase.from('premios').select('*').eq('perfil_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recompensas_catalogo').select('*').eq('activa', true).order('nivel', { ascending: true }),
    ]);
    if (userData) setPerfil(userData);
    if (premiosData) setPremios(premiosData);
    // Solo los vigentes (sin fecha de fin o que no hayan vencido)
    setCatalogo((catData || []).filter((c) => !c.fecha_fin || c.fecha_fin >= hoy));
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchDatos(); }, [user, fetchDatos]);

  const puntos = perfil?.reservas_completadas || 0;
  const proximo = catalogo.find((c) => c.nivel > puntos); // siguiente meta a alcanzar

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <MSym name="trophy" className="text-gold text-[32px]" fill />
        <h1 className="display-title text-3xl text-ink">Mis Recompensas</h1>
      </div>

      {loading ? <PremiosSkeleton /> : (
      <>
        {/* Progreso */}
        <div className="relative overflow-hidden rounded-3xl border border-gold/20 p-6 md:p-8 mb-8"
          style={{ background: 'linear-gradient(120deg, rgba(233,185,73,.12), rgba(218,31,38,.06))' }}>
          <MSym name="military_tech" className="absolute -top-4 -right-2 text-gold/10 text-[140px]" />
          <p className="text-surface-300">Llevás</p>
          <p className="font-display text-5xl text-ink">{puntos} <span className="text-2xl text-surface-400">reservas jugadas</span></p>
          {proximo ? (
            <p className="text-surface-300 mt-3">
              Te faltan <b className="text-gold">{proximo.nivel - puntos}</b> para ganar <b className="text-ink">{proximo.titulo}</b>. ¡Dale! ⚽
            </p>
          ) : catalogo.length > 0 ? (
            <p className="text-pitch mt-3 flex items-center gap-1.5"><MSym name="check_circle" className="text-[18px]" /> ¡Desbloqueaste todos los premios vigentes!</p>
          ) : null}
        </div>

        {/* Lo que podés ganar */}
        <h2 className="display-title text-2xl text-ink mb-4 flex items-center gap-2">
          <MSym name="redeem" className="text-brand-500 text-[26px]" /> Lo que podés ganar
        </h2>

        {catalogo.length === 0 ? (
          <div className="card p-8 text-center text-surface-400 mb-8">
            Pronto vamos a publicar los premios. ¡Seguí reservando para no quedarte afuera!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {catalogo.map((c) => {
              const logrado = puntos >= c.nivel;
              const pct = Math.min((puntos / c.nivel) * 100, 100);
              return (
                <div key={c.id} className={`card overflow-hidden ${logrado ? 'border-pitch/40' : ''}`}>
                  <div className="h-36 bg-surface-950 relative">
                    {c.imagen_url
                      ? <img src={c.imagen_url} alt={c.titulo} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><MSym name="card_giftcard" className="text-surface-500 text-[44px]" /></div>}
                    <span className="absolute top-2 left-2 badge bg-slate-900/40 text-gold"><MSym name="military_tech" className="text-[14px]" /> {c.nivel} reservas</span>
                    {logrado && <span className="absolute top-2 right-2 badge bg-pitch/80 text-ink"><MSym name="check" className="text-[14px]" /> ¡Tuyo!</span>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-ink">{c.titulo}</h3>
                    {c.descripcion && <p className="text-sm text-surface-400 mt-0.5 line-clamp-2">{c.descripcion}</p>}

                    {/* Progreso hacia este premio */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={logrado ? 'text-pitch' : 'text-surface-400'}>{logrado ? 'Desbloqueado' : `${puntos}/${c.nivel}`}</span>
                        {!logrado && <span className="text-surface-500">faltan {c.nivel - puntos}</span>}
                      </div>
                      <div className="w-full bg-surface-900 rounded-full h-2.5 border border-line overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${logrado ? 'bg-pitch' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {c.fecha_fin && <p className="text-[11px] text-surface-500 mt-2 flex items-center gap-1"><MSym name="schedule" className="text-[13px]" /> Válido hasta {fmtFecha(c.fecha_fin)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Premios ganados */}
        <h2 className="display-title text-2xl text-ink mb-4 flex items-center gap-2">
          <MSym name="emoji_events" className="text-gold text-[26px]" /> Tus premios ganados
        </h2>
        {premios.length === 0 ? (
          <div className="card p-8 text-center text-surface-400">Aún no tenés premios. ¡Seguí reservando para ganar! 🎁</div>
        ) : (
          <div className="grid gap-3">
            {premios.map((p) => (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="icon-chip bg-gold/15 text-gold"><MSym name="card_giftcard" className="text-[22px]" /></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{p.descripcion}</p>
                    <span className={`text-xs ${p.tipo === 'premium' ? 'text-brand-600' : 'text-surface-400'}`}>Nivel {p.tipo}</span>
                  </div>
                </div>
                <span className={`badge flex-shrink-0 ${p.estado_canje === 'canjeado' ? 'badge-gray' : 'badge-green'}`}>
                  {p.estado_canje === 'canjeado' ? 'Ya canjeado' : 'Disponible'}
                </span>
              </div>
            ))}
          </div>
        )}
      </>
      )}
    </div>
  );
}
