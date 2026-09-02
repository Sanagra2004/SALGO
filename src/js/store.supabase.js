// SALGO — adaptador de datos sobre Supabase.
//
// Implementa exactamente los mismos métodos que store.local.js. Ninguna
// pantalla cambia: siguen llamando a store.getPlaces(), store.sendMessage(),
// etc. La diferencia es que ahora los datos son compartidos entre usuarios.
//
// OFFLINE: los lugares se guardan en el navegador apenas se leen. Si no hay
// señal —adentro de un boliche pasa seguido— la app sigue mostrando el
// catálogo en vez de una pantalla vacía. El chat y el "voy" sí necesitan
// conexión, porque son datos de otros.

import { getClient, getUserId } from './auth.js';
import { nightOf } from './config.js';

const CACHE_PLACES = 'salgo_cache_places';

const listeners = new Map();
const channels = new Map();

function emit(topic, payload) {
  (listeners.get(topic) || []).forEach((cb) => {
    try { cb(payload); } catch (err) { console.warn('[store]', topic, err); }
  });
}

// ── traducción entre la base y la app ────────────────────────
// La base usa snake_case y nombres de columna propios (is_open, crowd_manual).
// La app espera la forma que ya usaban las pantallas en la Etapa 0. Esta
// función es la frontera: si mañana cambia el esquema, se toca solo acá.

function fromRow(row) {
  const auto = Math.min(100, Math.round((row.going_count * 100) / Math.max(row.capacity || 1, 1)));
  const manualVigente =
    row.crowd_manual != null &&
    row.crowd_manual_at &&
    Date.now() - new Date(row.crowd_manual_at).getTime() < 6 * 3600 * 1000;

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    type: row.type,
    genre: row.genre || row.type,
    badge: row.badge || (row.genre || row.type || '').toUpperCase(),
    addr: row.addr || '',
    lat: row.lat,
    lng: row.lng,
    geo: row.geo,
    entrada: row.entrada,
    consumo: row.consumo,
    horario: row.horario,
    rating: Number(row.rating),
    icon: row.icon,
    cat: row.cat || [],
    color1: row.color1,
    color2: row.color2,
    open: row.is_open,
    instagram: row.instagram,
    going: row.going_count,
    capacity: row.capacity,
    crowd: manualVigente ? row.crowd_manual : auto,
    crowdSource: manualVigente ? 'manual' : 'auto',
  };
}

function toRow(place) {
  const row = {
    name: place.name,
    city: place.city,
    type: place.type,
    genre: place.genre,
    badge: place.badge,
    addr: place.addr,
    lat: place.lat,
    lng: place.lng,
    geo: place.geo || 'exacta',
    entrada: place.entrada,
    consumo: place.consumo,
    horario: place.horario,
    rating: place.rating,
    icon: place.icon,
    cat: place.cat || [],
    color1: place.color1,
    color2: place.color2,
    is_open: place.open !== false,
    instagram: place.instagram || null,
  };
  if (place.capacity) row.capacity = place.capacity;
  // going_count lo mantiene un trigger de la base: mandarlo desde el cliente
  // sería pisar la cuenta real con un número viejo.
  return row;
}

function cacheRead() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PLACES) || '[]');
  } catch { return []; }
}

function cacheWrite(places) {
  try { localStorage.setItem(CACHE_PLACES, JSON.stringify(places)); } catch { /* cuota llena */ }
}

let placesCache = null;

// ¿El último intento de leer del servidor falló? Lo usa la pantalla para
// distinguir "esta ciudad no tiene lugares" de "no pude conectarme": son dos
// problemas distintos y merecen dos mensajes distintos.
let sinConexion = false;
export const isOffline = () => sinConexion;

async function fetchPlaces() {
  const db = getClient();
  if (!db) { sinConexion = true; return cacheRead(); }

  const { data, error } = await db.from('places').select('*').order('name');
  if (error) {
    console.warn('[store] no pude traer los lugares, uso la copia guardada:', error.message);
    sinConexion = true;
    return cacheRead();
  }
  sinConexion = false;
  const places = data.map(fromRow);
  cacheWrite(places);
  return places;
}

async function allPlaces() {
  if (!placesCache) placesCache = await fetchPlaces();
  return placesCache;
}

function invalidate() {
  placesCache = null;
}

