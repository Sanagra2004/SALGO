// SALGO — helpers de interfaz compartidos por todos los módulos.

/**
 * Escapa texto antes de meterlo en innerHTML.
 * TODO texto que venga de una persona (nombres, mensajes de chat, lugares
 * cargados desde el admin) tiene que pasar por acá. Sin esto, un mensaje como
 * <img src=x onerror=alert(1)> se ejecuta como código en el teléfono de todos
 * los que abran ese chat.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Atajo para `document.getElementById`. */
export const $ = (id) => document.getElementById(id);

/** Escribe texto en un elemento si existe. Reemplaza el patrón repetido del prototipo. */
export function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
  return el;
}

/** Escribe HTML ya escapado en un elemento si existe. */
export function setHtml(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
  return el;
}

let toastTimer = null;

export function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/** Color de acento estable a partir de un texto (mismo nombre → mismo color). */
const PALETTE = ['#ff2d55', '#b44dff', '#00e5ff', '#ffaa00', '#00f5a0', '#3b82f6', '#ef4444'];
export function colorFor(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Iniciales para los avatares. */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'YO';
  return (parts[0][0] + (parts[1]?.[0] || parts[0][1] || '')).toUpperCase();
}
