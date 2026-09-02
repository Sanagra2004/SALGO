// SALGO — sesión del usuario.
//
// Estrategia: ANÓNIMO PRIMERO.
//
// Cuando alguien abre SALGO por primera vez se le crea una cuenta anónima sin
// pedirle nada. Ya puede mirar todo, marcar que va y chatear. Solo se le pide
// el email cuando quiere algo que lo necesita de verdad: recuperar su cuenta
// en otro teléfono, o más adelante la suscripción.
//
// Por qué: la app se prueba un sábado a la noche, en la calle, con mala señal.
// Una pantalla de registro en ese momento pierde a la mayoría de la gente. La
// cuenta anónima se convierte después en una real sin perder nada de lo hecho
// —los mensajes, el "voy", el nombre— porque es el mismo usuario, solo que con
// email agregado.

import { hasBackend } from './config.js';
import { showToast } from './ui.js';

let client = null;
let session = null;
const listeners = [];

/** Avisa a la app cuando cambia quién está usando la sesión. */
export function onAuthChange(cb) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function emit() {
  listeners.forEach((cb) => {
    try { cb(session); } catch (err) { console.warn('[auth]', err); }
  });
}

export const getClient = () => client;
export const getSession = () => session;
export const getUserId = () => session?.user?.id ?? null;
export const isSignedIn = () => Boolean(session?.user);

/** ¿Es una cuenta anónima (todavía sin email)? */
export const isAnonymous = () =>
  Boolean(session?.user?.is_anonymous ?? (session?.user && !session.user.email));

/**
 * Arranca la sesión. Devuelve el cliente de Supabase, o null si el backend
 * todavía no está configurado (ahí la app sigue en modo local).
 */
export async function initAuth() {
  if (!hasBackend()) return null;
  if (typeof supabase === 'undefined') {
    console.warn('[auth] no se cargó vendor/supabase/supabase.js');
    return null;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./config.js');
  client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 5 } },
  });

  const { data } = await client.auth.getSession();
  session = data.session;

  client.auth.onAuthStateChange((_event, next) => {
    session = next;
    emit();
  });

  // Sin sesión previa: cuenta anónima, sin molestar a nadie.
  if (!session) {
    const { data: anon, error } = await client.auth.signInAnonymously();
    if (error) {
      // El caso más común: el proyecto tiene desactivado el login anónimo.
      console.warn('[auth] no pude crear la sesión anónima:', error.message);
    } else {
      session = anon.session;
    }
  }

  emit();
  return client;
}

/**
 * Convierte la cuenta anónima en una real, sin perder nada.
 * Es el MISMO usuario: se le agrega email y contraseña.
 */
export async function upgradeAccount(email, password) {
  if (!client) return { error: 'El backend no está configurado' };
  if (!email.includes('@')) return { error: 'Ese email no parece válido' };
  if ((password || '').length < 8) {
    return { error: 'La contraseña necesita al menos 8 caracteres' };
  }

  const { error } = await client.auth.updateUser({ email, password });
  if (error) return { error: traducir(error.message) };

  return { ok: true, needsConfirmation: true };
}

/** Entrar con una cuenta ya existente (por ejemplo desde otro teléfono). */
export async function signIn(email, password) {
  if (!client) return { error: 'El backend no está configurado' };
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? { error: traducir(error.message) } : { ok: true };
}

/**
 * Cerrar sesión. Vuelve a una cuenta anónima nueva en vez de dejar la app
 * inutilizable: sin usuario no se puede chatear ni marcar que vas.
 */
export async function signOut() {
  if (!client) return;
  await client.auth.signOut();
  session = null;
  const { data } = await client.auth.signInAnonymously();
  session = data?.session ?? null;
  emit();
  showToast('Cerraste sesión');
}

/** Mensajes de Supabase, que vienen en inglés, pasados a algo legible. */
function traducir(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Ese email ya tiene cuenta. Probá entrando con tu contraseña.';
  }
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos';
  if (m.includes('email not confirmed')) return 'Todavía no confirmaste el email';
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos. Esperá unos minutos.';
  }
  if (m.includes('password')) return 'La contraseña es muy débil';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión';
  return msg;
}
