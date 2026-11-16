import { useState, useCallback } from 'react';

/**
 * useGeolocation — Solicita la ubicación del usuario bajo demanda.
 * No pide permiso al montar; el usuario debe llamar a `solicitar()`.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        const msgs = {
          1: 'Permiso de ubicación denegado.',
          2: 'No se pudo obtener tu ubicación.',
          3: 'La solicitud de ubicación tardó demasiado.',
        };
        setError(msgs[err.code] || 'Error al obtener la ubicación.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { coords, error, loading, solicitar };
}