export const supabaseStore = {
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
    const db = getClient();
    if (!db) throw new Error('Sin conexión con el servidor');
    const row = toRow(place);
    const query = place.id
      ? db.from('places').update(row).eq('id', place.id)
      : db.from('places').insert(row);
    const { data, error } = await query.select().single();
    if (error) throw new Error(traducirError(error));
    invalidate();
    emit('places', null);
    return fromRow(data);
  },

  async deletePlace(id) {
    const db = getClient();
    if (!db) throw new Error('Sin conexión con el servidor');
    const { error } = await db.from('places').delete().eq('id', Number(id));
    if (error) throw new Error(traducirError(error));
    invalidate();
    emit('places', null);
  },

  /** Carga manual de afluencia, para el admin o el encargado del local. */
  async setCrowd(placeId, pct) {
    const db = getClient();
    if (!db) throw new Error('Sin conexión con el servidor');
    const { error } = await db.from('places')
      .update({ crowd_manual: pct, crowd_manual_at: new Date().toISOString() })
      .eq('id', Number(placeId));
    if (error) throw new Error(traducirError(error));
    invalidate();
    emit('places', null);
  },

  async replaceAllPlaces(list) {
    const db = getClient();
    if (!db) throw new Error('Sin conexión con el servidor');
    const { error: delErr } = await db.from('places').delete().neq('id', 0);
    if (delErr) throw new Error(traducirError(delErr));
    if (list?.length) {
      const { error } = await db.from('places').insert(list.map(toRow));
      if (error) throw new Error(traducirError(error));
    }
    invalidate();
    emit('places', null);
  },

  async resetToSeed() {
    // Con backend, los lugares los administra el panel: no hay "volver a los
    // de fábrica" desde el cliente. La semilla vive en supabase/migrations/.
    throw new Error('Con el servidor activo, los lugares se cargan desde el panel');
  },

  async getMessages(placeId) {
    const db = getClient();
    if (!db) return [];
    const { data, error } = await db
      .from('messages')
      .select('id, txt, created_at, user_id, profiles(name)')
      .eq('place_id', Number(placeId))
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      console.warn('[store] chat:', error.message);
      return [];
    }
    const me = getUserId();
    return data.map((m) => ({
      id: m.id,
      name: m.profiles?.name || 'Alguien',
      txt: m.txt,
      me: m.user_id === me,
      time: new Date(m.created_at).toLocaleTimeString('es-AR',
        { hour: '2-digit', minute: '2-digit' }),
    }));
  },

  async sendMessage(placeId, message) {
    const db = getClient();
    const uid = getUserId();
    if (!db || !uid) throw new Error('Necesitás conexión para escribir');
    const { error } = await db.from('messages').insert({
      place_id: Number(placeId),
      user_id: uid,
      txt: message.txt,
    });
    if (error) throw new Error(traducirError(error));
    // No devolvemos la lista acá: llega por realtime, igual que a los demás.
    return this.getMessages(placeId);
  },

  async getGoing() {
    const db = getClient();
    const uid = getUserId();
    if (!db || !uid) return [];
    const { data, error } = await db
      .from('going')
      .select('place_id')
      .eq('user_id', uid)
      .eq('night', nightOf());
    if (error) return [];
    return data.map((r) => r.place_id);
  },

  async isGoing(placeId) {
    return (await this.getGoing()).includes(Number(placeId));
  },

  async toggleGoing(placeId) {
    const db = getClient();
    const uid = getUserId();
    if (!db || !uid) throw new Error('Necesitás conexión para marcar que vas');
    const id = Number(placeId);
    const night = nightOf();
    const yendo = await this.isGoing(id);

    const { error } = yendo
      ? await db.from('going').delete()
          .eq('place_id', id).eq('user_id', uid).eq('night', night)
      : await db.from('going').insert({ place_id: id, user_id: uid, night });

    if (error) throw new Error(traducirError(error));
    invalidate();
    emit('going', null);
    return !yendo;
  },

  /** El perfil del usuario, para mostrar su nombre en el chat. */
  async getProfile() {
    const db = getClient();
    const uid = getUserId();
    if (!db || !uid) return null;
    const { data } = await db.from('profiles').select('*').eq('id', uid).single();
    return data || null;
  },

  async saveProfile(fields) {
    const db = getClient();
    const uid = getUserId();
    if (!db || !uid) return null;
    const { data, error } = await db.from('profiles')
      .update({ name: fields.name, city: fields.city })
      .eq('id', uid).select().single();
    if (error) throw new Error(traducirError(error));
    return data;
  },

  async isAdmin() {
    const p = await this.getProfile();
    return Boolean(p?.is_admin);
  },

  /**
   * Suscripción a cambios.
   *
   * Misma firma que en el modo local, pero acá los avisos vienen del servidor:
   * cuando OTRA persona escribe en el chat o marca que va, esta app se entera
   * sola y se actualiza sin recargar.
   */
  subscribe(topic, cb) {
    if (!listeners.has(topic)) listeners.set(topic, []);
    listeners.get(topic).push(cb);
    abrirCanal(topic);
    return () => {
      const arr = listeners.get(topic) || [];
      const i = arr.indexOf(cb);
      if (i >= 0) arr.splice(i, 1);
      if (!arr.length) cerrarCanal(topic);
    };
  },
};

// ── tiempo real ──────────────────────────────────────────────

function abrirCanal(topic) {
  const db = getClient();
  if (!db || channels.has(topic)) return;

  // 'messages:123' → escucha el chat de ese lugar
  if (topic.startsWith('messages:')) {
    const placeId = Number(topic.split(':')[1]);
    const ch = db.channel('chat-' + placeId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `place_id=eq.${placeId}` },
        () => emit(topic, null))
      .subscribe();
    channels.set(topic, ch);
    return;
  }

  if (topic === 'going' || topic === 'places') {
    const ch = db.channel('salgo-' + topic)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: topic === 'going' ? 'going' : 'places' },
        () => { invalidate(); emit(topic, null); })
      .subscribe();
    channels.set(topic, ch);
  }
}

function cerrarCanal(topic) {
  const ch = channels.get(topic);
  if (ch) { getClient()?.removeChannel(ch); channels.delete(topic); }
}

// ── errores legibles ─────────────────────────────────────────

function traducirError(error) {
  const code = error?.code;
  const msg = String(error?.message || '');
  // 42501 es el código de Postgres para "no tenés permiso": lo tira RLS.
  if (code === '42501' || msg.includes('row-level security')) {
    return 'No tenés permiso para hacer eso';
  }
  if (code === '23505') return 'Eso ya existe';
  if (code === '23514') return 'Alguno de los datos no es válido';
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return 'Sin conexión';
  }
  return msg || 'Algo falló';
}
