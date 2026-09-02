// SALGO — selector de ciudad.
//
// En el prototipo la ciudad era decorativa: elegías Madrid y seguías viendo
// los 30 boliches de Mar del Plata. Ahora filtra de verdad contra `place.city`
// y, si la ciudad no tiene lugares cargados, se dice claramente en vez de
// mostrar datos de otra ciudad.

import { store } from './store.js';
import { escapeHtml, showToast, $ } from './ui.js';
import { CITY_CENTERS } from './geo.js';

const KEY_CITY = 'salgo_city';

export const CITIES = [
  { name: 'Mar del Plata', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Buenos Aires', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Córdoba', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Rosario', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Mendoza', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Salta', country: 'Argentina', flag: '🇦🇷' },
  { name: 'Montevideo', country: 'Uruguay', flag: '🇺🇾' },
  { name: 'Santiago', country: 'Chile', flag: '🇨🇱' },
  { name: 'Lima', country: 'Perú', flag: '🇵🇪' },
  { name: 'Bogotá', country: 'Colombia', flag: '🇨🇴' },
  { name: 'Ciudad de México', country: 'México', flag: '🇲🇽' },
  { name: 'Madrid', country: 'España', flag: '🇪🇸' },
  { name: 'Barcelona', country: 'España', flag: '🇪🇸' },
  { name: 'Miami', country: 'USA', flag: '🇺🇸' },
  { name: 'Nueva York', country: 'USA', flag: '🇺🇸' },
  { name: 'Londres', country: 'UK', flag: '🇬🇧' },
  { name: 'París', country: 'Francia', flag: '🇫🇷' },
  { name: 'Ibiza', country: 'España', flag: '🇪🇸' },
  { name: 'Cancún', country: 'México', flag: '🇲🇽' },
];

let currentCity = localStorage.getItem(KEY_CITY) || 'Mar del Plata';
let citiesWithPlaces = [];
let query = '';

export const getCity = () => currentCity;
export const getCityCenter = () => CITY_CENTERS[currentCity] || CITY_CENTERS['Mar del Plata'];

export async function initCities() {
  citiesWithPlaces = await store.getCitiesWithPlaces();
  updateCityDisplay();
}

export function updateCityDisplay() {
  document.querySelectorAll('.city-display').forEach((el) => { el.textContent = currentCity; });
}

export function openCityModal() {
  query = '';
  const inp = $('city-search-inp');
  if (inp) inp.value = '';
  renderCityList();
  $('city-modal')?.classList.add('show');
  setTimeout(() => inp?.focus(), 400);
}

export function closeCityModal() {
  $('city-modal')?.classList.remove('show');
}

export function filterCities(q) {
  query = String(q || '').toLowerCase().trim();
  renderCityList();
}

function renderCityList() {
  const el = $('city-list');
  if (!el) return;
  const list = CITIES.filter((c) =>
    !query || c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query));

  if (!list.length) {
    el.innerHTML = '<div class="list-empty">Ninguna ciudad coincide. Podés escribirla abajo.</div>';
    return;
  }

  el.innerHTML = list.map((c) => {
    const activa = c.name === currentCity;
    // Marcamos qué ciudades tienen lugares de verdad: es información honesta
    // y le muestra al equipo dónde falta cargar contenido.
    const cargada = citiesWithPlaces.includes(c.name);
    return `
      <div class="city-row ${activa ? 'active' : ''}" data-city="${escapeHtml(c.name)}">
        <div class="city-flag">${c.flag}</div>
        <div class="city-info">
          <div class="city-name">${escapeHtml(c.name)}</div>
          <div class="city-country">${escapeHtml(c.country)}</div>
        </div>
        <div class="city-status ${cargada ? 'ok' : 'soon'}">${cargada ? 'Disponible' : 'Próximamente'}</div>
      </div>`;
  }).join('');
}

export async function selectCity(name) {
  currentCity = name;
  localStorage.setItem(KEY_CITY, name);
  updateCityDisplay();
  renderCityList();
  setTimeout(closeCityModal, 350);

  const { reload } = await import('./places.js');
  await reload();

  showToast(citiesWithPlaces.includes(name)
    ? '📍 Ciudad cambiada a ' + name
    : '📍 ' + name + ' todavía no tiene lugares cargados');
}

export function setCustomCity() {
  const inp = $('city-custom-inp');
  const val = (inp?.value || '').trim();
  if (!val) { showToast('❌ Escribí el nombre de la ciudad'); return; }
  if (!CITIES.some((c) => c.name.toLowerCase() === val.toLowerCase())) {
    CITIES.unshift({ name: val, country: 'Ciudad personalizada', flag: '📍' });
  }
  if (inp) inp.value = '';
  selectCity(val);
}

/** Un solo listener para toda la lista de ciudades. */
export function bindCityEvents() {
  $('city-list')?.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-city]');
    if (row) selectCity(row.dataset.city);
  });
}
