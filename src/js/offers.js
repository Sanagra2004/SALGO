// SALGO — ofertas del día, stories, amigos, reservas y notificaciones.
//
// Los datos de esta pantalla (ofertas, amigos, grupos, notificaciones) todavía
// son de ejemplo: viven en este archivo, no los carga nadie. Sirven para
// mostrar la idea. Pasan a ser reales cuando exista el backend (Etapa 1).

import { store } from './store.js';
import { escapeHtml, showToast, $, colorFor, initials } from './ui.js';
import { getPlaces, openDetail } from './places.js';

// ══════════════════════════════════
// OFERTAS — Descuentos diarios
// ══════════════════════════════════
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const OFERTAS_DATA = [
  // LUNES
  { dia: 0, lugar: 'La Bodeguita',       desc: '2x1 en mojitos toda la noche',              pct: 50, tipo: 'Tragos',   badge: 'red',   precio_old: '$2.400', precio_new: '$1.200', hora: '20:00–23:00', icon: '🍹' },
  { dia: 0, lugar: 'Antares Cervecería', desc: 'Happy hour: pintas a $900',                 pct: 30, tipo: 'Cerveza',  badge: 'amber', precio_old: '$1.300', precio_new: '$900',   hora: '18:00–20:00', icon: '🍺' },
  { dia: 0, lugar: 'Cheverry Cervecería',desc: 'Lunes de cervezas artesanales con descuento',pct: 20, tipo: 'Cerveza', badge: 'amber', precio_old: '$1.000', precio_new: '$800',   hora: '17:00–21:00', icon: '🍻' },
  { dia: 0, lugar: 'Desnivel',           desc: 'Noche de folk: entrada libre con consumición', pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$1.500', precio_new: 'Gratis', hora: '20:00–23:00', icon: '🎭' },

  // MARTES
  { dia: 1, lugar: 'Señor Juan',         desc: 'Cócteles de autor 30% off',                 pct: 30, tipo: 'Tragos',   badge: 'red',   precio_old: '$1.800', precio_new: '$1.260', hora: '20:00–23:00', icon: '🍹' },
  { dia: 1, lugar: 'OGham Bar',          desc: 'Martes de trivia: consumición incluida',    pct: 40, tipo: 'Promo',    badge: 'blue',  precio_old: '$2.000', precio_new: '$1.200', hora: '20:00–23:00', icon: '🍀' },
  { dia: 1, lugar: 'Proyecto Bar',       desc: 'Bandas emergentes: entrada gratis',         pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$1.000', precio_new: 'Gratis', hora: '21:00–00:00', icon: '🎭' },
  { dia: 1, lugar: 'Waikiki Beach Bar',  desc: '2x1 en daiquiris',                          pct: 50, tipo: 'Tragos',   badge: 'red',   precio_old: '$2.000', precio_new: '$1.000', hora: '19:00–22:00', icon: '🌴' },

  // MIERCOLES
  { dia: 2, lugar: 'La Bodeguita',       desc: 'Miércoles: chicas toman gratis',            pct: 100, tipo: 'Chicas',  badge: 'green', precio_old: '$2.000', precio_new: 'Gratis', hora: '21:00–00:00', icon: '🍹' },
  { dia: 2, lugar: 'Barwin',             desc: 'Happy hour doble: 2 tragos precio de 1',   pct: 50, tipo: 'Tragos',   badge: 'red',   precio_old: '$2.200', precio_new: '$1.100', hora: '19:00–21:00', icon: '🎵' },
  { dia: 2, lugar: 'El Container',       desc: 'Noche de jazz: entrada libre',              pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$800',   precio_new: 'Gratis', hora: '20:00–23:00', icon: '📦' },
  { dia: 2, lugar: 'Tiki Bar',           desc: 'Tragos tropicales al 2x1',                 pct: 50, tipo: 'Tragos',   badge: 'red',   precio_old: '$1.800', precio_new: '$900',   hora: '19:00–22:00', icon: '🌺' },
  { dia: 2, lugar: 'Torombolo',          desc: 'Open mic noche: entrada con consumición',  pct: 40, tipo: 'Promo',    badge: 'blue',  precio_old: '$1.500', precio_new: '$900',   hora: '21:00–00:00', icon: '🎵' },

  // JUEVES
  { dia: 3, lugar: 'Bruto Playa Grande', desc: 'Preventa jueves: 40% off en la puerta',    pct: 40, tipo: 'Entrada',  badge: 'red',   precio_old: '$4.500', precio_new: '$2.700', hora: '23:00–06:00', icon: '🔥' },
  { dia: 3, lugar: 'Mr. Jones',          desc: 'Jueves de rock: pinta + entrada juntos',   pct: 30, tipo: 'Combo',    badge: 'amber', precio_old: '$4.000', precio_new: '$2.800', hora: '22:00–02:00', icon: '🎸' },
  { dia: 3, lugar: 'Señor Juan',         desc: 'Cata de gin: 3 tragos por $3.000',         pct: 35, tipo: 'Tragos',   badge: 'red',   precio_old: '$4.600', precio_new: '$3.000', hora: '20:00–23:00', icon: '🍹' },
  { dia: 3, lugar: 'Alarde',             desc: 'Noches de jazz: consumición mínima $700',  pct: 20, tipo: 'Promo',    badge: 'blue',  precio_old: '$900',   precio_new: '$700',   hora: '20:00–01:00', icon: '🥃' },
  { dia: 3, lugar: 'Estación Central',   desc: 'DJ set gratuito toda la noche',            pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$1.500', precio_new: 'Gratis', hora: '21:00–03:00', icon: '🚉' },

  // VIERNES
  { dia: 4, lugar: 'Samsara Beach',      desc: 'Early bird: entrada 50% hasta las 23hs',   pct: 50, tipo: 'Entrada',  badge: 'red',   precio_old: '$5.000', precio_new: '$2.500', hora: 'Hasta 23:00', icon: '🌊' },
  { dia: 4, lugar: 'Luna Disco',         desc: 'Preventa online: $4.000 en puerta vale $6.000', pct: 33, tipo: 'Entrada', badge: 'red', precio_old: '$6.000', precio_new: '$4.000', hora: 'Hasta 01:00', icon: '🌙' },
  { dia: 4, lugar: 'Club Quba',          desc: 'Mesa VIP: botella + entrada x4 personas',  pct: 25, tipo: 'Combo',    badge: 'amber', precio_old: '$20.000', precio_new: '$15.000', hora: '20:00–02:00', icon: '🏖️' },
  { dia: 4, lugar: 'Antares Cervecería', desc: 'Viernes de pinta + picada: combo $2.500',  pct: 30, tipo: 'Combo',    badge: 'amber', precio_old: '$3.600', precio_new: '$2.500', hora: '19:00–22:00', icon: '🍺' },
  { dia: 4, lugar: 'Parador Varese',     desc: 'Preventa viernes: 35% off entrada',        pct: 35, tipo: 'Entrada',  badge: 'red',   precio_old: '$3.000', precio_new: '$1.950', hora: 'Hasta 22:00', icon: '🏊' },
  { dia: 4, lugar: 'Bruto Playa Grande', desc: 'Lista de invitados: entrada gratis hasta las 00hs', pct: 100, tipo: 'Lista', badge: 'green', precio_old: '$4.500', precio_new: 'Gratis', hora: 'Hasta 00:00', icon: '🔥' },

  // SABADO
  { dia: 5, lugar: 'Bruto Playa Grande', desc: 'Noche principal: preventa hasta $3.200',   pct: 29, tipo: 'Entrada',  badge: 'red',   precio_old: '$4.500', precio_new: '$3.200', hora: 'Hasta 23:00', icon: '🔥' },
  { dia: 5, lugar: 'Samsara Beach',      desc: 'Beach party: open bar premium $8.000',     pct: 30, tipo: 'Open bar', badge: 'amber', precio_old: '$11.500', precio_new: '$8.000', hora: '22:00–06:00', icon: '🌊' },
  { dia: 5, lugar: 'Luna Disco',         desc: 'Sábado masivo: 2x1 en consumición hasta la 1am', pct: 50, tipo: 'Tragos', badge: 'red', precio_old: '$2.400', precio_new: '$1.200', hora: 'Hasta 01:00', icon: '🌙' },
  { dia: 5, lugar: 'Cuba Boliche',       desc: 'Sábado: entrada + consumición $4.500',     pct: 30, tipo: 'Combo',    badge: 'amber', precio_old: '$6.500', precio_new: '$4.500', hora: '01:00–07:00', icon: '🕺' },
  { dia: 5, lugar: 'Club Quba',          desc: 'Happy hour 20-22hs: todo 2x1',             pct: 50, tipo: 'Tragos',   badge: 'red',   precio_old: '$3.600', precio_new: '$1.800', hora: '20:00–22:00', icon: '🏖️' },
  { dia: 5, lugar: 'Playa Grande Club',  desc: 'Pool party: entrada + copa bienvenida',    pct: 25, tipo: 'Combo',    badge: 'amber', precio_old: '$5.500', precio_new: '$4.000', hora: '20:00–06:00', icon: '🏄' },
  { dia: 5, lugar: 'Mr. Jones',          desc: 'Sábado rock: 30% off en la entrada',       pct: 30, tipo: 'Entrada',  badge: 'red',   precio_old: '$3.000', precio_new: '$2.100', hora: '22:00–05:00', icon: '🎸' },

  // DOMINGO
  { dia: 6, lugar: 'Waikiki Beach Bar',  desc: 'Domingo de tarde: trago + vista al mar $1.500', pct: 40, tipo: 'Combo', badge: 'amber', precio_old: '$2.500', precio_new: '$1.500', hora: '14:00–19:00', icon: '🌴' },
  { dia: 6, lugar: 'El Container',       desc: 'Domingos de playa: entrada gratis',        pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$500',   precio_new: 'Gratis', hora: '16:00–22:00', icon: '📦' },
  { dia: 6, lugar: 'Havana Club MdP',    desc: 'Salsa dominical: clase + noche $2.000',    pct: 30, tipo: 'Combo',    badge: 'amber', precio_old: '$2.900', precio_new: '$2.000', hora: '18:00–23:00', icon: '🎺' },
  { dia: 6, lugar: 'Antares Cervecería', desc: 'Domingo familiar: pinta artesanal $850',   pct: 35, tipo: 'Cerveza',  badge: 'amber', precio_old: '$1.300', precio_new: '$850',   hora: '14:00–20:00', icon: '🍺' },
  { dia: 6, lugar: 'Proyecto Bar',       desc: 'Cierre de semana con bandas en vivo',      pct: 100, tipo: 'Entrada', badge: 'green', precio_old: '$1.000', precio_new: 'Gratis', hora: '19:00–23:00', icon: '🎭' },
];

let ofertaDiaActivo = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export function renderOfertas() {
  const el = document.getElementById('ofertas-content');
  if (!el) return;

  const hoy = DIAS[ofertaDiaActivo];
  const ofertasHoy = OFERTAS_DATA.filter(o => o.dia === ofertaDiaActivo);

  if (!ofertasHoy.length) {
    el.innerHTML = `<div class="oferta-empty">
      <div class="oferta-empty-ico">🎁</div>
      <div class="oferta-empty-txt">Sin ofertas este día</div>
      <div class="oferta-empty-sub">Probá otro día de la semana</div>
    </div>`;
    return;
  }

  // Hero: la mejor oferta del día (mayor pct)
  const hero = [...ofertasHoy].sort((a,b) => b.pct - a.pct)[0];
  const heroPlace = getPlaces().find(p => p.name === hero.lugar) || {};
  const heroColor = heroPlace.color1 || '#ff2d55';

  const heroHtml = `
    <div class="oferta-hero" onclick="goNavExtended('detail_from_oferta',null,${heroPlace.id||1})">
      <div class="oferta-hero-bg" style="background:linear-gradient(135deg,${heroColor}cc,#1a0020);">
        <div class="oferta-hero-gradient"></div>
        <div class="oferta-hero-tag">⭐ Mejor oferta ${hoy}</div>
        <div class="oferta-hero-pct" style="background:rgba(255,255,255,.15);">-${hero.pct}%</div>
        <div class="oferta-hero-info">
          <div class="oferta-hero-name">${hero.lugar}</div>
          <div class="oferta-hero-sub">${hero.desc}</div>
          <div class="oferta-timer"><div class="oferta-timer-dot"></div>Válido hoy · ${hero.hora}</div>
        </div>
      </div>
    </div>`;

  const resto = ofertasHoy.filter(o => o !== hero);
  const listHtml = resto.map(o => {
    const p = getPlaces().find(x => x.name === o.lugar) || {};
    const color = p.color1 || '#ff2d55';
    return `<div class="oferta-card" onclick="openDetail(${p.id||1})">
      <div class="oferta-card-top">
        <div class="oferta-card-img" style="background:${color}22;">${o.icon}</div>
        <div class="oferta-card-body">
          <div class="oferta-card-name">${o.lugar}</div>
          <div class="oferta-card-desc">${o.desc}</div>
          <div class="oferta-card-foot">
            <span class="oferta-badge oferta-badge-${o.badge}">${o.tipo}</span>
            <span class="oferta-timer-dot" style="width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse 1.5s infinite;flex-shrink:0;"></span>
            <span style="font-size:11px;color:var(--txt3);">${o.hora}</span>
            <span class="oferta-price-new" style="margin-left:auto;">${o.precio_new === 'Gratis' ? '<span style="color:var(--green);">Gratis 🎉</span>' : o.precio_new}</span>
          </div>
        </div>
        <div class="oferta-pct-pill">-${o.pct}%</div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = heroHtml +
    `<div class="oferta-count-lbl">${resto.length} ofertas más este día</div>` +
    `<div class="ofertas-list">${listHtml}</div>`;
}

export function setOfertaDia(idx, el) {
  ofertaDiaActivo = idx;
  document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderOfertas();
}

export const FRIENDS_DATA = [
  { id:1, name:'Caro Méndez',  handle:'@caro_m', av:'CM', color:'#ff2d55', status:'En Samsara 🌊',  online:true,  going:'Samsara Beach' },
  { id:2, name:'Fede López',   handle:'@fede_l', av:'FL', color:'#007aff', status:'En camino 🚶',  online:true,  going:'Luna Disco' },
  { id:3, name:'Maxi Soto',    handle:'@maxi_s', av:'MS', color:'#ff9f0a', status:'En Antares 🍺', online:true,  going:'Antares Cervecería' },
  { id:4, name:'Nico García',  handle:'@nico_g', av:'NG', color:'#34c759', status:'En Barwin 🎵',  online:true,  going:'Barwin' },
  { id:5, name:'Juli Romero',  handle:'@juli_r', av:'JR', color:'#af52de', status:'Hace 2hs',      online:false, going:null },
  { id:6, name:'Vale Torres',  handle:'@vale_t', av:'VT', color:'#00e5ff', status:'Hace 1día',     online:false, going:null },
];

// ============ STORIES ============
let storiesData = [];
let currentStory = 0;
let storyTimer = null;

export function initStories() {
  storiesData = getPlaces().filter(p => p && p.name).slice(0,6).map((p,i) => ({
    id: p.id,
    name: p.name,
    icon: p.icon || p.ico || '📍',
    color1: p.color1 || '#ff2d55',
    color2: p.color2 || '#b44dff',
    crowd: p.crowd || 50,
    open: p.open !== false,
    slides: [
      { type:'crowd', text: `${p.crowd || 50}% lleno ahora`, sub: p.addr || 'Mar del Plata' },
      { type:'info',  text: p.entrada || 'Sin entrada', sub: `Horario: ${p.horario || p.hrs || '-'}` },
      { type:'vibe',  text: p.genre || p.type || 'Variado', sub: `${p.going || 0} personas van esta noche` },
    ]
  }));
  renderStoryRing();
}

export function renderStoryRing() {
  const el = document.getElementById('story-ring'); if(!el) return;
  if (!el || !storiesData.length) return;
  el.innerHTML = storiesData.map((s,i) => `
    <div class="story-item" onclick="openStory(${i})">
      <div class="story-ring-wrap" style="background:linear-gradient(135deg,${s.color1},${s.color2});">
        <div class="story-av">${s.icon}</div>
      </div>
      <div class="story-lbl">${s.name.split(' ')[0]}</div>
    </div>`).join('');
}

export function openStory(idx) {
  currentStory = idx;
  const modal = document.getElementById('story-modal');
  modal.classList.add('show');
  renderStoryContent();
  startStoryTimer();
  document.body.style.overflow = 'hidden';
}

export function closeStory() {
  document.getElementById('story-modal').classList.remove('show');
  clearInterval(storyTimer);
  document.body.style.overflow = '';
}

export function renderStoryContent() {
  const s = storiesData[currentStory];
  if (!s || !s.crowd) { closeStory(); return; }
  const slide = s.slides[0];
  const c = s.crowd >= 80 ? '#ff3b30' : s.crowd >= 50 ? '#ff9f0a' : '#34c759';
  document.getElementById('story-bg').style.background = `linear-gradient(160deg,${s.color1}dd,${s.color2}dd,#000)`;
  (function(){var _e=document.getElementById('story-name');if(_e)_e.textContent = s.name})();
  (function(){var _e=document.getElementById('story-status');if(_e)_e.textContent = s.open ? '🟢 Abierto ahora' : '🕐 Abre esta noche'})();
  (function(){var _e=document.getElementById('story-main-text');if(_e)_e.textContent = slide.text})();
  (function(){var _e=document.getElementById('story-sub-text');if(_e)_e.textContent = slide.sub})();
  document.getElementById('story-crowd-fill').style.width = s.crowd + '%';
  document.getElementById('story-crowd-fill').style.background = c;
  (function(){var _e=document.getElementById('story-crowd-pct');if(_e)_e.textContent = s.crowd + '%'})();
  // Progress bars
  const bars = document.querySelectorAll('.story-prog-bar');
  bars.forEach((b,i) => {
    b.style.background = i <= currentStory ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)';
  });
}

export function nextStory() {
  clearInterval(storyTimer);
  if (currentStory < storiesData.length - 1) {
    currentStory++;
    renderStoryContent();
    startStoryTimer();
  } else { closeStory(); }
}

export function prevStory() {
  clearInterval(storyTimer);
  if (currentStory > 0) {
    currentStory--;
    renderStoryContent();
    startStoryTimer();
  }
}

export function startStoryTimer() {
  clearInterval(storyTimer);
  let prog = 0;
  const fill = document.getElementById('story-active-fill');
  if (fill) { fill.style.width = '0%'; fill.style.transition = 'none'; }
  requestAnimationFrame(() => {
    if (fill) { fill.style.transition = 'width 4s linear'; fill.style.width = '100%'; }
  });
  storyTimer = setTimeout(nextStory, 4000);
}

// ============ AMIGOS ============


const GROUPS_DATA = [
  { id:1, name:'La banda del viernes', members:['CM','FL','JR'], color:'#ff2d55', count:6, plan:'Samsara → Luna' },
  { id:2, name:'Antares crew',         members:['MS','NG'],      color:'#ff9f0a', count:4, plan:'Antares' },
];

export function renderFriends() {
  const el2 = document.getElementById('friends-list');
  if (!el2) return;
  const online = FRIENDS_DATA.filter(f => f.online);
  const offline = FRIENDS_DATA.filter(f => !f.online);
  const el = document.getElementById('friends-list');
  if (!el) return;
  el.innerHTML = `
    <div class="friends-section-lbl">En vivo esta noche — ${online.length} amigos</div>
    ${online.map(f => friendCard(f)).join('')}
    <div class="friends-section-lbl" style="margin-top:8px;">Offline — ${offline.length} amigos</div>
    ${offline.map(f => friendCard(f)).join('')}
  `;
}

export function friendCard(f) {
  return `<div class="friend-card" data-friend="${escapeHtml(f.name)}">
    <div class="friend-av-wrap">
      <div class="friend-av" style="background:${f.color};">${f.av}</div>
      <div class="friend-online-dot ${f.online ? 'online' : 'offline'}"></div>
    </div>
    <div class="friend-info">
      <div class="friend-name">${f.name}</div>
      <div class="friend-status">${f.status}</div>
      ${f.going ? `<div class="friend-going">📍 ${f.going}</div>` : ''}
    </div>
    <div class="friend-action">
      <div class="friend-btn" data-invite="${escapeHtml(f.name)}">Invitar</div>
    </div>
  </div>`;
}

export function renderGroups() {
  const el = document.getElementById('groups-list');
  if (!el) return;
  el.innerHTML = GROUPS_DATA.map(g => `
    <div class="group-card" data-group="${escapeHtml(g.name)}">
      <div class="group-ico" style="background:${g.color}22;border:1px solid ${g.color}44;">
        <div style="display:flex;margin-left:-4px;">${g.members.map(m => `<div style="width:24px;height:24px;border-radius:50%;background:${g.color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;margin-left:-4px;">${m}</div>`).join('')}</div>
      </div>
      <div class="group-info">
        <div class="group-name">${g.name}</div>
        <div class="group-sub">${g.count} personas · Plan: ${g.plan}</div>
      </div>
      <div class="group-arr">›</div>
    </div>`).join('');
}

export function inviteFriend(name) {
  showToast(`📨 Invitación enviada a ${name}`);
}

export function renderFriendsScreen() {
  renderFriends();
  renderGroups();
}

// ============ RESERVAS ============
const RESERVATIONS = [];

export function openReserva(placeId) {
  const p = getPlaces().find(x => x.id === placeId) || getPlaces()[0] || {};
  (function(){var _e=document.getElementById('resv-place-name');if(_e)_e.textContent = p.name})();
  document.getElementById('resv-modal').classList.add('show');
}

export function closeReserva() {
  document.getElementById('resv-modal').classList.remove('show');
}

export function confirmReserva() {
  const fecha = document.getElementById('resv-fecha').value;
  const hora  = document.getElementById('resv-hora').value;
  const cant  = document.getElementById('resv-cant').value;
  const place = document.getElementById('resv-place-name').textContent;
  if (!fecha || !hora) { showToast('❌ Completá fecha y hora'); return; }
  RESERVATIONS.push({ place, fecha, hora, cant, id: Date.now() });
  closeReserva();
  showToast(`✅ Reserva confirmada — ${place} · ${cant} personas`);
  renderReservations();
}

export function renderReservations() {
  const el = document.getElementById('resv-list');
  if (!el) return;
  if (!RESERVATIONS.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--txt3);font-size:13px;">No tenés reservas activas.<br>Tocá "Reservar" en cualquier lugar.</div>';
    return;
  }
  el.innerHTML = RESERVATIONS.map(r => `
    <div class="resv-card">
      <div class="resv-ico">🎟️</div>
      <div class="resv-info">
        <div class="resv-name">${r.place}</div>
        <div class="resv-sub">${r.fecha} · ${r.hora} · ${r.cant} personas</div>
      </div>
      <div class="resv-tag">Confirmada</div>
    </div>`).join('');
}

// ============ NOTIFICACIONES ============
const NOTIFS = [
  { id:1, type:'crowd', ico:'🔴', title:'Samsara Beach se está llenando', body:'Ya está al 87% — entrá antes que cierren', time:'Hace 5min', read:false },
  { id:2, type:'friend', ico:'👥', title:'Fede López va a Luna Disco', body:'Tu amigo marcó que va esta noche', time:'Hace 12min', read:false },
  { id:3, type:'promo',  ico:'⭐', title:'Oferta SALGO Pro', body:'Esta semana 30% off en el plan trimestral', time:'Hace 1h', read:true },
  { id:4, type:'event',  ico:'🎉', title:'Evento especial en Antares', body:'DJ invitado esta noche — cover $2.000', time:'Hace 2h', read:true },
  { id:5, type:'resv',   ico:'🎟️', title:'Recordatorio de reserva', body:'Tu reserva en Samsara es hoy a las 23:00', time:'Hace 3h', read:true },
];

export function renderNotifs() {
  const el = document.getElementById('notifs-list');
  if (!el) return;
  const unread = NOTIFS.filter(n => !n.read);
  const read   = NOTIFS.filter(n => n.read);
  el.innerHTML = `
    ${unread.length ? `<div class="friends-section-lbl">Nuevas — ${unread.length}</div>` : ''}
    ${unread.map(n => notifCard(n)).join('')}
    ${read.length ? `<div class="friends-section-lbl" style="margin-top:8px;">Anteriores</div>` : ''}
    ${read.map(n => notifCard(n)).join('')}
  `;
  // Badge
  const badge = document.getElementById('notif-badge');
  if (badge) badge.textContent = unread.length || '';
}

export function notifCard(n) {
  return `<div class="notif-card ${n.read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
    <div class="notif-ico">${n.ico}</div>
    <div class="notif-info">
      <div class="notif-title">${n.title}</div>
      <div class="notif-body">${n.body}</div>
      <div class="notif-time">${n.time}</div>
    </div>
    ${!n.read ? '<div class="notif-dot"></div>' : ''}
  </div>`;
}

export function markNotifRead(id) {
  const n = NOTIFS.find(x => x.id === id);
  if (n) { n.read = true; renderNotifs(); }
}

export function markAllRead() {
  NOTIFS.forEach(n => n.read = true);
  renderNotifs();
  showToast('✅ Todas leídas');
}


/** Pinta la tira de días de la pantalla Ofertas. */
export function renderDayStrip() {
  const strip = $('day-strip');
  if (!strip) return;
  strip.innerHTML = DIAS
    .map((d, i) => `<div class="day-chip${i === ofertaDiaActivo ? ' active' : ''}" data-dia="${i}">${d}</div>`)
    .join('');
  strip.onclick = (ev) => {
    const chip = ev.target.closest('[data-dia]');
    if (chip) setOfertaDia(Number(chip.dataset.dia), chip);
  };
}

/** Delegación de eventos de esta pantalla. */
export function bindOffersEvents() {
  document.addEventListener('click', (ev) => {
    const friend = ev.target.closest('[data-friend]');
    const invite = ev.target.closest('[data-invite]');
    const group = ev.target.closest('[data-group]');
    if (invite) { ev.stopPropagation(); inviteFriend(invite.dataset.invite); return; }
    if (friend) { showToast('Chat con ' + friend.dataset.friend + ' — próximamente 💬'); return; }
    if (group) { showToast('Grupo ' + group.dataset.group + ' — próximamente 👥'); }
  });
}
