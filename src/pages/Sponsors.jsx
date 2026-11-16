import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Megaphone, MessageCircle, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PAGO_CONFIG } from '../config/pago';

// Número de contacto (mismo que el de cobros). EC: se quita el 0 inicial y se antepone 593.
const WHATSAPP = `593${PAGO_CONFIG.telefono.replace(/\D/g, '').replace(/^0/, '')}`;
const WHATSAPP_MSG = encodeURIComponent(
  '¡Hola! Me interesa ser sponsor de PoliSport EPN. ¿Me cuentan los planes y beneficios?'
);

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (activo) {
          setSponsors(data || []);
          setLoading(false);
        }
      });
    return () => { activo = false; };
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10">
      {/* Encabezado */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <HeartHandshake className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-ink">Nuestros Sponsors</h1>
        <p className="text-surface-400 max-w-xl mx-auto">
          Las marcas que hacen posible que juegues. Gracias a ellas mantenemos las canchas y los premios.
        </p>
      </motion.div>

      {/* Grilla de sponsors actuales */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : sponsors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sponsors.map((s) => {
            const cuerpo = (
              <div className="group card p-6 flex flex-col items-center text-center gap-3 h-full hover:-translate-y-1 hover:border-brand-300 hover:shadow-glow-md transition-all duration-300">
                <div className="h-20 flex items-center justify-center">
                  <img
                    src={s.imagen_url}
                    alt={s.nombre}
                    className="max-h-20 max-w-[160px] object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                </div>
                <p className="font-bold text-ink">{s.nombre}</p>
                {s.descripcion && <p className="text-sm text-surface-400 line-clamp-3">{s.descripcion}</p>}
                {s.enlace && (
                  <span className="mt-auto pt-2 text-xs text-brand-600 flex items-center gap-1 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> Visitar sitio
                  </span>
                )}
              </div>
            );
            return s.enlace
              ? <a key={s.id} href={s.enlace} target="_blank" rel="noopener noreferrer">{cuerpo}</a>
              : <div key={s.id}>{cuerpo}</div>;
          })}
        </div>
      ) : (
        <div className="card p-8 text-center text-surface-400">
          <Megaphone className="w-8 h-8 mx-auto mb-3 text-surface-500" />
          Todavía no hay sponsors. <span className="text-ink font-medium">¡Podés ser el primero!</span>
        </div>
      )}

      {/* CTA: Sé sponsor */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface-800 to-surface-900 p-8 md:p-10 text-center"
      >
        <Sparkles className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-2xl md:text-3xl font-display font-bold text-ink mb-2">
          Sé sponsor de nosotros
        </h2>
        <p className="text-surface-300 max-w-xl mx-auto mb-6">
          Mostrá tu marca a todos los jugadores que reservan en nuestras canchas. Tu logo aparece en la
          app, en la pantalla de inicio y en los eventos. Planes flexibles para cualquier presupuesto.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn-lg inline-flex"
        >
          <MessageCircle className="w-5 h-5" /> Quiero ser sponsor
        </a>
        <p className="text-xs text-surface-500 mt-4">Te respondemos por WhatsApp al {PAGO_CONFIG.telefono}.</p>
      </motion.div>
    </div>
  );
}
