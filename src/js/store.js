// SALGO — capa de datos.
//
// Regla del proyecto: ninguna pantalla toca localStorage ni fetch de datos
// directamente. Todas importan `store` desde acá.
//
// Hoy el adaptador es localStorage (Etapa 0, sin backend). Para pasar a
// Supabase se escribe `store.supabase.js` con los mismos métodos y se cambia
// SOLO la línea de abajo. Ver docs/ROADMAP.md.

import { localStore } from './store.local.js';

export const store = localStore;
