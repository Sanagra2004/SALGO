// SALGO — listado de lugares, filtros y pantalla de detalle.

import { store, isDisconnected } from './store.js';
import { escapeHtml, showToast, $, setText, setHtml, colorFor, initials } from './ui.js';
import { withDistances, getPosition, isPrecise } from './geo.js';
import * as salgoMap from './map.js';
import { getCity } from './cities.js';

const INSTAGRAM_ACCOUNTS = {
  'Samsara Beach': 'samsarabeach.mdq', 'Luna Disco': 'lunadisco', 'Club Quba': 'clubquba.mdp',
  'La Bodeguita': 'labodeguitamardelplata', 'Antares Cervecería': 'antares_mdp',
  'Barwin': 'barwin.mdp', 'El Container': 'elcontainermdp', 'Cheverry Cervecería': 'cheverry.cerveceria',
  'Límite de Pista': 'limitedepista', 'Alarde': 'alarde.bar', 'Barrio Mitre Bar': 'barriomitrebar',
  'Parador Varese': 'paradorvarese', 'Tequila Bar': 'tequilabarmdp', 'Otro Bar MdP': 'otrobarmdp',
  'Soho Bar': 'sohobarmdp', 'Waikiki Beach Bar': 'waikikimdp', 'Havana Club MdP': 'havanaclubmdp',
  'La Biela MdP': 'labielamdp', 'Playa Grande Club': 'playagrandeclub', 'Desnivel': 'desnivelbar',
  'Bruto Playa Grande': 'brutopg', 'Señor Juan': 'senorjuan.bar', 'Bruto Bar': 'brutobar.pg',
  'Cuba Boliche': 'cubaboliche.mdp', 'Mr. Jones': 'mrjonesmdp', 'Estación Central': 'estacioncentralmdp',
  'OGham Bar': 'oghambar', 'Torombolo': 'torombolobar', 'Proyecto Bar': 'proyectobarmdp', 'Tiki Bar': 'tikibarmdp',
};

// Fotos genéricas por categoría (Unsplash). NO son fotos de cada local: son
// de relleno hasta que los lugares suban las suyas desde el panel.
const STOCK = {
  playa: ['1507525428034-b723cf961d3e', '1504701954957-2010ec3bcec1', '1533174072545-7a4b6ad7a6c3'],
  boliche: ['1516450360452-9312f5e86fc7', '1571204829887-3b8d69e4094d', '1514525253161-7a46d19cd819'],
  cerveceria: ['1535958636474-b021ee887b13', '1510812431401-41d2bd2722f3', '1558642452-9d2a7deb7f62'],
  tropical: ['1551024709-8f23befc6f87', '1574096079513-d8259312b785', '1470337458703-46ad1756a187'],
  rock: ['1501386761578-eac5c94b800a', '1524368535928-5b5e00ddc76b', '1429962714451-bb934ecdc4ec'],
  bar: ['1566737236500-c8ac43014a67', '1543007630-9710e4a00a20', '1470337458703-46ad1756a187'],
};

function stockKey(p) {
  const type = (p.genre || p.type || '').toLowerCase();
  const name = (p.name || '').toLowerCase();
  const has = (...words) => words.some((w) => name.includes(w));
  if (has('samsara', 'playa', 'parador', 'waikiki', 'beach')) return 'playa';
  if (has('bruto', 'cuba', 'luna', 'soho', 'jones', 'límite', 'limite')) return 'boliche';
  if (type.includes('cervecer') || has('antares', 'cheverry', 'container', 'alarde')) return 'cerveceria';
  if (has('bodeguita', 'havana', 'tequila', 'tiki')) return 'tropical';
  if (type.includes('rock') || has('proyecto', 'torombolo', 'ogham', 'desnivel', 'barrio', 'otro')) return 'rock';
  return 'bar';
}

function placeImages(p) {
  return STOCK[stockKey(p)].map((id) => `https://images.unsplash.com/photo-${id}?w=400&q=80`);
}

export function crowdLabel(pct) {
  const n = Number(pct) || 0;
  if (n >= 80) return `${n}% lleno 🔴`;
  if (n >= 50) return `${n}% lleno 🟡`;
  return `${n}% lleno 🟢`;
}

export function crowdColor(pct) {
  const n = Number(pct) || 0;
  return n >= 80 ? 'var(--red)' : n >= 50 ? 'var(--amber)' : 'var(--green)';
}

// ---------- estado del listado ----------

let allPlaces = [];   // lugares de la ciudad activa, con distancia calculada
let goingIds = [];
let activeChip = 'Todo';
let currentDetail = null;

