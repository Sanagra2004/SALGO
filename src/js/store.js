// SALGO — capa de datos.
//
// Regla del proyecto: ninguna pantalla toca localStorage ni pide datos por su
// cuenta. Todas importan `store` desde acá.
//
// Hay dos adaptadores con exactamente los mismos métodos:
//
//   store.local.js     guarda en el navegador. Cada usuario ve solo lo suyo.
//   store.supabase.js  guarda en el servidor. Los datos son compartidos.
//
// Cuál se usa lo decide src/js/config.js: si están cargadas la URL y la clave
// de Supabase, se usa el servidor; si no, el modo local. Así la app nunca se
// rompe por falta de configuración, y se puede seguir trabajando sin backend.

import { hasBackend } from './config.js';
import { localStore } from './store.local.js';
import { supabaseStore, isOffline } from './store.supabase.js';

/** 'servidor' o 'local'. La app lo muestra para que se sepa qué está pasando. */
export const storeMode = hasBackend() ? 'servidor' : 'local';

export const store = hasBackend() ? supabaseStore : localStore;

/**
 * ¿El último intento de leer del servidor falló?
 * En modo local siempre es false: no hay servidor al que no llegar.
 */
export const isDisconnected = () => (hasBackend() ? isOffline() : false);

/**
 * Métodos que solo existen con servidor. En modo local devuelven valores
 * neutros para que las pantallas no tengan que preguntar en qué modo están.
 */
if (!hasBackend()) {
  store.getProfile = async () => null;
  store.saveProfile = async () => null;
  store.isAdmin = async () => true;   // en local el panel es del que lo abre
  store.setCrowd = async (placeId, pct) => {
    const p = await store.getPlace(placeId);
    if (p) await store.savePlace({ ...p, crowd: pct });
  };
}
