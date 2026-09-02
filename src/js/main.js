// SALGO — arranque de la app y navegación entre pantallas.

import { showToast, $ } from './ui.js';
import { store, storeMode } from './store.js';
import { initAuth, onAuthChange } from './auth.js';
import * as places from './places.js';
import * as cities from './cities.js';
import * as chat from './chat.js';
import * as ai from './ai.js';
import * as offers from './offers.js';
import * as demo from './demo.js';
import * as profile from './profile.js';
import { requestLocation, useCityCenter, isPrecise } from './geo.js';

const SCREENS = {
  home: 'screen-home',
  explore: 'screen-explore',
  offers: 'screen-offers',
  profile: 'screen-profile',
  detail: 'screen-detail',
  ai: 'screen-ai',
  pro: 'screen-pro',
  card: 'screen-card',
  wallet: 'screen-wallet',
  friends: 'screen-friends',
  notifs: 'screen-notifs',
};

let currentScreen = 'home';

export function showScreen(name) {
  if (!SCREENS[name]) return;
  Object.entries(SCREENS).forEach(([key, id]) => {
    const el = $(id);
    if (!el) return;
    if (key === name) {
      el.classList.remove('hidden', 'slide-left');
    } else if (name === 'detail' && key === currentScreen) {
      // La pantalla anterior se corre a la izquierda para que el detalle entre
      // por la derecha, como en una app nativa.
      el.classList.add('slide-left');
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
      el.classList.remove('slide-left');
    }
  });
  currentScreen = name;
  onEnterScreen(name);
}

function onEnterScreen(name) {
  if (name === 'friends') offers.renderFriendsScreen();
  if (name === 'offers') { offers.renderDayStrip(); offers.renderOfertas(); }
  if (name === 'notifs') offers.renderNotifs();
  if (name === 'wallet') demo.renderWalletTxs();
  if (name === 'pro') demo.renderPuntos();
  if (name === 'profile') profile.renderProfile();
  if (name === 'home') places.renderHomeMap();
}

export function goNav(name, el) {
  document.querySelectorAll('.ni').forEach((n) => {
    n.classList.remove('active');
    n.querySelector('.ni-dot')?.remove();
  });
  if (el) {
    el.classList.add('active');
    const dot = document.createElement('div');
    dot.className = 'ni-dot';
    el.appendChild(dot);
  }
  showScreen(name);
}

export function goBack() {
  if (currentScreen === 'detail') places.closeDetail();
  else showScreen('home');
}

function updateClock() {
  const now = new Date();
  const t = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  document.querySelectorAll('#clock,#clock2,#clock-ai').forEach((el) => { el.textContent = t; });
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => goNav(el.dataset.nav, el.classList.contains('ni') ? el : null));
  });
  document.querySelectorAll('[data-back]').forEach((el) => {
    el.addEventListener('click', goBack);
  });
  $('search-input')?.addEventListener('input', (ev) => places.applyFilter(ev.target.value));
  document.querySelectorAll('#chips-home .chip').forEach((el) => {
    el.addEventListener('click', () => places.setChip(el, el.dataset.chip));
  });
  // El mapa del home abre el mapa grande.
  $('main-map-open')?.addEventListener('click', places.openFullMap);
  $('fullmap-close')?.addEventListener('click', places.closeFullMap);
  document.querySelectorAll('.loc-pill, .city-display-btn').forEach((el) => {
    el.addEventListener('click', cities.openCityModal);
  });
  $('city-search-inp')?.addEventListener('input', (ev) => cities.filterCities(ev.target.value));
  $('city-custom-inp')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') cities.setCustomCity();
  });
  $('city-modal')?.addEventListener('click', function (ev) {
    if (ev.target === this) cities.closeCityModal();
  });
}

/**
 * El puente con el HTML.
 *
 * El markup del prototipo usa `onclick="funcion()"` en muchos lugares. Con
 * módulos ES esas funciones ya no son globales, así que se publican acá a
 * propósito, en un solo lugar y de forma explícita.
 *
 * Es deuda técnica reconocida: lo prolijo es que cada botón se enganche por
 * `data-*` como los de arriba. Se va migrando de a poco; mientras tanto esto
 * mantiene la app andando sin reescribir 200 atributos de una sentada.
 */