export const getCurrentDetail = () => currentDetail;
export const getPlaces = () => allPlaces.slice();

/** Recarga desde el store, recalcula distancias y vuelve a pintar todo. */
export async function reload() {
  const city = getCity();
  const raw = await store.getPlaces({ city });
  allPlaces = withDistances(raw, getPosition());
  goingIds = await store.getGoing();
  applyFilter();
  renderExploreList(allPlaces);
  renderHomeMap();
}

function emptyState(city) {
  // Dos motivos distintos para una lista vacía. Confundirlos manda a la
  // persona a resolver el problema equivocado: si es falta de señal, cambiar
  // de ciudad no la ayuda en nada.
  if (isDisconnected()) {
    return `
      <div class="city-empty">
        <div class="city-empty-ico">📡</div>
        <div class="city-empty-txt">No pude conectarme</div>
        <div class="city-empty-sub">
          Revisá tu conexión. En cuanto vuelva, los lugares aparecen solos.
        </div>
        <button class="city-empty-btn" data-action="reintentar">Reintentar</button>
      </div>`;
  }
  return `
    <div class="city-empty">
      <div class="city-empty-ico">🌎</div>
      <div class="city-empty-txt">Todavía no llegamos a ${escapeHtml(city)}</div>
      <div class="city-empty-sub">
        Estamos sumando ciudades. Por ahora tenemos Mar del Plata cargada entera.
      </div>
      <button class="city-empty-btn" data-action="volver-mdp">Ver Mar del Plata</button>
    </div>`;
}

export function renderList(places) {
  const el = $('places-list');
  if (!el) return;
  if (!places.length) {
    const city = getCity();
    // Distinguimos "esta ciudad no existe en SALGO" de "el filtro no dio nada".
    const cityHasPlaces = allPlaces.length > 0;
    el.innerHTML = cityHasPlaces
      ? '<div class="list-empty">No hay resultados con ese filtro</div>'
      : emptyState(city);
    return;
  }
  el.innerHTML = places.map(placeCard).join('');
}

function placeCard(p) {
  const isGoing = goingIds.includes(p.id);
  const color = crowdColor(p.crowd);
  return `
  <div class="pcard ${isGoing ? 'active-card' : ''}" data-place="${p.id}">
    <div class="pcard-top">
      <div>
        <div class="pname">${escapeHtml(p.name)}${isGoing ? ' <span style="font-size:10px;color:var(--vl);">✓ Vas</span>' : ''}</div>
        <div class="ptype">${escapeHtml(p.type)}</div>
      </div>
      <div class="dbadge">${escapeHtml(p.dist)}</div>
    </div>
    <div class="stats4">
      <div class="stat"><div class="stv">${escapeHtml(p.entrada)}</div><div class="stl">Entrada</div></div>
      <div class="stat"><div class="stv">${escapeHtml(p.consumo)}</div><div class="stl">Consumo</div></div>
      <div class="stat"><div class="stv">${escapeHtml(p.horario)}</div><div class="stl">Horario</div></div>
      <div class="stat"><div class="stv" style="color:var(--amber);">★ ${p.rating.toFixed(1)}</div><div class="stl">Rating</div></div>
    </div>
    <div class="cbar-lbl">
      <span class="cbar-t">Afluencia ahora</span>
      <span style="font-size:10px;font-weight:600;color:${color};">${crowdLabel(p.crowd)}</span>
    </div>
    <div class="cbar-trk"><div class="cbar-fill" style="width:${Number(p.crowd) || 0}%;background:${color};"></div></div>
    <div class="pcard-foot">
      <span class="hrs">${escapeHtml(p.horario)}</span>
      <span class="open-badge ${p.open ? 'open-yes' : 'open-pre'}">${p.open ? 'Abierto ahora' : 'Hoy funciona'}</span>
    </div>
  </div>`;
}

export function renderExploreList(places) {
  const el = $('exp-list');
  if (!el) return;
  if (!places.length) { el.innerHTML = emptyState(getCity()); return; }
  el.innerHTML = places.map((p) => `
    <div class="exp-row" data-place="${p.id}">
      <div class="exp-ico" style="background:${escapeHtml(p.color1)}22;">${escapeHtml(p.icon)}</div>
      <div class="exp-info">
        <div class="exp-name">${escapeHtml(p.name)}</div>
        <div class="exp-sub">${escapeHtml(p.type.split('·')[1] || p.type)} · ${escapeHtml(p.horario)} · ${crowdLabel(p.crowd)}</div>
      </div>
      <div class="exp-right">
        <div class="exp-dist">${escapeHtml(p.dist)}</div>
        <div class="exp-price">${escapeHtml(p.entrada)}</div>
      </div>
    </div>`).join('');
}

