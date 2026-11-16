import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MSym from './MSym';
import { FEATURES } from '../config/features';

/**
 * Banners deportivos premium (estilo Netflix / FIFA+).
 * `accion` puede ser:
 *   { tipo: 'scroll', destino: 'canchas' }  → hace scroll a un id en la página
 *   { tipo: 'ruta',   destino: '/torneos' } → navega a una ruta
 */
// 📷 Las imágenes salen de `public/` (EPN1..EPN4.jpg). Si un archivo no existe,
// el slide igual se ve: el `onError` esconde la <img> y queda el degradado azul.
// ⚠️ El hero es una franja APAISADA (72vh de alto, ancho completo). Una foto
// vertical se recorta muchísimo; por eso las verticales llevan `pos:
// 'object-top'`. Lo ideal es reemplazarlas por fotos horizontales de 1600px o
// más de ancho. Si se reconocen caras, hace falta consentimiento.
// ⚠️ Slides FIJOS de marca: dejalos atemporales (sin fechas/eventos que caduquen).
// Lo que cambia con el tiempo (Mundial, un torneo puntual, un 2x1) cargalo como
// PROMOCIÓN en /admin/promociones → entra al carrusel y lo borrás cuando quieras.
const SLIDES = [
  {
    etiqueta: '🏅 PoliSport EPN',
    titulo: 'Tu espacio. Tu deporte. Tu Politécnica.',
    subtitulo: 'Reservá los escenarios deportivos de la EPN y entrá con tu código QR.',
    cta: 'Reservar ahora',
    accion: { tipo: 'scroll', destino: 'canchas' },
    gradient: 'from-[#0D1F3C] via-[#16305C]/80 to-transparent',
    img: '/EPN1.jpg',
  },
  {
    etiqueta: '🎒 Implementos deportivos',
    titulo: 'Balones, redes y conos para tu partido.',
    subtitulo: 'Pedilos prestados junto con tu reserva y devolvelos al terminar.',
    cta: 'Ver implementos',
    accion: { tipo: 'ruta', destino: '/tienda' },
    gradient: 'from-[#0D1F3C] via-[#1E3E72]/80 to-transparent',
    img: '/EPN2.jpg',
    flag: 'TIENDA',
  },
  {
    etiqueta: '🎟️ Acceso con QR',
    titulo: 'Tu credencial, en el celular.',
    subtitulo: 'Al confirmarse tu reserva recibís un código único para la entrada.',
    cta: 'Reservar ahora',
    accion: { tipo: 'scroll', destino: 'canchas' },
    gradient: 'from-[#0D1F3C] via-[#7d0e13]/70 to-transparent',
    img: '/EPN3.jpg',
    pos: 'object-top',   // foto vertical: se recorta desde arriba
  },
  {
    etiqueta: '🏫 Escuela Politécnica Nacional',
    titulo: 'El deporte también es parte de la Poli.',
    subtitulo: 'Canchas, coliseo y pista atlética abiertos a toda la comunidad politécnica.',
    cta: 'Ver espacios',
    accion: { tipo: 'scroll', destino: 'canchas' },
    gradient: 'from-[#0D1F3C] via-[#16305C]/80 to-transparent',
    img: '/EPN4.jpg',
    pos: 'object-top',   // foto vertical: se recorta desde arriba
  },
  // Este slide NO se ve hoy: TORNEOS está apagado en config/features.js.
  // Queda escrito para que aparezca solo si algún día se prende ese módulo.
  {
    etiqueta: '🏆 Torneos internos',
    titulo: 'Representá a tu facultad.',
    subtitulo: 'Inscribí tu equipo y competí en los torneos de la Politécnica.',
    cta: 'Inscribirme',
    accion: { tipo: 'ruta', destino: '/torneos' },
    gradient: 'from-[#0D1F3C] via-[#7d0e13]/70 to-transparent',
    img: '/EPN2.jpg',
    flag: 'TORNEOS',
  },
// Sin `flag` el slide siempre se ve; con flag, solo si ese módulo está prendido.
].filter((s) => !s.flag || FEATURES[s.flag]);

