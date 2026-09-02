// SALGO — pantallas de DEMOSTRACIÓN: Tarjeta, Billetera y Pro.
//
// ⚠️ ACÁ NO SE MUEVE PLATA DE VERDAD. ⚠️
//
// El saldo, los movimientos y las suscripciones son números en memoria: se
// borran al recargar la página. Están para mostrar cómo se vería el producto
// terminado, no para operar.
//
// Para que sean reales hace falta bastante más que código: integrar Mercado
// Pago, verificación de identidad (KYC), términos y condiciones, y las
// obligaciones que trae mover dinero de terceros en Argentina. Es la Etapa 2
// del roadmap y conviene hablarlo con un contador antes de arrancar.
//
// Mientras tanto la app muestra un cartel de DEMO en estas tres pantallas para
// que ningún usuario que la esté probando se confunda.

import { escapeHtml, showToast, $, setText } from './ui.js';

// ---------- Tarjeta SALGO (lista de espera) ----------

const NET_GRADIENTS = {
  visa: 'linear-gradient(135deg,#1a1f71,#2b3ab8,#1a6cbf)',
  master: 'linear-gradient(135deg,#1a1a1a,#eb5e28,#cc0000)',
  amex: 'linear-gradient(135deg,#007b5e,#00a86b,#006fa6)',
};
const NET_LABELS = { visa: 'VISA', master: 'MASTERCARD', amex: 'AMEX' };

export function selectNetwork(net, el) {
  const visual = $('card-visual');
  if (visual) visual.style.background = NET_GRADIENTS[net] || NET_GRADIENTS.visa;
  setText('card-net-label', NET_LABELS[net] || 'VISA');
  document.querySelectorAll('.net-opt').forEach((o) => o.classList.remove('active'));
  el?.classList.add('active');
}

export function formatCardNum(inp) {
  const v = inp.value.replace(/\D/g, '').slice(0, 16);
  inp.value = v.replace(/(\d{4})/g, '$1 ').trim();
  updateCardPreview();
}

export function formatExp(inp) {
  let v = inp.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  inp.value = v;
  updateCardPreview();
}

/**
 * Vista previa de la tarjeta.
 * En el prototipo esta función leía `_u.value` — una variable que no existía
 * en ningún lado, así que tiraba ReferenceError y la vista previa nunca se
 * actualizaba. Ahora lee del input real.
 */
export function updateCardPreview() {
  const name = ($('card-name-inp')?.value || '').toUpperCase() || 'TU NOMBRE';
  const num = $('card-num-inp')?.value.replace(/\s/g, '') || '';
  const exp = $('card-exp-inp')?.value || 'MM/AA';

  setText('card-name-display', name.slice(0, 20));
  setText('card-exp-display', exp || 'MM/AA');

  const filled = num.padEnd(16, '•').slice(0, 16);
  setText('card-number-display', filled.replace(/(.{4})/g, '$1 ').trim());
}

export function submitCard() {
  const email = ($('card-email-inp')?.value || '').trim();
  if (!email.includes('@') || !email.includes('.')) {
    showToast('❌ Ingresá un email válido para avisarte');
    return;
  }
  // No hay backend: por ahora la anotamos en el teléfono y se la pedimos al
  // usuario de nuevo cuando exista la lista real.
  showToast('✅ ¡Anotado! Te avisamos cuando salga la tarjeta SALGO 🎉');
  const inp = $('card-email-inp');
  if (inp) inp.value = '';
}

// ---------- Billetera (demo) ----------

let walletBalance = 12500;
let walletAmountStr = '0';
let walletAction = null;

