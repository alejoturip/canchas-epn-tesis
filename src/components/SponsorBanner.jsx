import { useSponsors } from '../hooks/useSponsors';

/**
 * SponsorBanner — marquee horizontal infinito de logos (va en el layout).
 * Se pausa al pasar el mouse y cada logo enlaza al sitio del sponsor (si tiene).
 */
export default function SponsorBanner() {
  const { sponsors } = useSponsors();

  if (sponsors.length === 0) return null;

  // Duplicamos para el loop infinito
  const items = [...sponsors, ...sponsors];

  return (
    <div className="w-full overflow-hidden bg-surface-900/60 border-y border-line py-4 relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-surface-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-surface-900 to-transparent z-10 pointer-events-none" />

      <div className="flex items-center gap-12 w-max animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
        {items.map((sponsor, i) => {
          const logo = (
            <img
              src={sponsor.imagen_url}
              alt={sponsor.nombre}
              className="h-full w-auto max-w-[120px] object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          );
          return (
            <div
              key={`${sponsor.id}-${i}`}
              className="flex-shrink-0 h-10 flex items-center opacity-60 hover:opacity-100 transition-opacity duration-300"
            >
              {sponsor.enlace
                ? <a href={sponsor.enlace} target="_blank" rel="noopener noreferrer" className="h-full flex items-center" title={sponsor.nombre}>{logo}</a>
                : logo}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