// ---------- filtros ----------

export function setChip(el, cat) {
  activeChip = cat;
  document.querySelectorAll('#chips-home .chip').forEach((c) => { c.className = 'chip off'; });
  if (el) el.className = 'chip on';
  applyFilter();
}

export function applyFilter(q) {
  const input = $('search-input');
  const query = String(q ?? (input ? input.value : '')).toLowerCase().trim();
  let filtered = allPlaces.filter((p) => {
    // `p.cat || []`: un lugar creado desde el admin puede no traer categorías.
    const matchCat = activeChip === 'Todo' ||
      (activeChip === 'Cerca' ? true : (p.cat || []).includes(activeChip));
    const matchQ = !query ||
      p.name.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query);
    return matchCat && matchQ;
  });
  // "Cerca mío": solo lo que está a menos de 2 km, ordenado por distancia.
  if (activeChip === 'Cerca') {
    filtered = filtered.filter((p) => p.distKm != null && p.distKm <= 2);
  }
  renderList(filtered);
}

// ---------- mapa del home ----------

export function renderHomeMap() {
  salgoMap.renderPlaces('main-map-box', allPlaces.slice(0, 14), {
    onSelect: openDetail,
    fit: true,
    compact: true,
  });
  const hint = $('map-hint');
  if (hint) {
    hint.textContent = isPrecise()
      ? 'Ordenado por distancia real desde donde estás'
      : 'Activá la ubicación para ver qué tenés más cerca';
  }
}

export function renderFullMap() {
  setText('fullmap-city', getCity());
  salgoMap.renderPlaces('fullmap-bg', allPlaces, {
    onSelect: (id) => { closeFullMap(); setTimeout(() => openDetail(id), 250); },
    fit: true,
  });
  const items = $('fullmap-items');
  if (!items) return;
  items.innerHTML = allPlaces.map((p, i) => `
    <div class="fullmap-item" data-place="${p.id}">
      <div class="fullmap-item-ico" style="background:${escapeHtml(p.color1)}22;">${escapeHtml(p.icon)}</div>
      <div style="flex:1;">
        <div class="fullmap-item-name">${i < 3 ? '⭐ ' : ''}${escapeHtml(p.name)}</div>
        <div class="fullmap-item-sub">${escapeHtml(p.type)} · ⭐${p.rating.toFixed(1)}</div>
        <div class="fullmap-crowd-bar"><div class="fullmap-crowd-fill" style="width:${Number(p.crowd) || 0}%;background:${crowdColor(p.crowd)};"></div></div>
      </div>
      <div class="fullmap-item-dist">${escapeHtml(p.dist)}</div>
    </div>`).join('');
}

export function openFullMap() {
  const modal = $('fullmap-modal');
  if (!modal) return;
  modal.classList.add('show');
  renderFullMap();
  salgoMap.refresh('fullmap-bg');
}

export function closeFullMap() {
  const modal = $('fullmap-modal');
  if (modal) modal.classList.remove('show');
}

// ---------- detalle ----------

/**
 * Abre el detalle de un lugar.
 * El prototipo hacía `PLACES[id]` en varios lados — eso indexa por POSICIÓN en
 * el array, no por id, así que marcabas "voy" en un lugar distinto al que
 * estabas mirando. Acá siempre se busca por id.
 */