const walletTxs = [
  { ico: '🎟️', name: 'Entrada Kü Club', sub: 'Vie 2 mayo · 23:48', amount: -3500, type: 'debit' },
  { ico: '⬇️', name: 'Depósito MP', sub: 'Jue 1 mayo · 18:20', amount: 10000, type: 'credit' },
  { ico: '🍻', name: 'Consumición La Barra', sub: 'Sáb 26 abril · 02:15', amount: -1400, type: 'debit' },
  { ico: '↗️', name: 'Transferencia a Maru R.', sub: 'Sáb 26 abril · 00:30', amount: -2000, type: 'debit' },
  { ico: '⭐', name: 'Cashback SALGO Pro', sub: 'Vie 25 abril · 10:00', amount: 500, type: 'credit' },
  { ico: '🎟️', name: 'Entrada Warehouse Night', sub: 'Vie 18 abril · 21:05', amount: -3500, type: 'debit' },
  { ico: '⬇️', name: 'Depósito tarjeta VISA', sub: 'Lun 14 abril · 09:30', amount: 15000, type: 'credit' },
  { ico: '🎉', name: 'Bono bienvenida', sub: 'Mar 1 abril · 00:00', amount: 1000, type: 'credit' },
];

const pesos = (n) => 'AR$ ' + Math.abs(n).toLocaleString('es-AR');

export function renderWalletTxs() {
  const el = $('wh-txs');
  if (!el) return;
  el.innerHTML = walletTxs.map((tx) => `
    <div class="wh-tx">
      <div class="wh-tx-ico" style="background:${tx.type === 'credit' ? 'rgba(0,184,118,0.1)' : 'rgba(10,10,20,0.06)'};">${escapeHtml(tx.ico)}</div>
      <div class="wh-tx-info">
        <div class="wh-tx-name">${escapeHtml(tx.name)}</div>
        <div class="wh-tx-sub">${escapeHtml(tx.sub)}</div>
      </div>
      <div class="wh-tx-amount ${tx.type}">${tx.type === 'credit' ? '+' : ''}${pesos(tx.amount)}</div>
    </div>`).join('');
  setText('wh-balance', pesos(walletBalance));
}

const WALLET_ACTIONS = {
  depositar: { title: 'Depositar dinero', sub: 'Desde tarjeta o transferencia bancaria', btn: 'Depositar', cls: '' },
  transferir: { title: 'Transferir', sub: 'Ingresá el alias o CBU del destinatario', btn: 'Transferir', cls: ' send' },
  pagar: { title: 'Pagar en el local', sub: 'Escaneá el QR o ingresá el monto', btn: 'Confirmar pago', cls: ' pay' },
  retirar: { title: 'Retirar a tarjeta', sub: 'A tu VISA terminada en 4521', btn: 'Retirar', cls: '' },
};

export function openWalletModal(action) {
  const cfg = WALLET_ACTIONS[action];
  if (!cfg) return;
  walletAction = action;
  walletAmountStr = '0';
  setText('wh-modal-title', cfg.title);
  setText('wh-modal-sub', cfg.sub);
  setText('wh-amount-val', '0');
  setText('wh-modal-bal', pesos(walletBalance));
  const btn = $('wh-confirm-btn');
  if (btn) { btn.textContent = cfg.btn; btn.className = 'wh-confirm-btn' + cfg.cls; }
  const extra = $('wh-extra-input');
  if (extra) {
    extra.innerHTML = action === 'transferir'
      ? '<input class="wh-input-field" id="wh-dest-input" placeholder="Alias o CBU del destinatario">'
      : '';
  }
  $('wh-modal')?.classList.add('show');
}

export function closeWalletModal() {
  $('wh-modal')?.classList.remove('show');
}

function showAmount() {
  setText('wh-amount-val', (parseInt(walletAmountStr, 10) || 0).toLocaleString('es-AR'));
}

export function walletNum(n) {
  walletAmountStr = walletAmountStr === '0' ? String(n) : walletAmountStr + n;
  if (walletAmountStr.length > 8) walletAmountStr = walletAmountStr.slice(0, 8);
  showAmount();
}

export function walletDel() {
  walletAmountStr = walletAmountStr.slice(0, -1) || '0';
  showAmount();
}

