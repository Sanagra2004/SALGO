// SALGO — adaptador de datos sobre localStorage.
//
// Es la ÚNICA parte de la app que habla con localStorage. Todo lo demás usa la
// interfaz de `store.js`, que es asíncrona a propósito: el día que enchufemos
// Supabase se escribe `store.supabase.js` con estos mismos métodos y se cambia
// una línea en `store.js`. Ninguna pantalla se entera.
//
// LIMITACIÓN CONOCIDA: los datos viven en el teléfono de cada usuario. El chat,
// el "voy" y la afluencia NO se comparten entre personas todavía. Eso llega con
// el backend (Etapa 1) — ver docs/ROADMAP.md.

const KEY_PLACES = 'salgo_places';
const KEY_GOING = 'salgo_going';
const KEY_MSGS = 'salgo_msgs';
const KEY_SEEDED = 'salgo_seeded_v1';

const SEED_URL = new URL('../data/places.mdp.json', import.meta.url);

/** Suscriptores por tema. En Etapa 1 esto lo reemplaza el realtime de Supabase. */
const listeners = new Map();

function emit(topic, payload) {
  (listeners.get(topic) || []).forEach((cb) => {
    try { cb(payload); } catch (err) { console.warn('[store] listener', topic, err); }
  });
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn('[store] no pude leer', key, err);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // Puede fallar por cuota llena o modo privado en iOS.
    console.warn('[store] no pude guardar', key, err);
    return false;
  }
}

/**
 * Lleva un lugar a la forma canónica.
 * El prototipo arrastraba pares de campos duplicados (ico/icon, rat/rating,
 * ent/entrada, cons/consumo, hrs/horario) porque el admin guardaba con nombres
 * distintos a los de la app. Acá se unifica una sola vez.
 */
function normalize(place) {
  const p = { ...place };
  p.id = Number(p.id);
  p.name = String(p.name || 'Sin nombre');
  p.city = p.city || 'Mar del Plata';
  p.type = p.type || 'Bar';
  p.icon = p.icon || p.ico || '📍';
  p.rating = Number(p.rating ?? p.rat ?? 4);
  p.crowd = Number(p.crowd ?? 0);
  p.going = Number(p.going ?? 0);
  p.open = p.open !== false;
  p.entrada = p.entrada || p.ent || 'Sin entrada';
  p.consumo = p.consumo || p.cons || '-';
  p.horario = p.horario || p.hrs || '-';
  p.cat = Array.isArray(p.cat) ? p.cat : (Array.isArray(p.cats) ? p.cats : [p.type]);
  p.color1 = p.color1 || p.color || '#ff2d78';
  p.color2 = p.color2 || '#b44dff';
  p.badge = p.badge || (p.genre ? p.genre.toUpperCase() : p.type.toUpperCase());
  p.genre = p.genre || p.type;
  p.lat = Number.isFinite(Number(p.lat)) ? Number(p.lat) : null;
  p.lng = Number.isFinite(Number(p.lng)) ? Number(p.lng) : null;
  p.msgs = Array.isArray(p.msgs) ? p.msgs : [];
  delete p.ico; delete p.rat; delete p.ent; delete p.cons; delete p.hrs; delete p.cats;
  delete p.dist; // la distancia ahora se calcula contra la ubicación real del usuario
  return p;
}

let cache = null;

/** Carga los 30 lugares semilla la primera vez que se abre la app. */
async function seedIfNeeded() {
  if (localStorage.getItem(KEY_SEEDED)) return;
  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const seed = await res.json();
    write(KEY_PLACES, seed);
    localStorage.setItem(KEY_SEEDED, '1');
  } catch (err) {
    console.warn('[store] no pude cargar los lugares iniciales', err);
  }
}

async function allPlaces() {
  if (cache) return cache;
  await seedIfNeeded();
  const stored = read(KEY_PLACES, []);
  cache = (Array.isArray(stored) ? stored : []).map(normalize);
  return cache;
}

function invalidate() {
  cache = null;
}

export const localStore = {
  /** Lista de ciudades que hoy tienen al menos un lugar cargado. */
  async getCitiesWithPlaces() {
    const places = await allPlaces();
    return [...new Set(places.map((p) => p.city))].sort();
  },

  async getPlaces({ city } = {}) {
    const places = await allPlaces();
    return city ? places.filter((p) => p.city === city) : places.slice();
  },

  async getPlace(id) {
    const places = await allPlaces();
    return places.find((p) => p.id === Number(id)) || null;
  },

  async savePlace(place) {
    const places = await allPlaces();
    const clean = normalize(place);
    if (!clean.id) clean.id = places.length ? Math.max(...places.map((p) => p.id)) + 1 : 1;
    const idx = places.findIndex((p) => p.id === clean.id);
    if (idx >= 0) places[idx] = clean; else places.push(clean);
    write(KEY_PLACES, places);
    invalidate();
    emit('places', null);
    return clean;
  },

  async deletePlace(id) {
    const places = await allPlaces();
    const next = places.filter((p) => p.id !== Number(id));
    write(KEY_PLACES, next);
    invalidate();
    emit('places', null);
  },

  async replaceAllPlaces(list) {
    write(KEY_PLACES, (list || []).map(normalize));
    localStorage.setItem(KEY_SEEDED, '1');
    invalidate();
    emit('places', null);
  },

  /** Restaura los 30 lugares de Mar del Plata que vienen de fábrica. */
  async resetToSeed() {
    localStorage.removeItem(KEY_SEEDED);
    localStorage.removeItem(KEY_PLACES);
    invalidate();
    await allPlaces();
    emit('places', null);
  },

  async getMessages(placeId) {
    const stored = read(KEY_MSGS, {});
    if (stored[placeId]) return stored[placeId];
    const place = await this.getPlace(placeId);
    return place ? place.msgs.slice() : [];
  },

  async sendMessage(placeId, message) {
    const stored = read(KEY_MSGS, {});
    const current = stored[placeId] || (await this.getMessages(placeId));
    const next = [...current, message];
    stored[placeId] = next;
    write(KEY_MSGS, stored);
    emit('messages:' + placeId, next);
    return next;
  },

  async getGoing() {
    return read(KEY_GOING, []);
  },

  async isGoing(placeId) {
    return (await this.getGoing()).includes(Number(placeId));
  },

  async toggleGoing(placeId) {
    const id = Number(placeId);
    const going = await this.getGoing();
    const next = going.includes(id) ? going.filter((x) => x !== id) : [...going, id];
    write(KEY_GOING, next);
    emit('going', next);
    return next.includes(id);
  },

  subscribe(topic, cb) {
    if (!listeners.has(topic)) listeners.set(topic, []);
    listeners.get(topic).push(cb);
    return () => {
      const arr = listeners.get(topic) || [];
      const i = arr.indexOf(cb);
      if (i >= 0) arr.splice(i, 1);
    };
  },
};
