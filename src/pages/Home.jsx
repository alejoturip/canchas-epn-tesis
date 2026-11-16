import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
// 1. IMPORTAMOS TU MODAL DE RESERVAS DE LA FASE 3
import ReservaModal from '../components/ReservaModal';
import HeroBanner from '../components/HeroBanner';
import SponsorsCarousel from '../components/SponsorsCarousel';
import MSym from '../components/MSym';
import { CanchasSkeleton } from '../components/Skeletons';
import { useGeolocation } from '../hooks/useGeolocation';
import { calcularDistancia, formatDistancia } from '../utils/geo';
import { FEATURES } from '../config/features';
import { useAuth } from '../context/AuthContext';

// Accesos rápidos: un acento de color por categoría.
// `flag: null` = siempre visible. Con un flag, aparece solo si está prendido.
const ACCESOS = [
  { to: '/mis-reservas', icon: 'event',         label: 'Mis Reservas', chip: 'bg-cat-blue/15 text-cat-blue',     flag: null           },
  { to: '/tienda',       icon: 'sports_soccer', label: 'Implementos',  chip: 'bg-pitch/15 text-pitch',           flag: 'TIENDA'       },
  { to: '/premios',      icon: 'star',          label: 'Premios',      chip: 'bg-gold/15 text-gold',             flag: 'FIDELIZACION' },
  { to: '/torneos',      icon: 'trophy',        label: 'Torneos',      chip: 'bg-cat-violet/15 text-cat-violet', flag: 'TORNEOS'      },
  { to: '/soporte',      icon: 'support_agent', label: 'Soporte',      chip: 'bg-brand-500/15 text-brand-600',   flag: 'SOPORTE'      },
  { to: '/sponsors',     icon: 'handshake',     label: 'Sponsors',     chip: 'bg-cat-teal/15 text-cat-teal',     flag: 'SPONSORS'     },
].filter((a) => a.flag === null || FEATURES[a.flag]);

// Pasos de "¿Cómo funciona?"
const PASOS = [
  { n: 1, icon: 'sports_soccer',        titulo: 'Elegí tu cancha',          desc: 'Filtrá por zona, tipo y horario.' },
  { n: 2, icon: 'task_alt',             titulo: 'Esperá la aprobación',     desc: 'El encargado confirma tu reserva.' },
  { n: 3, icon: 'confirmation_number', titulo: 'Mostrá tu QR',             desc: 'Presentá tu código en la entrada y a jugar.' },
];

