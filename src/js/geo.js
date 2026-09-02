// SALGO — ubicación del usuario y distancias reales.
//
// El prototipo no usaba `navigator.geolocation` en ningún lado: las distancias
// ("1.2km", "900m") estaban escritas a mano en los datos y no cambiaban nunca.
// Este módulo las calcula de verdad contra dónde está parada la persona.

/** Centro aproximado de cada ciudad, para cuando no hay permiso de GPS. */
export const CITY_CENTERS = {
  'Mar del Plata': { lat: -38.0055, lng: -57.5426 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Córdoba': { lat: -31.4201, lng: -64.1888 },
  'Rosario': { lat: -32.9442, lng: -60.6505 },
  'Mendoza': { lat: -32.8895, lng: -68.8458 },
  'Salta': { lat: -24.7859, lng: -65.4117 },
  'Montevideo': { lat: -34.9011, lng: -56.1645 },
  'Santiago': { lat: -33.4489, lng: -70.6693 },
  'Lima': { lat: -12.0464, lng: -77.0428 },
  'Bogotá': { lat: 4.7110, lng: -74.0721 },
  'Ciudad de México': { lat: 19.4326, lng: -99.1332 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3874, lng: 2.1686 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Nueva York': { lat: 40.7128, lng: -74.0060 },
  'Londres': { lat: 51.5074, lng: -0.1278 },
  'París': { lat: 48.8566, lng: 2.3522 },
  'Ibiza': { lat: 38.9067, lng: 1.4206 },
  'Cancún': { lat: 21.1619, lng: -86.8515 },
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Distancia en kilómetros entre dos puntos (fórmula del haversine). */
export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** "850m" / "2.4km" / "—" si no se puede calcular. */
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return '—';
  if (km < 1) return Math.round(km * 1000) + 'm';
  if (km < 10) return km.toFixed(1).replace('.', ',') + 'km';
  return Math.round(km) + 'km';
}

/**
 * Estado de la ubicación.
 *   source: 'gps'    → permiso concedido, posición real
 *           'ciudad' → sin permiso, usamos el centro de la ciudad elegida
 *   precise: true solo cuando viene del GPS
 */
let position = { lat: null, lng: null, source: null, precise: false };

export function getPosition() {
  return { ...position };
}

export function isPrecise() {
  return position.precise;
}

/** Fallback: centra en la ciudad elegida. Siempre deja una posición usable. */
export function useCityCenter(cityName) {
  const c = CITY_CENTERS[cityName] || CITY_CENTERS['Mar del Plata'];
  position = { lat: c.lat, lng: c.lng, source: 'ciudad', precise: false };
  return getPosition();
}

/**
 * Pide la ubicación al navegador.
 *
 * Se llama DESPUÉS del primer render, nunca al abrir la app: si el permiso
 * salta antes de que la persona vea nada, la mayoría lo rechaza.
 *
 * Nunca rechaza la promesa ni bloquea: si el usuario dice que no, si tarda más
 * de 8 segundos o si el navegador no soporta geolocalización, cae al centro de
 * la ciudad y la app sigue andando igual.
 */
export function requestLocation(cityName, { timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(useCityCenter(cityName));
      return;
    }
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
          precise: true,
        };
        done(getPosition());
      },
      () => done(useCityCenter(cityName)),
      { enableHighAccuracy: true, timeout, maximumAge: 5 * 60 * 1000 }
    );

    // Red de seguridad: algunos navegadores no respetan su propio timeout.
    setTimeout(() => done(useCityCenter(cityName)), timeout + 500);
  });
}

/** Devuelve los lugares con `distKm` y `dist` calculados, ordenados por cercanía. */
export function withDistances(places, from = position) {
  return places
    .map((p) => {
      const distKm = distanceKm(from, p);
      return { ...p, distKm, dist: formatDistance(distKm) };
    })
    .sort((a, b) => {
      if (a.distKm == null) return 1;
      if (b.distKm == null) return -1;
      return a.distKm - b.distKm;
    });
}
