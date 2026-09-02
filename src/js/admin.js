// SALGO — panel de carga de lugares.
//
// Vive en admin.html, fuera de la app pública, y funciona de dos formas según
// esté configurado el backend (ver src/js/config.js):
//
//   CON SERVIDOR   Hay que entrar con email y contraseña, y la cuenta tiene
//                  que estar marcada como administradora en la base. Quién
//                  puede hacer qué NO lo decide este archivo: lo deciden las
//                  reglas de acceso del servidor. Aunque alguien modifique
//                  este JavaScript desde su navegador, la base le va a
//                  rechazar los cambios igual.
//
//   SIN SERVIDOR   Herramienta local para preparar contenido. Los cambios
//                  quedan en esta computadora. No hay login porque no habría
//                  nada que proteger: los datos no salen de acá.
//
// El prototipo tenía una tercera forma, que se eliminó: una pantalla de login
// que comparaba la contraseña en JavaScript contra localStorage. Eso no
// protegía nada y era peor que no tener nada, porque parecía seguro.

import { store, storeMode } from './store.js';
import { initAuth, signIn, signOut, isSignedIn, getSession } from './auth.js';
import { escapeHtml, showToast, $, setHtml } from './ui.js';

let editingId = null;
const crowdDrafts = {};

const crowdColor = (c) => (c >= 80 ? '#ef4444' : c >= 50 ? '#f59e0b' : '#00b876');

// ---------- pestañas ----------

