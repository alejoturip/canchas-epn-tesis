import { ExternalLink } from 'lucide-react';
import { useSponsors } from '../hooks/useSponsors';

/** Tarjeta individual de sponsor (logo + nombre + descripción + enlace). */
function SponsorCard({ sponsor }) {
  const cuerpo = (
    <div className="group w-60 flex-shrink-0 card p-5 flex flex-col items-center text-center gap-3 hover:-translate-y-1 hover:border-brand-300 hover:shadow-glow-md transition-all duration-300">
      <div className="h-16 flex items-center justify-center">
        <img
          src={sponsor.imagen_url}
          alt={sponsor.nombre}
          className="max-h-16 max-w-[150px] object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
        />
      </div>
      <p className="font-bold text-ink text-sm line-clamp-1">{sponsor.nombre}</p>
      {sponsor.descripcion && <p className="text-xs text-surface-400 line-clamp-2">{sponsor.descripcion}</p>}
      {sponsor.enlace && (
        <span className="mt-auto text-xs text-brand-600 flex items-center gap-1 font-medium">
          <ExternalLink className="w-3 h-3" /> Visitar
        </span>
      )}
    </div>
  );

  return sponsor.enlace
    ? <a href={sponsor.enlace} target="_blank" rel="noopener noreferrer">{cuerpo}</a>
    : cuerpo;
}

/**
 * SponsorsCarousel — carrusel automático de tarjetas de sponsors.
 * Auto-scroll infinito, se pausa al pasar el mouse, responsive.
 * Si no hay sponsors, no renderiza nada.
 */
export default function SponsorsCarousel({ titulo = 'Nuestros Sponsors', subtitulo }) {
  const { sponsors } = useSponsors();
  if (sponsors.length === 0) return null;

  // Si hay pocos, repetimos para que el loop se vea continuo.
  const base = sponsors.length < 4 ? [...sponsors, ...sponsors, ...sponsors] : sponsors;
  const items = [...base, ...base];

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-ink mb-1">{titulo}</h2>
      {subtitulo && <p className="text-surface-400 text-sm mb-5">{subtitulo}</p>}

      <div className="relative overflow-hidden py-2">
        {/* Bordes difuminados */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-surface-950 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface-950 to-transparent z-10" />

        <div className="flex gap-4 w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]">
          {items.map((s, i) => <SponsorCard key={`${s.id}-${i}`} sponsor={s} />)}
        </div>
      </div>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