export default function Home() {
  const { perfil } = useAuth();
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState([]);

  // 2. ESTADO PARA SABER QUÉ CANCHA SELECCIONÓ EL CLIENTE
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);

  // 🌍 Geolocalización: "Canchas cerca de ti"
  const { coords, loading: geoLoading, error: geoError, solicitar } = useGeolocation();

  useEffect(() => {
    let montado = true;

    const fetchCanchas = async () => {
      try {
        const { data, error } = await supabase
          .from('canchas')
          .select('*')
          .eq('activa', true)
          .order('id', { ascending: true });

        if (!error && montado) {
          setCanchas(data);
        }
      } catch (err) {
        console.error("Error cargando canchas", err);
      } finally {
        if (montado) setLoading(false);
      }
    };

    fetchCanchas();

    const canal = supabase
      .channel('canchas_cambios_seguro')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canchas' }, () => {
        if (montado) fetchCanchas();
      })
      .subscribe();

    return () => {
      montado = false;
      supabase.removeChannel(canal);
    };
  }, []);

  // Promociones destacadas en el Home (las marcadas en /admin/promociones)
  useEffect(() => {
    supabase
      .from('promociones')
      .select('*')
      .eq('activa', true)
      .eq('mostrar_en_inicio', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPromos(data || []));
  }, []);

  // Si tenemos la ubicación del usuario, calculamos distancias y ordenamos por cercanía
  const canchasMostradas = useMemo(() => {
    if (!coords) return canchas;
    return canchas
      .map((c) => ({ ...c, _distancia: calcularDistancia(coords.lat, coords.lng, c.latitud, c.longitud) }))
      .sort((a, b) => {
        if (a._distancia == null) return 1;
        if (b._distancia == null) return -1;
        return a._distancia - b._distancia;
      });
  }, [canchas, coords]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      {/* 🎬 Hero Banner cinematográfico (incluye las promos del inicio) */}
      <HeroBanner promos={promos} />

      <div className="px-4 md:px-8 max-w-7xl mx-auto">

      {/* Saludo al estudiante + accesos rápidos.
          Antes este bloque se montaba sobre el hero con un margen negativo,
          pero al sumarle el saludo el texto oscuro caía encima de la foto y no
          se leía. Ahora arranca debajo, sobre el fondo blanco. */}
      <div className="relative z-10 mt-8 mb-14">
        <div className="mb-5 px-1">
          <h2 className="display-title text-xl md:text-2xl text-ink">
            Hola{perfil?.nombre ? `, ${perfil.nombre.split(' ')[0]}` : ''} 👋
          </h2>
          <p className="text-surface-400 text-sm mt-0.5">¿Qué querés hacer hoy?</p>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          {ACCESOS.map((a) => (
            <motion.div variants={itemVariants} key={a.to}>
              <Link
                to={a.to}
                className="card p-4 flex flex-col items-center justify-center gap-3 h-full transition-all duration-300 hover:-translate-y-1 hover:border-line group"
                style={{ background: '#FFFFFF' }}
              >
                <span className={`icon-chip ${a.chip} group-hover:scale-110 transition-transform`}>
                  <MSym name={a.icon} className="text-[24px]" />
                </span>
                <span className="font-semibold text-xs md:text-sm text-surface-200 text-center">{a.label}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Las promociones del inicio se muestran en el carrusel de arriba (HeroBanner). */}

      {/* ❓ ¿Cómo funciona? */}
      <div className="mb-14 relative overflow-hidden rounded-3xl border border-line p-7 md:p-10"
        style={{ background: 'linear-gradient(120deg, rgba(30,62,114,.07), rgba(240,179,35,.12))' }}>
        <div className="text-center mb-8">
          <h2 className="display-title text-2xl md:text-3xl text-ink">¿Cómo funciona?</h2>
          <p className="text-surface-300 mt-2">Reservá en 3 pasos simples.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PASOS.map((p) => (
            <div key={p.n} className="card p-6 flex flex-col gap-3" style={{ background: '#FFFFFF' }}>
              <div className="flex items-center gap-3">
                <span className="display-title text-2xl text-white w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-sm">
                  {p.n}
                </span>
                <MSym name={p.icon} className="text-surface-500 text-[26px] ml-auto" />
              </div>
              <h3 className="font-bold text-ink text-lg mt-1">{p.titulo}</h3>
              <p className="text-surface-400 text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Listado de Canchas */}
      <div id="canchas" className="mb-8 scroll-mt-24">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="display-title text-2xl md:text-3xl text-ink flex items-center gap-2">
              {coords && <MSym name="location_on" className="text-brand-500 text-[26px]" fill />}
              {coords ? 'Canchas cerca de ti' : 'Nuestras Canchas'}
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              {coords ? 'Ordenadas por distancia desde tu ubicación' : 'Reserva tu espacio ahora mismo'}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button onClick={solicitar} disabled={geoLoading} className="btn-secondary btn-sm">
              <MSym name={geoLoading ? 'progress_activity' : 'near_me'} className={`text-[18px] ${geoLoading ? 'animate-spin' : ''}`} />
              {coords ? 'Actualizar ubicación' : 'Canchas cerca de ti'}
            </button>
            {geoError && <span className="text-xs text-red-700">{geoError}</span>}
          </div>
        </motion.div>

        {loading ? (
          <CanchasSkeleton />
        ) : canchas.length === 0 ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-12 text-center text-surface-400 border-dashed border-2 border-surface-700"
          >
            No hay canchas disponibles en este momento.
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {canchasMostradas.map((cancha) => {
              const distanciaTxt = formatDistancia(cancha._distancia);
              return (
              <motion.div variants={itemVariants} key={cancha.id} className="card-hover flex flex-col overflow-hidden group">
                <Link to={`/cancha/${cancha.id}`} className="block h-48 bg-surface-900 relative overflow-hidden">
                  {cancha.imagen_url ? (
                    <img src={cancha.imagen_url} alt={cancha.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-surface-500 bg-surface-800">
                      Sin imagen
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className="badge shadow-card backdrop-blur-md bg-pitch/20 border border-pitch/40 text-pitch">
                      <span className="w-1.5 h-1.5 rounded-full bg-pitch" /> Disponible
                    </span>
                    {distanciaTxt && (
                      <span className="badge shadow-card backdrop-blur-md bg-slate-900/40 border border-line text-white">
                        <MSym name="location_on" className="text-[14px]" /> a {distanciaTxt}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-5 flex flex-col flex-1 bg-gradient-to-b from-surface-800 to-surface-900">
                  <Link to={`/cancha/${cancha.id}`} className="font-bold text-xl text-ink mb-1 hover:text-brand-600 transition-colors">{cancha.nombre}</Link>
                  <p className="text-surface-400 text-sm mb-4 line-clamp-2">{cancha.descripcion}</p>

                  <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                    <div>
                      {FEATURES.PAGOS ? (
                        <>
                          <p className="text-xs text-surface-400">Precio por hora</p>
                          <p className="text-pitch font-display text-2xl leading-none">
                            ${cancha.precio_hora}<span className="text-surface-500 text-sm font-sans">/hora</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-surface-400">Uso</p>
                          <p className="text-pitch font-display text-2xl leading-none">Sin costo</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/cancha/${cancha.id}`} className="btn-secondary btn-sm">Ver más</Link>
                      {/* 3. AQUÍ LE DAMOS VIDA AL BOTÓN */}
                      <button
                        onClick={() => setCanchaSeleccionada(cancha)}
                        className="btn-primary btn-sm hover:scale-105 transition-transform shadow-glow-sm"
                      >
                        Reservar <MSym name="arrow_forward" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );})}
          </motion.div>
        )}
      </div>

      {/* 🤝 Sponsors (carrusel automático) — apagado en la versión tesis */}
      {FEATURES.SPONSORS && (
        <SponsorsCarousel titulo="Marcas que nos apoyan" subtitulo="Gracias a ellas seguís jugando." />
      )}

      {/* 4. RENDERIZAMOS EL MODAL SI HAY UNA CANCHA SELECCIONADA */}
      {canchaSeleccionada && (
        <ReservaModal
          cancha={canchaSeleccionada}
          onClose={() => setCanchaSeleccionada(null)}
        />
      )}

      </div>
    </>
  );
}