export function adminTab(name, el) {
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
  el?.classList.add('active');
  document.querySelectorAll('.admin-pane').forEach((p) => {
    p.style.display = p.dataset.pane === name ? 'block' : 'none';
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'lugares') renderPlacesList();
  if (name === 'afluencia') renderCrowd();
}

// ---------- dashboard ----------

export async function renderDashboard() {
  const places = await store.getPlaces();
  const open = places.filter((p) => p.open).length;
  const avg = places.length
    ? Math.round(places.reduce((a, p) => a + (p.crowd || 0), 0) / places.length) : 0;
  const going = places.reduce((a, p) => a + (p.going || 0), 0);
  const tipos = new Set(places.map((p) => p.type)).size;

  setHtml('adm-stats', `
    <div class="admin-stat"><div class="admin-stat-label">Lugares activos</div><div class="admin-stat-val">${places.length}</div><div class="admin-stat-sub">${open} abiertos ahora</div></div>
    <div class="admin-stat"><div class="admin-stat-label">Afluencia prom.</div><div class="admin-stat-val">${avg}%</div><div class="admin-stat-sub">${avg >= 80 ? '🔴 Alta' : avg >= 50 ? '🟡 Media' : '🟢 Baja'}</div></div>
    <div class="admin-stat"><div class="admin-stat-label">Van esta noche</div><div class="admin-stat-val">${going}</div><div class="admin-stat-sub">usuarios confirmados</div></div>
    <div class="admin-stat"><div class="admin-stat-label">Categorías</div><div class="admin-stat-val">${tipos}</div><div class="admin-stat-sub">tipos de local</div></div>`);

  const sinCoords = places.filter((p) => p.lat == null).length;
  const aprox = places.filter((p) => p.geo === 'aprox').length;
  setHtml('adm-recent',
    '<div class="admin-section-lbl">Estado del mapa</div>' +
    `<div class="admin-note">${sinCoords === 0
      ? '✅ Los ' + places.length + ' lugares tienen coordenadas.'
      : '⚠️ ' + sinCoords + ' lugar(es) sin coordenadas: no aparecen en el mapa.'}` +
    (aprox ? `<br>📍 ${aprox} tienen ubicación aproximada (playas sin dirección exacta). Se pueden corregir a mano.` : '') +
    '</div>' +
    '<div class="admin-section-lbl">Últimos lugares</div>' +
    (places.length
      ? places.slice(-5).reverse().map((p) => `
        <div class="admin-recent-row">
          <div class="admin-recent-ico" style="background:${escapeHtml(p.color1)}22;">${escapeHtml(p.icon)}</div>
          <div style="flex:1;">
            <div class="admin-recent-name">${escapeHtml(p.name)}</div>
            <div class="admin-recent-sub">${escapeHtml(p.type)} · ${p.crowd || 0}% lleno</div>
          </div>
          <span class="admin-recent-badge ${p.open ? 'on' : 'off'}">${p.open ? 'Abierto' : 'Hoy'}</span>
        </div>`).join('')
      : '<div class="admin-empty">No hay lugares cargados</div>'));
}

// ---------- listado ----------

export async function renderPlacesList() {
  const places = await store.getPlaces();
  const el = $('adm-places-list');
  if (!el) return;
  if (!places.length) {
    el.innerHTML = '<div class="admin-empty"><div style="font-size:36px;">📍</div>Sin lugares cargados<br><small>Tocá "Nuevo lugar" para agregar</small></div>';
    return;
  }
  el.innerHTML = places.map((p) => {
    const c = crowdColor(p.crowd || 0);
    return `<div class="admin-place-row">
      <div class="admin-place-top">
        <div>
          <div class="admin-place-name">${escapeHtml(p.icon)} ${escapeHtml(p.name)}</div>
          <div class="admin-place-type">${escapeHtml(p.type)} · ${escapeHtml(p.entrada)} · ${escapeHtml(p.horario)}</div>
          <div class="admin-place-geo">${p.lat == null
            ? '⚠️ sin coordenadas — no sale en el mapa'
            : (p.geo === 'aprox' ? '📍 ubicación aproximada' : '📍 ' + p.lat.toFixed(4) + ', ' + p.lng.toFixed(4))}</div>
        </div>
        <div class="admin-place-btns">
          <button class="admin-btn-edit" data-edit="${p.id}">✏️</button>
          <button class="admin-btn-del" data-del="${p.id}">🗑️</button>
        </div>
      </div>
      <div class="admin-crowd-mini">
        <div class="admin-crowd-trk"><div class="admin-crowd-fill" style="width:${p.crowd || 0}%;background:${c};"></div></div>
        <span class="admin-crowd-num" style="color:${c};">${p.crowd || 0}%</span>
      </div>
    </div>`;
  }).join('');
}

// ---------- formulario ----------

const val = (id) => ($(id)?.value || '').trim();

export async function savePlace() {
  const name = val('adm-name');
  if (!name) { showToast('❌ El nombre es obligatorio'); return; }

  const lat = parseFloat(val('adm-lat'));
  const lng = parseFloat(val('adm-lng'));
  const genre = val('adm-genre') || 'Variado';
  const type = val('adm-type') || 'Bar';

  const capacidad = parseInt(val('adm-cap'), 10);

  try {
    await store.savePlace({
      id: editingId ?? undefined,
      name,
      city: val('adm-city') || 'Mar del Plata',
      type,
      genre,
      badge: genre.toUpperCase(),
      icon: val('adm-ico') || '📍',
      addr: val('adm-addr') || 'Mar del Plata',
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      geo: 'exacta',
      horario: val('adm-hrs') || '—',
      entrada: val('adm-ent') || 'Sin entrada',
      consumo: val('adm-cons') || '—',
      // La capacidad es el divisor del cálculo de afluencia: si está mal, el
      // porcentaje que ve la gente está mal.
      capacity: Number.isFinite(capacidad) && capacidad > 0 ? capacidad : 200,
      rating: Number((parseInt(val('adm-rat'), 10) / 10).toFixed(1)) || 4,
      open: val('adm-open') === 'true',
      color1: val('adm-color') || '#ff2d78',
      color2: '#b44dff',
      cat: [type],
    });
  } catch (err) {
    showToast('❌ ' + err.message);
    return;
  }

  showToast(editingId ? '✅ Lugar actualizado' : '✅ Lugar agregado');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    setTimeout(() => showToast('⚠️ Sin coordenadas no va a aparecer en el mapa'), 2800);
  }
  editingId = null;
  resetForm();
  await renderPlacesList();
  await renderDashboard();
}

export async function editPlace(id) {
  const p = await store.getPlace(id);
  if (!p) return;
  editingId = p.id;
  const set = (elId, value) => { const el = $(elId); if (el) el.value = value; };
  set('adm-name', p.name);
  set('adm-city', p.city);
  set('adm-type', p.type);
  set('adm-genre', p.genre);
  set('adm-ico', p.icon);
  set('adm-addr', p.addr);
  set('adm-lat', p.lat ?? '');
  set('adm-lng', p.lng ?? '');
  set('adm-hrs', p.horario);
  set('adm-ent', p.entrada);
  set('adm-cons', p.consumo);
  set('adm-cap', p.capacity ?? 200);
  set('adm-crowd', p.crowd);
  set('adm-rat', Math.round(p.rating * 10));
  set('adm-open', String(p.open));
  set('adm-color', p.color1);
  syncRanges();
  const title = $('adm-form-title');
  if (title) title.textContent = 'Editar ' + p.name;
  adminTab('nuevo', document.querySelector('[data-tab="nuevo"]'));
}

