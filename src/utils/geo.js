/**
 * geo.js — Utilidades de geolocalización y distancias.
 */

const toRad = (grados) => (grados * Math.PI) / 180;

/**
 * Distancia en kilómetros entre dos coordenadas (fórmula de Haversine).
 * @returns {number|null} km, o null si faltan datos válidos.
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const valores = [lat1, lon1, lat2, lon2];
  if (valores.some((v) => v == null || isNaN(Number(v)))) return null;

  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formatea una distancia en km a texto legible.
 * @param {number|null} km
 * @returns {string|null}  Ej: "850 m" o "2.4 km"
 */
export function formatDistancia(km) {
  if (km == null || isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Link para abrir la ubicación en Google Maps. */
export const linkGoogleMaps = (lat, lng) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

/** Link de indicaciones ("cómo llegar") en Google Maps. */
export const linkComoLlegar = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