export function confirmWallet() {
  const amount = parseInt(walletAmountStr, 10) || 0;
  if (amount === 0) { showToast('❌ Ingresá un monto'); return; }

  const salida = walletAction !== 'depositar';
  if (salida && amount > walletBalance) { showToast('❌ Saldo insuficiente'); return; }

  const tx = {
    depositar: { ico: '⬇️', name: 'Depósito', msg: pesos(amount) + ' depositados 🎉' },
    transferir: { ico: '↗️', name: 'Transferencia enviada', msg: pesos(amount) + ' transferidos ✈️' },
    pagar: { ico: '🎟️', name: 'Pago en local', msg: 'Pago de ' + pesos(amount) + ' confirmado 🎉' },
    retirar: { ico: '💳', name: 'Retiro a VISA', msg: pesos(amount) + ' en camino a tu VISA 💳' },
  }[walletAction];

  walletBalance += salida ? -amount : amount;
  walletTxs.unshift({
    ico: tx.ico, name: tx.name, sub: 'Ahora',
    amount: salida ? -amount : amount,
    type: salida ? 'debit' : 'credit',
  });
  showToast('✅ ' + tx.msg + ' (demo)');
  closeWalletModal();
  renderWalletTxs();
}

// ---------- SALGO Pro ----------

let selectedPlan = 1;
let puntos = 1250;

const PLAN_PRICES = {
  1: ['AR$ 2.000', '/mes', '⚡ 1 semana gratis para nuevos usuarios'],
  3: ['AR$ 1.800', '/mes', '💰 Ahorrás AR$ 600 vs mensual'],
  12: ['AR$ 1.500', '/mes', '🔥 Ahorrás AR$ 6.000 vs mensual — mejor opción'],
};

export function selectPlan(months) {
  if (!PLAN_PRICES[months]) return;
  selectedPlan = months;
  document.querySelectorAll('.pro-plan').forEach((el) => { el.className = 'pro-plan unselected'; });
  const el = $('plan-' + months + 'mes');
  if (el) el.className = 'pro-plan selected';
  const [price, period, note] = PLAN_PRICES[months];
  setText('pro-price-display', price);
  setText('pro-period-display', period);
  setText('pro-saving-note', note);
}

export function activatePro() {
  const nombres = { 1: 'mensual', 3: 'trimestral', 12: 'anual' };
  showToast('🚀 Suscripción ' + nombres[selectedPlan] + ' — próximamente');
}

export function canjear(nombre, pts) {
  if (puntos < pts) {
    showToast('❌ Te faltan ' + (pts - puntos) + ' puntos para este canje');
    return;
  }
  puntos -= pts;
  renderPuntos();
  showToast('✅ ¡Canjeaste: ' + nombre + '! Mostrá el QR en el local 🎉 (demo)');
}

export function renderPuntos() {
  setText('user-points', puntos.toLocaleString('es-AR'));
  const bar = document.querySelector('.pro-points-bar-fill');
  if (bar) bar.style.width = Math.min(100, Math.round((puntos / 2000) * 100)) + '%';
  const next = document.querySelector('.pro-points-next');
  if (next) {
    const falta = Math.max(0, 2000 - puntos);
    next.textContent = falta > 0 ? falta + ' puntos más para subir a ORO 🥇' : '¡Sos nivel ORO! 🥇';
  }
}

export function bindDemoEvents() {
  $('card-name-inp')?.addEventListener('input', updateCardPreview);
  $('card-num-inp')?.addEventListener('input', (e) => formatCardNum(e.target));
  $('card-exp-inp')?.addEventListener('input', (e) => formatExp(e.target));
  document.querySelectorAll('[data-net]').forEach((el) => {
    el.addEventListener('click', () => selectNetwork(el.dataset.net, el));
  });
  $('wh-numpad')?.addEventListener('click', (ev) => {
    const key = ev.target.closest('[data-num]');
    if (!key) return;
    if (key.dataset.num === 'del') walletDel(); else walletNum(key.dataset.num);
  });
  document.querySelectorAll('[data-canje]').forEach((el) => {
    el.addEventListener('click', () => canjear(el.dataset.canje, Number(el.dataset.pts) || 0));
  });
}
