// SALGO — configuración del backend.
//
// ── CÓMO COMPLETAR ESTO ────────────────────────────────────────────────
// Pegá abajo la URL y la clave de tu proyecto de Supabase. El paso a paso
// para conseguirlas está en docs/SUPABASE.md.
//
// Mientras estén vacías, la app sigue funcionando con los datos guardados en
// el navegador, igual que en la Etapa 0. No se rompe nada: solo que el chat y
// el "voy" no se comparten entre usuarios todavía.
//
// ── ¿ES SEGURO QUE LA CLAVE ESTÉ ACÁ? ──────────────────────────────────
// Sí, la clave `anon` es PÚBLICA por diseño: viaja al navegador de cada
// usuario y cualquiera la puede leer. No es un secreto y va al repositorio
// sin problema. Lo que protege los datos son las reglas de acceso (RLS) de
// la base, que están en supabase/migrations/ y tienen tests en supabase/tests/.
//
// La que NUNCA va acá — ni en ningún archivo del proyecto — es la clave
// `service_role`: esa saltea todas las reglas de acceso. Vive solo en el panel
// de Supabase.

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

/** ¿Está configurado el backend? Si no, la app usa el modo local. */
export const hasBackend = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));

/** Zona horaria con la que se define qué es "esta noche". */
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * La "noche" de hoy, en formato YYYY-MM-DD.
 *
 * Ojo con esto: para SALGO, salir a las 3 de la mañana del domingo sigue
 * siendo "la noche del sábado". Si usáramos la fecha del calendario, a las
 * 00:00 se borrarían todos los "voy" justo cuando la gente está saliendo.
 * Por eso el día arranca a las 6 de la mañana, no a medianoche.
 */
export function nightOf(date = new Date()) {
  const local = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  if (local.getHours() < 6) local.setDate(local.getDate() - 1);
  return local.toISOString().slice(0, 10);
}