export async function deletePlace(id) {
  const p = await store.getPlace(id);
  if (!p) return;
  if (!confirm(`¿Borrar "${p.name}"? No se puede deshacer.`)) return;
  try {
    await store.deletePlace(id);
    showToast('🗑️ Lugar eliminado');
    await renderPlacesList();
    await renderDashboard();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

export function resetForm() {
  editingId = null;
  ['adm-name', 'adm-genre', 'adm-addr', 'adm-lat', 'adm-lng', 'adm-hrs', 'adm-ent', 'adm-cons']
    .forEach((id) => { const el = $(id); if (el) el.value = ''; });
  const ico = $('adm-ico'); if (ico) ico.value = '📍';
  const cap = $('adm-cap'); if (cap) cap.value = 200;
  const crowd = $('adm-crowd'); if (crowd) crowd.value = 50;
  const rat = $('adm-rat'); if (rat) rat.value = 45;
  syncRanges();
  const title = $('adm-form-title');
  if (title) title.textContent = 'Nuevo lugar';
}

function syncRanges() {
  const crowd = $('adm-crowd');
  const rat = $('adm-rat');
  if (crowd) { const v = $('adm-crowd-val'); if (v) v.textContent = crowd.value + '%'; }
  if (rat) { const v = $('adm-rat-val'); if (v) v.textContent = '★ ' + (rat.value / 10).toFixed(1); }
}

// ---------- afluencia ----------

export async function renderCrowd() {
  const places = await store.getPlaces();
  const el = $('adm-crowd-list');
  if (!el) return;
  if (!places.length) { el.innerHTML = '<div class="admin-empty">No hay lugares cargados</div>'; return; }
  el.innerHTML = places.map((p) => {
    const c = crowdColor(p.crowd || 0);
    return `<div class="admin-crowd-row">
      <div class="admin-crowd-ico" style="background:${escapeHtml(p.color1)}22;">${escapeHtml(p.icon)}</div>
      <div class="admin-crowd-info">
        <div class="admin-crowd-name">${escapeHtml(p.name)}
          <span class="admin-crowd-val" data-val="${p.id}" style="color:${c};">${p.crowd || 0}%</span>
        </div>
        <input type="range" class="admin-crowd-slider" data-slider="${p.id}" value="${p.crowd || 0}" min="0" max="100">
      </div>
      <button class="admin-crowd-update" data-savecrowd="${p.id}">OK</button>
    </div>`;
  }).join('');
}

export async function saveCrowd(id) {
  const place = await store.getPlace(id);
  if (!place) return;
  const value = crowdDrafts[id];
  if (value == null) { showToast('No moviste la barra 🤔'); return; }
  // setCrowd guarda una carga MANUAL con marca de tiempo. Le gana al cálculo
  // automático, pero solo por 6 horas: pasado ese rato un número viejo dejaría
  // de ser cierto, así que vuelve a mandar el automático.
  try {
    await store.setCrowd(id, value);
    showToast('✅ ' + place.name + ': ' + value + '% (vale por 6 horas)');
    await renderDashboard();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// ---------- utilidades ----------

export async function resetToSeed() {
  if (!confirm('¿Restaurar los 30 lugares de Mar del Plata? Se pierde lo que hayas cargado.')) return;
  try {
    await store.resetToSeed();
    showToast('✅ Lugares restaurados');
    await renderPlacesList();
    await renderDashboard();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

export async function deleteAll() {
  if (!confirm('¿Borrar TODOS los lugares? No se puede deshacer.')) return;
  try {
    await store.replaceAllPlaces([]);
    showToast('🗑️ Todos los lugares eliminados');
    await renderPlacesList();
    await renderDashboard();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

/** Exporta los lugares a un archivo JSON, para respaldo o para pasarlos a otra máquina. */
export async function exportPlaces() {
  const places = await store.getPlaces();
  const blob = new Blob([JSON.stringify(places, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'salgo-lugares.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('⬇️ Descargando salgo-lugares.json');
}

export async function importPlaces(file) {
  try {
    const list = JSON.parse(await file.text());
    if (!Array.isArray(list)) throw new Error('El archivo no es una lista de lugares');
    await store.replaceAllPlaces(list);
    showToast('✅ ' + list.length + ' lugares importados');
    await renderPlacesList();
    await renderDashboard();
  } catch (err) {
    showToast('❌ No pude leer el archivo: ' + err.message);
  }
}

// ---------- eventos ----------

/**
 * Puerta de entrada.
 *
 * Importante: esto NO es la seguridad. Es la interfaz. La seguridad son las
 * reglas de acceso de la base, que se aplican del lado del servidor y no se
 * pueden saltear desde el navegador. Acá solo decidimos qué mostrar.
 */
async function abrirPuerta() {
  const login = $('adm-login');
  const panel = $('adm-panel');
  const avisoLocal = $('adm-modo-local');

  if (storeMode === 'local') {
    if (login) login.style.display = 'none';
    if (avisoLocal) avisoLocal.style.display = 'block';
    if (panel) panel.style.display = 'block';
    return true;
  }

  if (avisoLocal) avisoLocal.style.display = 'none';
  await initAuth();

  if (!isSignedIn() || !(await store.isAdmin())) {
    if (login) login.style.display = 'block';
    if (panel) panel.style.display = 'none';
    // Si entró pero no es admin, hay que decirlo: si no, parece que la
    // contraseña estuviera mal y la persona la reintenta cien veces.
    if (isSignedIn() && getSession()?.user?.email) {
      setHtml('adm-login-err',
        'Entraste como <b>' + escapeHtml(getSession().user.email) + '</b>, pero esa ' +
        'cuenta no tiene permisos de administración. Se habilitan desde el panel ' +
        'de Supabase (ver docs/SUPABASE.md).');
    }
    return false;
  }

  if (login) login.style.display = 'none';
  if (panel) panel.style.display = 'block';
  setHtml('adm-quien', 'Conectado como <b>' +
    escapeHtml(getSession()?.user?.email || 'vos') + '</b>');
  return true;
}

async function entrar() {
  const email = ($('adm-email')?.value || '').trim();
  const pass = $('adm-pass')?.value || '';
  if (!email || !pass) { setHtml('adm-login-err', 'Completá email y contraseña'); return; }
  setHtml('adm-login-err', '');

  const res = await signIn(email, pass);
  if (res.error) { setHtml('adm-login-err', escapeHtml(res.error)); return; }

  if (await abrirPuerta()) {
    await renderDashboard();
    showToast('✅ Bienvenido');
  }
}

export async function initAdmin() {
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    const tab = t.closest('[data-tab]');
    if (tab) { adminTab(tab.dataset.tab, tab); return; }
    const edit = t.closest('[data-edit]');
    if (edit) { editPlace(Number(edit.dataset.edit)); return; }
    const del = t.closest('[data-del]');
    if (del) { deletePlace(Number(del.dataset.del)); return; }
    const sc = t.closest('[data-savecrowd]');
    if (sc) { saveCrowd(Number(sc.dataset.savecrowd)); return; }
    if (t.closest('[data-action="guardar"]')) savePlace();
    if (t.closest('[data-action="limpiar"]')) resetForm();
    if (t.closest('[data-action="restaurar"]')) resetToSeed();
    if (t.closest('[data-action="borrar-todo"]')) deleteAll();
    if (t.closest('[data-action="exportar"]')) exportPlaces();
    if (t.closest('[data-action="entrar"]')) entrar();
    if (t.closest('[data-action="salir"]')) signOut().then(() => location.reload());
  });

  $('adm-pass')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') entrar();
  });

  document.addEventListener('input', (ev) => {
    const slider = ev.target.closest('[data-slider]');
    if (slider) {
      const id = Number(slider.dataset.slider);
      const v = Number(slider.value);
      crowdDrafts[id] = v;
      const label = document.querySelector(`[data-val="${id}"]`);
      if (label) { label.textContent = v + '%'; label.style.color = crowdColor(v); }
      return;
    }
    if (ev.target.id === 'adm-crowd' || ev.target.id === 'adm-rat') syncRanges();
  });

  $('adm-import')?.addEventListener('change', (ev) => {
    const file = ev.target.files?.[0];
    if (file) importPlaces(file);
    ev.target.value = '';
  });

  resetForm();
  if (await abrirPuerta()) {
    adminTab('dashboard', document.querySelector('[data-tab="dashboard"]'));
  }
}
