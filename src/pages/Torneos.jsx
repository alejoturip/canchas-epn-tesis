import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MSym from '../components/MSym';
import SponsorsCarousel from '../components/SponsorsCarousel';
import { getTorneos } from '../services/torneosService';
import { TIPOS_TORNEO } from '../utils/torneos';

const ESTADOS = {
  abierto:    { label: 'Inscripciones Abiertas', color: 'badge-green' },
  en_curso:   { label: 'En Curso',               color: 'badge-brand' },
  finalizado: { label: 'Finalizado',             color: 'badge-gray'  },
};
const tipoLabel = (v) => TIPOS_TORNEO.find((t) => t.value === v)?.label || v;

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTorneos().then((d) => { setTorneos(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-cat-violet/10 border border-cat-violet/20 flex items-center justify-center shadow-[0_0_20px_rgba(183,140,255,0.2)]">
          <MSym name="trophy" className="text-cat-violet text-[28px]" fill />
        </div>
        <div>
          <h1 className="display-title text-3xl text-ink">Torneos</h1>
          <p className="text-surface-400 text-sm mt-0.5">Competí, mirá las posiciones y llevate los premios</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><MSym name="progress_activity" className="text-[32px] text-cat-violet animate-spin" /></div>
      ) : torneos.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="card p-16 text-center border-dashed border-2 border-cat-violet/20">
          <MSym name="trophy" className="text-cat-violet/30 text-[44px] mb-4" />
          <p className="text-surface-300 font-medium">No hay torneos disponibles</p>
          <p className="text-surface-500 text-sm mt-1">¡Volvé pronto, se vienen cosas grandes!</p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {torneos.map((t) => {
            const estado = ESTADOS[t.estado] || ESTADOS.abierto;
            const equipos = t.equipos_torneo?.[0]?.count ?? 0;
            return (
              <motion.div key={t.id} variants={itemVariants}>
                <Link to={`/torneos/${t.id}`} className="card-hover flex flex-col overflow-hidden group h-full">
                  <div className="h-2.5 bg-gradient-to-r from-cat-violet via-brand-500 to-cat-violet opacity-80" />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-xl text-ink leading-tight">{t.nombre}</h3>
                      <span className={`${estado.color} flex-shrink-0`}>{estado.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="badge bg-cat-violet/15 text-cat-violet">{tipoLabel(t.tipo)}</span>
                      {t.categoria && <span className="badge-gray">{t.categoria}</span>}
                    </div>
                    <p className="text-surface-400 text-sm mb-5 line-clamp-2">{t.descripcion}</p>

                    <div className="space-y-2.5 mb-6 text-sm">
                      {t.fecha_inicio && (
                        <div className="flex items-center gap-2 text-surface-300">
                          <MSym name="calendar_month" className="text-cat-violet text-[18px]" />
                          <span>{new Date(t.fecha_inicio).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-surface-300">
                        <MSym name="groups" className="text-cat-violet text-[18px]" />
                        <span>{equipos} equipos{t.max_equipos ? ` / ${t.max_equipos}` : ''}</span>
                      </div>
                      {t.premio && (
                        <div className="flex items-center gap-2">
                          <MSym name="trophy" className="text-gold text-[18px]" />
                          <span className="text-gold font-medium">{t.premio}</span>
                        </div>
                      )}
                      {t.costo_inscripcion > 0 && (
                        <div className="flex items-center gap-2 text-surface-300">
                          <MSym name="payments" className="text-pitch text-[18px]" />
                          <span>Inscripción: <b className="text-pitch">${t.costo_inscripcion}</b></span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto w-full btn-primary justify-center group-hover:shadow-glow-md transition-shadow">
                      Ver torneo <MSym name="arrow_forward" className="text-[18px]" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="mt-12">
        <SponsorsCarousel titulo="Sponsors del torneo" subtitulo="Las marcas que hacen posible la competencia." />
      </div>
    </div>
  );
}