const DURACION = 6000;

/**
 * HeroBanner — carrusel del inicio.
 * Recibe `promos` (las promociones marcadas para mostrar en inicio) y las
 * agrega como slides al final de los banners de marca.
 */
export default function HeroBanner({ promos = [] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const navigate = useNavigate();

  // Promos → slides (usan su propia imagen/título/descripción)
  const slides = useMemo(() => {
    const promoSlides = promos.map((p) => ({
      etiqueta: '🔥 Promoción',
      titulo: p.titulo,
      subtitulo: p.descripcion || 'Aprovechá esta promoción por tiempo limitado.',
      cta: 'Reservá tu cancha',
      accion: { tipo: 'scroll', destino: 'canchas' },
      gradient: 'from-brand-900 via-surface-950 to-black',
      img: p.imagen_url || '',
    }));
    return [...SLIDES, ...promoSlides];
  }, [promos]);

  const total = slides.length;

  // Si el total cambia (cargaron promos) y el índice quedó fuera de rango, lo reseteamos
  useEffect(() => { setIndice((i) => (i >= total ? 0 : i)); }, [total]);

  const ir = useCallback((i) => setIndice((i + total) % total), [total]);
  const siguiente = useCallback(() => ir(indice + 1), [indice, ir]);
  const anterior = useCallback(() => ir(indice - 1), [indice, ir]);

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % total), DURACION);
    return () => clearInterval(t);
  }, [pausado, total]);

  const ejecutarAccion = (accion) => {
    if (accion.tipo === 'ruta') navigate(accion.destino);
    else document.getElementById(accion.destino)?.scrollIntoView({ behavior: 'smooth' });
  };

  const slide = slides[indice] || slides[0];

  return (
    <div
      className="relative w-full h-[72vh] min-h-[440px] max-h-[680px] overflow-hidden rounded-b-3xl md:rounded-3xl"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <AnimatePresence>
        <motion.div
          key={indice}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {/* Capa base de color */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
          {/* Imagen */}
          <img
            src={slide.img}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${slide.pos || 'object-center'} opacity-95`}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {/* Oscurecido: lo mínimo para que el texto blanco se lea encima.
              Si querés ver AÚN más la foto, bajá estos dos valores (el primero
              oscurece desde abajo, el segundo desde la izquierda, que es donde
              va el texto). Si los sacás del todo, el titular se pierde sobre
              las zonas claras de la imagen. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Contenido */}
      <div className="relative h-full flex flex-col justify-end md:justify-center max-w-7xl mx-auto px-6 md:px-12 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={indice}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs md:text-sm font-semibold text-white mb-4">
              {slide.etiqueta}
            </span>
            <h1 className="display-title text-4xl md:text-7xl text-white drop-shadow-2xl">
              {slide.titulo}
            </h1>
            <p className="text-white/90 text-sm md:text-lg mt-4 max-w-xl drop-shadow-lg">{slide.subtitulo}</p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <button
                onClick={() => ejecutarAccion(slide.accion)}
                className="btn-primary btn-lg hover:scale-105 shadow-glow-md"
              >
                <MSym name="event_available" className="text-[20px]" /> {slide.cta}
              </button>
              {FEATURES.TIENDA && (
                <button
                  onClick={() => navigate('/tienda')}
                  className="btn-lg inline-flex items-center gap-2 rounded-xl border border-white/25 text-white font-medium hover:bg-white/10 transition-colors"
                >
                  <MSym name="sports_soccer" className="text-[20px]" /> Ver implementos
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Flechas */}
      <button
        onClick={anterior}
        className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      <button
        onClick={siguiente}
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => ir(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === indice ? 'w-8 bg-brand-500 shadow-glow-sm' : 'w-2.5 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Ir al banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
