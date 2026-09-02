// SALGO — mapa real con Leaflet + OpenStreetMap.
//
// Reemplaza el mapa del prototipo, que era un degradado CSS con los pines
// colocados en posiciones fijas inventadas (PIN_POSITIONS, en porcentajes):
// los lugares no caían donde están de verdad y el mapa no se podía mover.
//
// OpenStreetMap no pide API key ni tarjeta de crédito. Leaflet está en
// vendor/ para que el service worker lo cachee y la app abra sin señal.

import { getPosition, isPrecise } from './geo.js';
import { escapeHtml } from './ui.js';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
// La atribución de OSM es obligatoria por licencia (ODbL). No sacarla.
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const maps = new Map();

function crowdColor(crowd) {
  if (crowd >= 80) return '#ef4444';
  if (crowd >= 50) return '#f59e0b';
  return '#00b876';
}

/**
 * Punto compacto, para el mini-mapa del home.
 * Ahí entran 12 lugares en 190px de alto: si cada uno lleva su nombre, las
 * etiquetas se pisan y no se lee ninguna. El nombre va en el tooltip.
 */
function dotIcon(place) {
  const color = place.open ? (place.color1 || '#ff2d78') : '#f59e0b';
  return L.divIcon({
    className: 'salgo-dot',
    html: `<div class="salgo-dot-in" style="background:${escapeHtml(color)};"></div>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  });
}

/** Pin con el nombre del lugar y su afluencia, para el mapa grande. */
function placeIcon(place) {
  const color = place.open ? (place.color1 || '#ff2d78') : '#f59e0b';
  const label = escapeHtml(place.name.split(' ')[0].slice(0, 10));
  return L.divIcon({
    className: 'salgo-pin',
    html:
      `<div class="salgo-pin-bub" style="background:${escapeHtml(color)};">` +
      `${label} <span class="salgo-pin-crowd">${Number(place.crowd) || 0}%</span></div>` +
      `<div class="salgo-pin-tail" style="background:${escapeHtml(color)};"></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function userIcon() {
  return L.divIcon({
    className: 'salgo-me',
    html: '<div class="salgo-me-dot"></div><div class="salgo-me-halo"></div>',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Crea (o recupera) el mapa de un contenedor.
 * `interactive: false` para el mini-mapa del home, que es una vista previa.
 */
export function ensureMap(containerId, { zoom = 14, interactive = true } = {}) {
  if (maps.has(containerId)) return maps.get(containerId);
  const el = document.getElementById(containerId);
  if (!el || typeof L === 'undefined') return null;

  const pos = getPosition();
  const center = [pos.lat ?? -38.0055, pos.lng ?? -57.5426];

  const map = L.map(el, {
    center,
    zoom,
    zoomControl: interactive,
    dragging: interactive,
    scrollWheelZoom: false,
    doubleClickZoom: interactive,
    attributionControl: true,
  });
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

  const entry = { map, markers: L.layerGroup().addTo(map), me: null };
  maps.set(containerId, entry);
  return entry;
}

/** Dibuja los lugares y el punto del usuario, y encuadra todo. */
export function renderPlaces(containerId, places, { onSelect, fit = true, compact = false } = {}) {
  const entry = ensureMap(containerId, compact ? { zoom: 13, interactive: false } : {});
  if (!entry) return;
  const { map, markers } = entry;

  markers.clearLayers();
  const points = [];

  places
    .filter((p) => p.lat != null && p.lng != null)
    .forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: compact ? dotIcon(p) : placeIcon(p) });
      marker.on('click', () => onSelect && onSelect(p.id));
      marker.bindTooltip(
        `${escapeHtml(p.name)} · ${Number(p.crowd) || 0}% lleno`,
        { direction: 'top', offset: [0, -18] }
      );
      markers.addLayer(marker);
      points.push([p.lat, p.lng]);
    });

  const pos = getPosition();
  if (pos.lat != null) {
    if (entry.me) map.removeLayer(entry.me);
    entry.me = L.marker([pos.lat, pos.lng], {
      icon: userIcon(),
      interactive: false,
      zIndexOffset: -100,
    }).addTo(map);
    entry.me.bindTooltip(isPrecise() ? 'Estás acá' : 'Centro de la ciudad', {
      direction: 'top',
      offset: [0, -12],
    });
    points.push([pos.lat, pos.lng]);
  }

  if (fit && points.length > 1) {
    map.fitBounds(L.latLngBounds(points), {
      padding: compact ? [22, 22] : [36, 36],
      maxZoom: compact ? 14 : 15,
    });
  } else if (points.length === 1) {
    map.setView(points[0], 14);
  }

  // Leaflet calcula mal el tamaño si el contenedor estaba oculto al crearse
  // (pasa con el mapa grande, que vive en un modal).
  setTimeout(() => map.invalidateSize(), 60);
}

/** Recalcula el tamaño al abrir un modal que contiene un mapa. */
export function refresh(containerId) {
  const entry = maps.get(containerId);
  if (entry) setTimeout(() => entry.map.invalidateSize(), 60);
}

export { crowdColor };