function exposeForInlineHandlers() {
  Object.assign(window, {
    showScreen, goNav, goNavExtended: goNav, goBack,
    openDetail: places.openDetail,
    closeDetail: places.closeDetail,
    markGoing: places.markGoing,
    sharePlace: places.sharePlace,
    filterPlaces: places.applyFilter,
    filterChip: (el, cat) => places.setChip(el, cat),
    openFullMap: places.openFullMap,
    closeFullMap: places.closeFullMap,
    openCityModal: cities.openCityModal,
    closeCityModal: cities.closeCityModal,
    filterCities: cities.filterCities,
    selectCity: cities.selectCity,
    setCustomCity: cities.setCustomCity,
    sendMsg: chat.sendMsg,
    switchChatTab: chat.switchChatTab,
    aiSend: ai.aiSend,
    aiSuggest: ai.aiSuggest,
    askName: profile.askName,
    saveName: profile.saveName,
    toggleSwitch: profile.toggleSwitch,
    openWallet: () => showScreen('wallet'),
    openCard: () => showScreen('card'),
    openPro: () => showScreen('pro'),
    openWalletModal: demo.openWalletModal,
    closeWalletModal: demo.closeWalletModal,
    walletNum: demo.walletNum,
    walletDel: demo.walletDel,
    confirmWallet: demo.confirmWallet,
    selectPlan: demo.selectPlan,
    activatePro: demo.activatePro,
    canjear: demo.canjear,
    submitCard: demo.submitCard,
    selectNetwork: demo.selectNetwork,
    formatCardNum: demo.formatCardNum,
    formatExp: demo.formatExp,
    updateCardPreview: demo.updateCardPreview,
    setOfertaDia: offers.setOfertaDia,
    openStory: offers.openStory,
    closeStory: offers.closeStory,
    nextStory: offers.nextStory,
    prevStory: offers.prevStory,
    inviteFriend: offers.inviteFriend,
    openReserva: offers.openReserva,
    closeReserva: offers.closeReserva,
    confirmReserva: offers.confirmReserva,
    markNotifRead: offers.markNotifRead,
    markAllRead: offers.markAllRead,
    showToast,
  });
}

async function init() {
  exposeForInlineHandlers();
  updateClock();
  setInterval(updateClock, 30000);

  // Sesión primero: sin usuario no se puede leer nada del servidor. Con el
  // modo anónimo esto no le pide nada a nadie, es instantáneo y silencioso.
  // Si falla (sin señal, proyecto mal configurado), la app sigue igual con lo
  // que tenga guardado en el navegador.
  try {
    await initAuth();
  } catch (err) {
    console.warn('[salgo] no pude iniciar sesión:', err);
  }

  bindNav();
  places.bindListEvents();
  cities.bindCityEvents();
  chat.bindChatEvents();
  profile.bindProfileEvents();
  offers.bindOffersEvents();
  demo.bindDemoEvents();
  ai.bindAiEvents();

  await cities.initCities();

  // Arrancamos con el centro de la ciudad para poder pintar algo YA, sin
  // esperar al GPS ni al cartel de permisos.
  useCityCenter(cities.getCity());
  await places.reload();
  profile.renderProfile();
  offers.initStories();
  offers.renderNotifs();
  demo.selectPlan(1);
  demo.renderPuntos();

  // Recién ahora, con la app ya en pantalla, pedimos la ubicación.
  setTimeout(async () => {
    await requestLocation(cities.getCity());
    await places.reload();
    if (isPrecise()) showToast('📍 Listo, ordenado por lo que tenés más cerca');
  }, 1200);

  if (!profile.getUserName()) setTimeout(profile.askName, 2000);

  // Cambios en los lugares (afluencia, alta de un lugar nuevo desde el panel)
  // y en quién va. Con servidor, esto llega en vivo desde otras personas.
  store.subscribe('places', () => places.reload());
  store.subscribe('going', () => places.reload());

  // En modo local, el aviso llega por el evento de storage entre pestañas.
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'salgo_places') location.reload();
  });

  // Si la sesión cambia (entró con su cuenta, se cerró), refrescamos lo que
  // depende de quién sos: tu "voy" y tus mensajes.
  onAuthChange(() => places.reload());

  console.info('[salgo] modo de datos:', storeMode);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
