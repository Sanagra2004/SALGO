// SALGO Pro — lista de espera y suscripción.
//
// Hoy la pantalla junta interesados; el cobro está apagado. Cuando se encienda
// (ver docs/MERCADOPAGO.md) esta misma pantalla muestra el botón de contratar
// sin tocar nada más: lo decide el servidor, no el navegador.
//
// Por qué lo decide el servidor: si el interruptor viviera acá, cualquiera
// podría encenderlo desde las herramientas del navegador. Y aunque lo hiciera,
// no le serviría de nada — la tabla de suscripciones no acepta escrituras
// desde la app (ver supabase/migrations/0003_pro.sql).

import { store } from './store.js';
import { getClient, getUserId, isSignedIn } from './auth.js';
import { hasBackend, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { showToast, $, setText } from './ui.js';
import { getCity } from './cities.js';

const FUNCION = () => `${SUPABASE_URL}/functions/v1/pro`;

let planElegido = 1;
let cobroActivo = false;

export const getPlan = () => planElegido;

/** Precios de referencia. Los de verdad los pone el servidor al cobrar. */
const PRECIOS = {
  1: ['AR$ 1.500', '/mes', 'Precio estimado · todavía no se cobra'],
  3: ['AR$ 1.350', '/mes', 'Total AR$ 4.050 cada 3 meses'],
  12: ['AR$ 1.200', '/mes', 'Total AR$ 14.400 por año · la opción más barata'],
};

export function selectPlan(meses) {
  if (!PRECIOS[meses]) return;
  planElegido = meses;
  document.querySelectorAll('.pro-plan').forEach((el) => { el.className = 'pro-plan unselected'; });
  const el = $('plan-' + meses + 'mes');
  if (el) el.className = 'pro-plan selected';
  const [precio, periodo, nota] = PRECIOS[meses];
  setText('pro-price-display', precio);
  setText('pro-period-display', periodo);
  setText('pro-saving-note', nota);
}

// ─────────────────────────────────────────────────────────────
// Lista de espera
// ─────────────────────────────────────────────────────────────

function mensaje(texto, tipo = '') {
  const el = $('pro-wait-msg');
  if (!el) return;
  el.textContent = texto;
  el.className = 'pro-wait-msg ' + tipo;
}

export async function anotarse() {
  const input = $('pro-wait-email');
  const email = (input?.value || '').trim();

  if (!email.includes('@') || !email.includes('.')) {
    mensaje('Escribí un email válido para que podamos avisarte.', 'error');
    input?.focus();
    return;
  }

  if (!hasBackend()) {
    mensaje('La app está en modo local: la lista de espera necesita el servidor.', 'error');
    return;
  }
  if (!isSignedIn()) {
    mensaje('No pude identificarte. Recargá la página e intentá de nuevo.', 'error');
    return;
  }

  const btn = $('pro-wait-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  // upsert: si vuelve a anotarse, actualiza su fila en vez de fallar por
  // duplicado. Puede cambiar de idea sobre el plan.
  const { error } = await getClient()
    .from('pro_waitlist')
    .upsert({
      user_id: getUserId(),
      email,
      plan_months: planElegido,
      city: getCity(),
    });

  if (btn) { btn.disabled = false; btn.textContent = 'Anotarme en la lista'; }

  if (error) {
    console.warn('[pro] lista de espera:', error);
    mensaje('No pude guardarte. Probá de nuevo en un momento.', 'error');
    return;
  }

  mostrarAnotado(email);
  showToast('✅ Listo, te avisamos cuando Pro esté andando');
}

function mostrarAnotado(email) {
  const caja = document.querySelector('.pro-wait');
  if (!caja) return;
  caja.innerHTML = `
    <div class="pro-wait-ok">
      <div class="pro-wait-ok-ico">✅</div>
      <div class="pro-wait-title">Ya estás anotado</div>
      <div class="pro-wait-sub">
        Te vamos a escribir a <b>${escapeText(email)}</b> cuando Pro esté funcionando.
        Mientras tanto no te cobramos nada.
      </div>
      <button class="pro-wait-undo" data-action="desanotarse">Sacarme de la lista</button>
    </div>`;
}

const escapeText = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function desanotarse() {
  if (!hasBackend() || !isSignedIn()) return;
  const { error } = await getClient().from('pro_waitlist').delete().eq('user_id', getUserId());
  if (error) { showToast('❌ No pude sacarte de la lista'); return; }
  showToast('Listo, te sacamos de la lista');
  location.reload();
}

// ─────────────────────────────────────────────────────────────
// Estado: ¿ya es Pro? ¿está encendido el cobro?
// ─────────────────────────────────────────────────────────────

async function consultarCobro() {
  if (!hasBackend()) return false;
  try {
    const res = await fetch(`${FUNCION()}/estado`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return false;
    return Boolean((await res.json()).cobro_activo);
  } catch {
    // La función todavía no está desplegada: el cobro está apagado.
    return false;
  }
}

/** Contrata la suscripción. Solo se llega acá con el cobro encendido. */
export async function suscribirse() {
  if (!isSignedIn()) { showToast('Necesitás una cuenta para suscribirte'); return; }

  const email = ($('pro-wait-email')?.value || '').trim();
  const { data: { session } } = await getClient().auth.getSession();

  const res = await fetch(`${FUNCION()}/suscribir`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan_months: planElegido, email }),
  }).catch(() => null);

  const data = await res?.json().catch(() => null);

  if (!res?.ok || !data?.init_point) {
    showToast('❌ ' + (data?.error || 'No pude iniciar el pago'));
    return;
  }
  // Mercado Pago se encarga del pago; la app se entera por el webhook.
  window.location.href = data.init_point;
}