export async function openDetail(id) {
  const placeId = Number(id);
  const p = allPlaces.find((x) => x.id === placeId);
  if (!p) { showToast('❌ Lugar no encontrado'); return; }
  currentDetail = placeId;

  const color = crowdColor(p.crowd);
  setText('detail-badge', p.badge);
  setText('detail-name', p.name);
  setText('detail-addr', p.addr + (p.dist !== '—' ? ` · a ${p.dist}` : ''));

  const hero = $('detail-hero');
  if (hero) hero.style.background = `linear-gradient(135deg, #1a0933, ${p.color1}44)`;

  const gallery = $('place-gallery-wrap');
  if (gallery) {
    gallery.innerHTML = placeImages(p)
      .map((url) => `<img class="gallery-img" src="${escapeHtml(url)}" alt="${escapeHtml(p.name)}" loading="lazy">`)
      .join('');
  }

  const igWrap = $('place-ig-wrap');
  const handle = INSTAGRAM_ACCOUNTS[p.name];
  if (igWrap) {
    igWrap.innerHTML = handle ? `
      <a class="ig-btn" href="https://www.instagram.com/${encodeURIComponent(handle)}/" target="_blank" rel="noopener">
        <span class="ig-btn-ico">📸</span>
        <div class="ig-btn-info">
          <div class="ig-btn-label">Ver en Instagram</div>
          <div class="ig-btn-handle">@${escapeHtml(handle)}</div>
        </div>
        <span class="ig-btn-arr">›</span>
      </a>` : '';
  }

  setHtml('detail-stats', `
    <div class="dstat"><div class="dstat-v">${escapeHtml(p.entrada)}</div><div class="dstat-l">Entrada</div></div>
    <div class="dstat"><div class="dstat-v">${escapeHtml(p.horario)}</div><div class="dstat-l">Horario</div></div>
    <div class="dstat"><div class="dstat-v" style="color:var(--amber);">★ ${p.rating.toFixed(1)}</div><div class="dstat-l">Rating</div></div>`);

  const pct = $('crowd-pct');
  if (pct) { pct.textContent = crowdLabel(p.crowd); pct.style.color = color; }
  const bar = $('crowd-bar');
  if (bar) { bar.style.width = (Number(p.crowd) || 0) + '%'; bar.style.background = color; }

  updateGoingUI(p);
  renderGoingAvatars();

  const { renderChat } = await import('./chat.js');
  await renderChat(placeId);

  const { showScreen } = await import('./main.js');
  showScreen('detail');
}

function updateGoingUI(p) {
  const isGoing = goingIds.includes(p.id);
  const total = p.going + (isGoing ? 1 : 0);
  setHtml('going-txt', `<span>${total} personas</span> van esta noche`);
  const btn = $('going-btn');
  if (btn) {
    btn.textContent = isGoing ? '✓ Ya marcaste que vas' : '¡Voy esta noche!';
    btn.style.background = isGoing
      ? 'linear-gradient(135deg,#00f5a0,#00c9a0)'
      : 'linear-gradient(135deg,#ff2d78,#b44dff)';
  }
}

function renderGoingAvatars() {
  const el = $('going-avs');
  if (!el) return;
  const people = ['Maru R.', 'Tomi C.', 'Lu P.', 'Gero R.', 'Vale B.'];
  el.innerHTML = people
    .map((n) => `<div class="gav" style="background:${colorFor(n)};">${escapeHtml(initials(n))}</div>`)
    .join('') + '<div class="gav" style="background:#e0e0ea;color:#666;font-size:10px;">+</div>';
}

export async function markGoing() {
  if (currentDetail == null) return;
  // Marcar que vas publica un mensaje en el chat del lugar, así que primero
  // necesitamos saber con qué nombre firmarlo.
  const { getUserName, askName } = await import('./profile.js');
  if (!getUserName()) { askName(); return; }
  const p = allPlaces.find((x) => x.id === currentDetail);
  if (!p) return;

  const nowGoing = await store.toggleGoing(p.id);
  goingIds = await store.getGoing();
  updateGoingUI(p);

  if (nowGoing) {
    showToast('🎉 Marcaste que vas a ' + p.name);
    const { postOwnMessage } = await import('./chat.js');
    await postOwnMessage(p.id, '¡Voy esta noche!');
  } else {
    showToast('Sacaste tu marca de ' + p.name);
  }
  applyFilter();
}

export function closeDetail() {
  currentDetail = null;
  // Cortar la escucha del chat: si no, quedan conexiones abiertas de todos los
  // lugares que el usuario fue mirando durante la noche.
  import('./chat.js').then(({ stopChat }) => stopChat());
  import('./main.js').then(({ showScreen }) => showScreen('home'));
  applyFilter();
}

export function sharePlace() {
  const p = allPlaces.find((x) => x.id === currentDetail);
  if (!p) return;
  const text = `Esta noche voy a ${p.name} — encontranos por SALGO`;
  if (navigator.share) {
    navigator.share({ title: 'SALGO', text, url: window.location.href }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text} ${window.location.href}`)
      .then(() => showToast('📋 ¡Link copiado!'))
      .catch(() => showToast('No pude copiar el link'));
  } else {
    showToast('📋 ' + text);
  }
}

/** Delegación de eventos: una sola escucha por contenedor en vez de onclick por tarjeta. */
export function bindListEvents() {
  document.addEventListener('click', (ev) => {
    const card = ev.target.closest('[data-place]');
    if (card) { openDetail(card.dataset.place); return; }
    if (ev.target.closest('[data-action="volver-mdp"]')) {
      import('./cities.js').then(({ selectCity }) => selectCity('Mar del Plata'));
      return;
    }
    if (ev.target.closest('[data-action="reintentar"]')) reload();
  });
}
