// SALGO — chat por lugar y pestaña "quién va".
//
// OJO: en Etapa 0 los mensajes se guardan en el teléfono de cada persona. Dos
// usuarios NO se ven entre sí todavía. El chat compartido de verdad llega con
// el backend (Etapa 1) — ver docs/ROADMAP.md. La app avisa esto en pantalla
// para que nadie crea que está hablando con alguien.

import { store } from './store.js';
import { escapeHtml, showToast, $, colorFor, initials } from './ui.js';
import { getUserName, askName } from './profile.js';
import { FRIENDS_DATA } from './offers.js';

let currentTab = 'msgs';
let currentPlaceId = null;

function hora() {
  const d = new Date();
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function switchChatTab(tab) {
  currentTab = tab;
  $('chat-tab-msgs')?.classList.toggle('active', tab === 'msgs');
  $('chat-tab-going')?.classList.toggle('active', tab === 'going');
  const msgs = $('detail-msgs');
  const going = $('going-people-list');
  const input = $('chat-input-row');
  if (msgs) msgs.style.display = tab === 'msgs' ? 'flex' : 'none';
  if (going) going.style.display = tab === 'going' ? 'flex' : 'none';
  if (input) input.style.display = tab === 'msgs' ? 'flex' : 'none';
  if (tab === 'going') renderGoingPeople();
}

export async function renderChat(placeId) {
  currentPlaceId = Number(placeId);
  await renderOnlineAvatars(currentPlaceId);
  switchChatTab('msgs');

  const el = $('detail-msgs');
  if (!el) return;
  const msgs = await store.getMessages(currentPlaceId);

  if (!msgs.length) {
    el.innerHTML =
      '<div class="chat-empty"><div class="chat-empty-ico">💬</div>' +
      '¡Nadie escribió todavía!<br>Sé el primero en romper el hielo.</div>';
    return;
  }

  el.innerHTML =
    '<div class="chat-local-note">Por ahora este chat se guarda solo en tu teléfono</div>' +
    msgs.map((m) => {
      const mine = !!m.me;
      const color = m.color || colorFor(m.name);
      const av = m.av || initials(m.name);
      return `
      <div class="msg-row-new ${mine ? 'me' : ''}">
        ${mine ? '' : `<div class="msg-av-new" style="background:${escapeHtml(color)};">${escapeHtml(av)}</div>`}
        <div class="msg-body-new">
          ${mine ? '' : `<div class="msg-name-new">${escapeHtml(m.name)}</div>`}
          <div class="msg-bub-new ${mine ? 'me' : 'other'}">${escapeHtml(m.txt)}</div>
          <div class="msg-time-new">${escapeHtml(m.time || 'ahora')}</div>
        </div>
      </div>`;
    }).join('');
  el.scrollTop = el.scrollHeight;
}

/** Publica un mensaje propio en el chat de un lugar. */
export async function postOwnMessage(placeId, txt) {
  const name = getUserName() || 'Vos';
  await store.sendMessage(Number(placeId), {
    name,
    av: initials(name),
    color: colorFor(name),
    txt,
    me: true,
    time: hora(),
  });
  if (Number(placeId) === currentPlaceId) await renderChat(placeId);
}

export async function sendMsg() {
  if (!getUserName()) { askName(); return; }
  const input = $('chat-input');
  const txt = (input?.value || '').trim();
  if (!txt || currentPlaceId == null) return;
  input.value = '';
  await postOwnMessage(currentPlaceId, txt);
}

async function renderOnlineAvatars(placeId) {
  const el = $('chat-online-avs');
  const countEl = $('chat-online-count');
  const place = await store.getPlace(placeId);
  if (el) {
    el.innerHTML = ['Agus M.', 'Romi V.', 'Marti P.', 'Santi R.']
      .map((n, i) => `<div class="chat-oav" style="background:${colorFor(n)};margin-left:${i === 0 ? '0' : '-5px'};">${escapeHtml(initials(n))}</div>`)
      .join('');
  }
  if (countEl) countEl.textContent = ((place?.going) || 0) + ' van esta noche';
}

async function renderGoingPeople() {
  const el = $('going-people-list');
  if (!el || currentPlaceId == null) return;
  const place = await store.getPlace(currentPlaceId);
  const amigos = FRIENDS_DATA.filter((f) => f.going === place?.name);
  const gente = [
    ...amigos.map((f) => ({ name: f.name, status: 'Amigo tuyo · ' + f.status })),
    { name: 'Agus M.', status: 'Confirmado 🎉' },
    { name: 'Romi V.', status: 'Llega a las 01:00' },
    { name: 'Marti P.', status: 'Trae 3 amigos' },
    { name: 'Santi R.', status: 'En camino 🚗' },
    { name: 'Ceci G.', status: 'Reservó mesa VIP' },
  ];
  el.innerHTML = gente.map((g) => `
    <div class="going-person" data-saludar="${escapeHtml(g.name)}">
      <div class="going-person-av" style="background:${colorFor(g.name)};">${escapeHtml(initials(g.name))}</div>
      <div style="flex:1;">
        <div class="going-person-name">${escapeHtml(g.name)}</div>
        <div class="going-person-status">${escapeHtml(g.status)}</div>
      </div>
      <div class="going-person-btn">Saludar</div>
    </div>`).join('');
}

export function bindChatEvents() {
  $('going-people-list')?.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-saludar]');
    if (row) showToast('Chat con ' + row.dataset.saludar + ' — próximamente 💬');
  });
  $('chat-input')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); sendMsg(); }
  });
}
