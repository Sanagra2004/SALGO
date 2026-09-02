// SALGO — service worker.
//
// Hace dos cosas: que la app se pueda instalar en el celular, y que abra
// aunque no haya señal. Lo segundo importa más de lo que parece: adentro de
// un boliche la conexión es mala, y ahí es justo cuando la gente la usa.

const VERSION = 'salgo-v2';
const APP_SHELL = [
  './',
  './index.html',
  './admin.html',
  './manifest.webmanifest',
  './public/icon-192.png',
  './public/icon-512.png',
  './vendor/leaflet/leaflet.js',
  './vendor/supabase/supabase.js',
  './vendor/leaflet/leaflet.css',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/styles/components.css',
  './src/styles/screens.css',
  './src/js/main.js',
  './src/js/store.js',
  './src/js/store.local.js',
  './src/js/store.supabase.js',
  './src/js/config.js',
  './src/js/auth.js',
  './src/js/ui.js',
  './src/js/geo.js',
  './src/js/map.js',
  './src/js/places.js',
  './src/js/cities.js',
  './src/js/chat.js',
  './src/js/ai.js',
  './src/js/offers.js',
  './src/js/demo.js',
  './src/js/profile.js',
  './src/js/admin.js',
  './src/data/places.mdp.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll falla entero si un solo archivo falla, así que los pedimos
      // de a uno y toleramos que alguno no esté.
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Los tiles del mapa y las fotos son de otros dominios: se sirven de la red
  // y se guarda una copia, pero nunca bloquean la app si no llegan.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION + '-ext').then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Lo propio: primero el cache (abre instantáneo y sin señal), y en paralelo
  // se busca una versión nueva para la próxima vez.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || network;
    })
  );
});