/** Pinta el estado de la suscripción del usuario, si tiene una. */
async function pintarSuscripcion() {
  if (!hasBackend() || !isSignedIn()) return;
  const sub = await store.getSubscription?.();
  if (!sub) return;

  const activa = sub.status === 'authorized' &&
    sub.current_period_end && new Date(sub.current_period_end) > new Date();

  const caja = document.querySelector('.pro-wait');
  if (caja && activa) {
    const hasta = new Date(sub.current_period_end)
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    caja.innerHTML = `
      <div class="pro-wait-ok">
        <div class="pro-wait-ok-ico">⭐</div>
        <div class="pro-wait-title">Sos SALGO Pro</div>
        <div class="pro-wait-sub">Tu suscripción está paga hasta el ${escapeText(hasta)}.</div>
        <button class="pro-wait-undo" data-action="cancelar-pro">Cancelar la suscripción</button>
      </div>`;
  }
  $('pro-cta-wrap')?.toggleAttribute('hidden', activa || !cobroActivo);
}

export async function cancelarPro() {
  if (!confirm('¿Cancelar la suscripción? Seguís siendo Pro hasta que termine el período que ya pagaste.')) return;
  const { data: { session } } = await getClient().auth.getSession();
  const res = await fetch(`${FUNCION()}/cancelar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => null);
  if (!res?.ok) { showToast('❌ No pude cancelar. Escribinos.'); return; }
  showToast('Suscripción cancelada');
  location.reload();
}

// ─────────────────────────────────────────────────────────────

export async function initPro() {
  selectPlan(1);

  cobroActivo = await consultarCobro();
  $('pro-cta-wrap')?.toggleAttribute('hidden', !cobroActivo);

  // Si ya se anotó antes, mostrarlo en vez de pedirle el mail de nuevo.
  if (hasBackend() && isSignedIn()) {
    const { data } = await getClient()
      .from('pro_waitlist').select('email').eq('user_id', getUserId()).maybeSingle();
    if (data?.email) mostrarAnotado(data.email);
  }

  await pintarSuscripcion();

  // Cuando el pago se confirma, el webhook escribe en la base y esto lo ve
  // llegar en vivo: la persona vuelve de Mercado Pago y ya está como Pro.
  store.subscribe?.('subscriptions', () => pintarSuscripcion());
}

export function bindProEvents() {
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-action="anotarse"]')) anotarse();
    if (t.closest('[data-action="desanotarse"]')) desanotarse();
    if (t.closest('[data-action="suscribirse"]')) suscribirse();
    if (t.closest('[data-action="cancelar-pro"]')) cancelarPro();
  });
  $('pro-wait-email')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') anotarse();
  });
}
