// SALGO — perfil del usuario y modal de nombre.

import { showToast, $, initials, escapeHtml } from './ui.js';
import { getCity } from './cities.js';

const KEY_NAME = 'salgo_name';
let userName = localStorage.getItem(KEY_NAME) || '';

export const getUserName = () => userName;

export function askName() {
  $('name-modal')?.classList.add('show');
  setTimeout(() => $('modal-name')?.focus(), 400);
}

export function closeNameModal() {
  $('name-modal')?.classList.remove('show');
}

export function saveName() {
  const value = ($('modal-name')?.value || '').trim().slice(0, 40);
  if (!value) { showToast('Escribí tu nombre para arrancar'); return; }
  userName = value;
  localStorage.setItem(KEY_NAME, value);
  renderProfile();
  closeNameModal();
  showToast('¡Bienvenido a SALGO, ' + value + '! 🎉');
}

export function renderProfile() {
  if (!userName) return;
  const name = $('pf-name');
  const handle = $('pf-handle');
  const av = $('pf-av');
  if (name) name.textContent = userName;
  if (handle) handle.textContent = '@' + userName.toLowerCase().replace(/\s+/g, '') + ' · ' + getCity();
  if (av) av.textContent = initials(userName);
}

export function toggleSwitch(el) {
  el.classList.toggle('on');
  el.classList.toggle('off');
}

export function bindProfileEvents() {
  $('name-modal')?.addEventListener('click', function (ev) {
    if (ev.target === this) closeNameModal();
  });
  $('modal-name')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') saveName();
  });
  document.querySelectorAll('.sw').forEach((el) => {
    el.addEventListener('click', () => toggleSwitch(el));
  });
}
