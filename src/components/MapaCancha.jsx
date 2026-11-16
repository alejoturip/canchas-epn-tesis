import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

/**
 * Pin personalizado (estilo Netflix rojo) usando divIcon.
 * Evita el problema de los iconos rotos de Leaflet con bundlers.
 */
const pinCancha = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        background:#DA1F26;transform:rotate(-45deg);
        box-shadow:0 0 12px rgba(218,31,38,0.7);
        border:2px solid rgba(255,255,255,0.85);">
      </div>
      <div style="
        position:absolute;top:9px;left:11px;width:14px;height:14px;
        background:#fff;border-radius:50%;"></div>
    </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

/**
 * Mapa interactivo de una cancha.
 * @param {number} lat
 * @param {number} lng
 * @param {string} nombre
 * @param {string} direccion
 * @param {string} height  altura CSS del mapa (ej: '320px')
 */
export default function MapaCancha({ lat, lng, nombre, direccion, height = '320px' }) {
  const sinCoords = lat == null || lng == null || isNaN(lat) || isNaN(lng);

  if (sinCoords) {
    return (
      <div
        className="rounded-2xl border border-dashed border-line bg-surface-900 flex flex-col items-center justify-center gap-2 text-surface-500"
        style={{ height }}
      >
        <MapPin className="w-8 h-8" />
        <p className="text-sm">Esta cancha aún no tiene ubicación registrada.</p>
      </div>
    );
  }

  const pos = [Number(lat), Number(lng)];

  return (
    <div className="relative z-0 rounded-2xl overflow-hidden border border-line shadow-card">
      <MapContainer
        center={pos}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={pos} icon={pinCancha}>
          <Popup>
            <strong>{nombre}</strong>
            {direccion ? <><br />{direccion}</> : null}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
