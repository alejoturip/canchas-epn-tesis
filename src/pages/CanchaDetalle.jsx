import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Clock, DollarSign, Loader2, Navigation,
  ExternalLink, CalendarCheck, ImageOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCanchaById } from '../services/supabaseService';
import { useGeolocation } from '../hooks/useGeolocation';
import { calcularDistancia, formatDistancia, linkGoogleMaps, linkComoLlegar } from '../utils/geo';
import { formatPrecio } from '../utils/formatters';
import { horariosBase, formatHorario, atiendeHoy } from '../utils/horarios';
import MapaCancha from '../components/MapaCancha';
import ReservaModal from '../components/ReservaModal';
import { FEATURES } from '../config/features';

export default function CanchaDetalle() {
  const { id } = useParams();
  const [cancha, setCancha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ocupados, setOcupados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);

  const { coords, loading: geoLoading, solicitar } = useGeolocation();

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const { data } = await getCanchaById(id);
      if (activo) {
        setCancha(data);
        setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [id]);

  // Disponibilidad de hoy
  useEffect(() => {
    if (!cancha) return;
    const hoy = new Date().toISOString().split('T')[0];
    supabase
      .from('reservas')
      .select('hora_inicio, hora_fin')
      .eq('cancha_id', cancha.id)
      .eq('fecha', hoy)
      .in('estado', ['pendiente', 'confirmada'])
      .then(({ data }) => {
        const horas = [];
        (data || []).forEach((r) => {
          const ini = parseInt(r.hora_inicio.split(':')[0]);
          const fin = parseInt(r.hora_fin.split(':')[0]);
          for (let h = ini; h < fin; h++) horas.push(`${h < 10 ? '0' : ''}${h}:00`);
        });
        setOcupados(horas);
      });
  }, [cancha]);

  const HORARIOS_BASE = useMemo(() => horariosBase(cancha), [cancha]);
  const abiertoHoy = atiendeHoy(cancha);
  const horario = formatHorario(cancha);

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;
  }

  if (!cancha) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-surface-400 mb-4">No encontramos esta cancha.</p>
        <Link to="/" className="btn-primary">Volver al inicio</Link>
      </div>
    );
  }

  const distanciaKm = coords
    ? calcularDistancia(coords.lat, coords.lng, cancha.latitud, cancha.longitud)
    : null;
  const distanciaTxt = formatDistancia(distanciaKm);
  const disponiblesHoy = abiertoHoy ? HORARIOS_BASE.filter((h) => !ocupados.includes(h)).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto p-4 md:p-8 space-y-6"
    >
      {/* Volver */}
      <Link to="/" className="inline-flex items-center gap-2 text-surface-400 hover:text-ink transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver a canchas
      </Link>

      {/* Galería / Hero */}
      <div className="rounded-3xl overflow-hidden border border-line h-64 md:h-96 bg-surface-900 relative">
        {cancha.imagen_url ? (
          <img src={cancha.imagen_url} alt={cancha.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-surface-500 gap-2">
            <ImageOff className="w-12 h-12" /> Sin imagen
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-5 md:p-8">
          <span className="badge badge-green mb-2 backdrop-blur-md bg-green-500/20 border border-green-300">Disponible</span>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white drop-shadow-lg">{cancha.nombre}</h1>
          {cancha.direccion && (
            <p className="text-white/85 text-sm mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-white/70" /> {cancha.direccion}
              {distanciaTxt && <span className="text-white font-medium">· a {distanciaTxt}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna izquierda: info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          {cancha.descripcion && (
            <div className="card p-6">
              <h2 className="font-bold text-lg text-ink mb-2">Sobre esta cancha</h2>
              <p className="text-surface-300 text-sm leading-relaxed">{cancha.descripcion}</p>
            </div>
          )}

          {/* Horarios */}
          <div className="card p-6">
            <h2 className="font-bold text-lg text-ink mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" /> Horarios de atención
            </h2>
            <p className="text-surface-300 text-sm">
              <strong className="text-ink">{horario.diasTxt}</strong> de <strong className="text-ink">{horario.horas}</strong>.
            </p>
          </div>

          {/* Disponibilidad de hoy */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-ink flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-green-700" /> Disponibilidad hoy
              </h2>
              <span className={`badge ${abiertoHoy ? 'badge-green' : 'badge-red'}`}>{abiertoHoy ? `${disponiblesHoy} libres` : 'Cerrado hoy'}</span>
            </div>
            {abiertoHoy ? (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {HORARIOS_BASE.map((h) => {
                    const ocupado = ocupados.includes(h);
                    return (
                      <div
                        key={h}
                        className={`py-2 rounded-lg text-center text-xs font-medium border ${
                          ocupado
                            ? 'bg-surface-800/40 text-surface-500 border-transparent line-through'
                            : 'bg-green-500/10 text-green-700 border-green-300'
                        }`}
                      >
                        {h}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-surface-500 mt-3">Los horarios tachados ya están reservados para hoy.</p>
              </>
            ) : (
              <p className="text-sm text-surface-400">Hoy la cancha no atiende. Atiende {horario.diasTxt.toLowerCase()} de {horario.horas}.</p>
            )}
          </div>

          {/* Ubicación + Mapa */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-lg text-ink flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" /> Ubicación
              </h2>
              {cancha.latitud != null && cancha.longitud != null && (
                <div className="flex gap-2">
                  <a
                    href={linkComoLlegar(cancha.latitud, cancha.longitud)}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-secondary btn-sm"
                  >
                    <Navigation className="w-4 h-4" /> Cómo llegar
                  </a>
                  <a
                    href={linkGoogleMaps(cancha.latitud, cancha.longitud)}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-ghost btn-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Google Maps
                  </a>
                </div>
              )}
            </div>

            {!coords && cancha.latitud != null && (
              <button onClick={solicitar} disabled={geoLoading} className="btn-ghost btn-sm mb-3">
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Calcular distancia desde mi ubicación
              </button>
            )}
            {distanciaTxt && (
              <p className="text-sm text-surface-300 mb-3">
                Estás a <strong className="text-brand-600">{distanciaTxt}</strong> de esta cancha.
              </p>
            )}

            <MapaCancha
              lat={cancha.latitud}
              lng={cancha.longitud}
              nombre={cancha.nombre}
              direccion={cancha.direccion}
              height="320px"
            />
          </div>
        </div>

        {/* Columna derecha: tarjeta de reserva (sticky) */}
        <div className="lg:col-span-1">
          <div className="card p-6 lg:sticky lg:top-24">
            {FEATURES.PAGOS ? (
              <>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-display font-bold text-brand-600">{formatPrecio(cancha.precio_hora)}</span>
                  <span className="text-surface-400 text-sm mb-1">/ hora</span>
                </div>
                <p className="text-surface-500 text-xs mb-5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Precio por hora de juego
                </p>
              </>
            ) : (
              <>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-display font-bold text-pitch">Sin costo</span>
                </div>
                <p className="text-surface-500 text-xs mb-5">
                  Escenario de la Escuela Politécnica Nacional · 1 hora por estudiante al día
                </p>
              </>
            )}

            <button onClick={() => setMostrarModal(true)} className="w-full btn-primary py-3.5 text-base font-bold">
              Reservar ahora
            </button>

            <div className="divider" />
            <ul className="text-sm text-surface-300 space-y-2">
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-500" /> {horario.diasTxt} · {horario.horas}</li>
              <li className="flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-surface-500" /> {abiertoHoy ? `${disponiblesHoy} horarios libres hoy` : 'Hoy cerrado'}</li>
              {cancha.direccion && (
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-surface-500" /> {cancha.direccion}</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {mostrarModal && (
        <ReservaModal cancha={cancha} onClose={() => setMostrarModal(false)} />
      )}
    </motion.div>
  );
}
