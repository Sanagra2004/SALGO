// SALGO IA — asistente de la app.
//
// IMPORTANTE — por qué acá no hay ninguna llamada a una API de IA:
//
// El prototipo hacía `fetch('https://api.anthropic.com/v1/messages')` desde el
// navegador, sin API key. Eso nunca funcionó: la respuesta era siempre 401 y
// caía al motor local de abajo. Y poner la key en este archivo sería peor:
// cualquiera que abra las herramientas de desarrollo del navegador la ve y la
// puede usar, y la factura llega igual.
//
// La forma correcta es una función del lado del servidor que guarde la key y
// haga ella la llamada. Está planificado para la Etapa 1 (ver docs/ROADMAP.md).
// Hasta entonces, este motor local responde sobre los lugares realmente
// cargados — que para las preguntas típicas ("¿qué está más lleno?", "bares
// tranquilos", "lugares gratis") alcanza bastante bien.

import { escapeHtml, $ } from './ui.js';
import { getPlaces } from './places.js';
import { getUserName } from './profile.js';
import { initials } from './ui.js';

export function aiRespond(q, allPlaces) {
  const ql = String(q || '').toLowerCase();
  const places = (allPlaces || []).filter((p) => p && p.name);
  if (!places.length) {
    return 'Todavía no hay lugares cargados en esta ciudad. Probá cambiando de ciudad desde el pin de arriba 📍';
  }

  // Ordenados por criterios
  const byRating   = [...places].sort((a,b) => b.rating - a.rating);
  const byCrowd    = [...places].sort((a,b) => b.crowd - a.crowd);
  const byEmpty    = [...places].sort((a,b) => a.crowd - b.crowd);
  const open       = places.filter(p => p.open);
  const notOpen    = places.filter(p => !p.open);
  const boliches   = places.filter(p => (p.cat || []).includes('Boliche'));
  const bares      = places.filter(p => (p.cat || []).includes('Bar'));
  const techno     = places.filter(p => (p.cat || []).includes('Techno'));
  const cumbia     = places.filter(p => (p.cat || []).includes('Cumbia'));
  const free       = places.filter(p => String(p.entrada || '').toLowerCase().includes('sin'));
  const casi_lleno = places.filter(p => p.crowd >= 80);
  const tranqui    = places.filter(p => p.crowd < 40);

  // Estas plantillas arman HTML, así que TODO dato del lugar va escapado:
  // los nombres los carga una persona desde el panel de admin.
  const e = escapeHtml;
  const fmt = (p) => `<strong>${e(p.icon)} ${e(p.name)}</strong> (${e(p.dist)} · ${e(p.entrada)} · ${Number(p.crowd) || 0}% lleno)`;
  const fmtSimple = (p) => `<strong>${e(p.icon)} ${e(p.name)}</strong>`;

  // ── LLENO / AFLUENCIA ALTA ──
  if (/lleno|llena|llenos|más gente|mucha gente|explotad|full|copa|repleto|aglomer/.test(ql)) {
    if (casi_lleno.length === 0) return `Ningún lugar está al tope ahora. El más lleno es ${fmt(byCrowd[0])}. Buen momento para entrar antes que se llene 🏃`;
    return `Los más llenos ahora son:\n${casi_lleno.map(p => `• ${fmt(p)}`).join('\n')}\n\nSi querés entrar, apurate que están por cerrar la puerta 🔴`;
  }

  // ── TRANQUILO / VACÍO ──
  if (/tranquil|vací|poca gente|no tan lleno|relajad|sin cola|chill/.test(ql)) {
    if (tranqui.length === 0) return `Esta noche hay bastante movimiento en todos lados. El más tranquilo es ${fmt(byEmpty[0])}. Igual vas a tener compañía 😄`;
    return `Los más tranquilos ahora:\n${tranqui.map(p => `• ${fmt(p)}`).join('\n')}\n\nPerfecto para ir temprano o charlar sin gritar 🟢`;
  }

  // ── MEJOR RATING ──
  if (/mejor|top|recomend|bueno|buena|qué vale|vale la pena|rating|estrella|puntuaci/.test(ql)) {
    const top = byRating.slice(0, 3);
    return `Los mejor puntuados por la gente:\n${top.map((p,i) => `${['🥇','🥈','🥉'][i]} ${fmtSimple(p)} — ★ ${Number(p.rating).toFixed(1)}`).join('\n')}\n\n${fmtSimple(byRating[0])} es el favorito con ${byRating[0].rating} puntos. ¡No falla!`;
  }

  // ── ABIERTO AHORA ──
  if (/abiert|abre|funcionan|está abierto|open|entrar ahora/.test(ql)) {
    if (open.length === 0) return `Por ahora ningún lugar está abierto todavía. Todos abren después de las 23hs. ¡Hacé el pre! 🍻`;
    return `Abiertos ahora mismo:\n${open.map(p => `• ${fmt(p)}`).join('\n')}\n\n${notOpen.length > 0 ? `Y pronto abren: ${notOpen.map(p => fmtSimple(p)).join(', ')}` : ''}`;
  }

  // ── TECHNO / ELECTRÓNICA ──
  if (/techno|electr|house|minimal|dj|tech/.test(ql)) {
    if (techno.length === 0) return `Esta noche no hay techno cargado en el mapa. Chequeá más tarde, puede aparecer algo 🎧`;
    return `Para techno y electrónica esta noche:\n${techno.map(p => `• ${fmt(p)}`).join('\n')}\n\nEl más lleno es ${fmtSimple(byCrowd.filter(p=>(p.cat || []).includes('Techno'))[0])} con ${byCrowd.filter(p=>(p.cat || []).includes('Techno'))[0]?.crowd}% de ocupación 🎛️`;
  }

  // ── CUMBIA / RKT ──
  if (/cumbia|rkt|cuarteto|tropical|reggaeton|urbano/.test(ql)) {
    if (cumbia.length === 0) return `No hay cumbia cargada esta noche. Podés ir a ${fmtSimple(byRating[0])} que siempre tiene buena onda 🎵`;
    return `Para cumbia y RKT:\n${cumbia.map(p => `• ${fmt(p)}`).join('\n')}\n\n¡A bailar! 💃`;
  }

  // ── GRATIS / SIN ENTRADA ──
  if (/grat|sin entrada|no cobr|gratis|free|barato|económic|plata poca|poco presupuest/.test(ql)) {
    if (free.length === 0) return `Todos los lugares cobran entrada esta noche. El más barato es ${fmtSimple(byRating[0])} con ${places.sort((a,b)=> parseInt(a.entrada)||0 - parseInt(b.entrada)||0)[0].entrada} 💸`;
    return `Lugares sin entrada esta noche:\n${free.map(p => `• <strong>${p.icon} ${p.name}</strong> — ${e(p.entrada)} · consumo mín ${e(p.consumo)}`).join('\n')}\n\nIdeal para salir sin gastar de más 🙌`;
  }

  // ── BOLICHE ──
  if (/bolich|bailar|pista|discotec/.test(ql)) {
    return `Los boliches de esta noche:\n${boliches.map(p => `• ${fmt(p)}`).join('\n')}\n\nEl más copado ahora es ${fmtSimple(byCrowd.filter(p=>(p.cat || []).includes('Boliche'))[0])} 🕺`;
  }

  // ── BAR ──
  if (/bar|tomar algo|trago|cervez|charlar|pre|antes/.test(ql)) {
    return `Bares disponibles esta noche:\n${bares.map(p => `• ${fmt(p)}`).join('\n')}\n\nPara el pre arrancá por ${fmtSimple(byEmpty.filter(p=>(p.cat || []).includes('Bar'))[0])} que está más tranquilo 🍺`;
  }

  // ── GRUPO ──
  if (/grupo|grupo grande|somos varios|somos much|amigos|banda|equipo/.test(ql)) {
    const best = byEmpty[0];
    return `Para grupos grandes lo mejor es ir donde haya espacio. Te recomiendo ${fmt(best)} — tiene ${best.crowd}% de ocupación así que hay lugar para todos.\n\nUsá el chat de la app para coordinar quién llega a qué hora 📱`;
  }

  // ── CERCA / DISTANCIA ──
  if (/cerca|distancia|lejos|caminando|metros|km|cuadras/.test(ql)) {
    const sorted = [...places].sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
    return `Los más cercanos al centro:\n${sorted.slice(0,3).map(p => `• ${fmtSimple(p)} — a ${e(p.dist)}`).join('\n')}\n\n${fmtSimple(sorted[0])} es el más cercano, a solo ${sorted[0].dist} 📍`;
  }

  // ── NUEVO / NOVEDADES ──
  if (/nuevo|novedad|cambio|reciente|esta semana|hoy|agregaron/.test(ql)) {
    const newest = places[places.length - 1];
    return `El último lugar agregado al mapa es ${fmt(newest)} 🆕\n\nSi querés reportar un lugar nuevo que no está en SALGO, contáselo al admin en el panel de administración. La base de datos se actualiza en tiempo real 🗺️`;
  }

  // ── HORARIO / CUÁNDO ──
  if (/hora|horario|cuándo abre|a qué hora|cierra|hasta cuándo/.test(ql)) {
    return `Horarios de esta noche:\n${places.map(p => `• ${fmtSimple(p)}: ${e(p.horario)} ${p.open ? '✅ abierto' : '🕐 pronto'}`).join('\n')}`;
  }

  // ── PRECIO ──
  if (/precio|entrada|cuánto cuesta|cuánto sale|vale|plata|pesos/.test(ql)) {
    return `Precios de entrada esta noche:\n${places.map(p => `• ${fmtSimple(p)}: ${e(p.entrada)} · consumo ${e(p.consumo)}`).join('\n')}\n\n💡 Tip: comprando por SALGO podés saltear la cola en algunos lugares 🎟️`;
  }

  // ── RESUMEN GENERAL ──
  if (/resumen|panorama|qué hay|cómo está|esta noche|qué está pasando|situación/.test(ql)) {
    const topCrowd = byCrowd[0];
    const topRating = byRating[0];
    return `Panorama de esta noche 🌙\n\n🔴 Más lleno: ${fmtSimple(topCrowd)} (${topCrowd.crowd}%)\n⭐ Mejor rating: ${fmtSimple(topRating)} (★${topRating.rating})\n🟢 Más tranquilo: ${fmtSimple(byEmpty[0])} (${byEmpty[0].crowd}%)\n✅ Abiertos ya: ${open.length} lugar${open.length !== 1 ? 'es' : ''}\n\n¿Qué estás buscando?`;
  }

  // ── SALUDO ──
  if (/hola|buenas|buena noche|hey|hi|qué tal|como andás/.test(ql)) {
    return `¡Buenas! 🌙 Esta noche hay ${places.length} lugares cargados en el mapa. El más lleno es ${fmtSimple(byCrowd[0])} con ${byCrowd[0].crowd}% y el mejor puntuado es ${fmtSimple(byRating[0])} con ★${byRating[0].rating}.\n\n¿Qué estás buscando esta noche?`;
  }

  // ── RESPUESTA GENÉRICA INTELIGENTE ──
  const random = places[Math.floor(Math.random() * places.length)];
  return `Mmm, no tengo datos específicos sobre eso, pero puedo contarte que ahora mismo ${fmtSimple(byCrowd[0])} está al ${byCrowd[0].crowd}% de capacidad y ${fmtSimple(byRating[0])} tiene el mejor rating de la noche (★${byRating[0].rating}).\n\nProbá preguntarme: "¿qué está más lleno?", "bares tranquilos", "techno esta noche" o "lugares gratis" 🤙`;
}

// ---------- interfaz del chat ----------

let thinking = false;

export function aiAddMsg(html, who) {
  const el = $('ai-msgs');
  if (!el) return;
  const isBot = who === 'bot';
  const av = isBot ? 'IA' : initials(getUserName() || 'Vos');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + (isBot ? '' : 'user');
  // `html` viene de aiRespond (HTML ya escapado) o de aiSend (escapado ahí).
  div.innerHTML =
    `<div class="ai-av ${isBot ? 'bot' : 'me'}">${escapeHtml(av)}</div>` +
    `<div class="ai-bub ${isBot ? 'bot' : 'me'}">${html}</div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function showTyping() {
  const el = $('ai-msgs');
  if (!el || $('ai-typing')) return;
  const div = document.createElement('div');
  div.className = 'ai-msg';
  div.id = 'ai-typing';
  div.innerHTML =
    '<div class="ai-av bot">IA</div>' +
    '<div class="ai-bub bot"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function removeTyping() {
  $('ai-typing')?.remove();
}

export function aiSend() {
  if (thinking) return;
  const input = $('ai-input');
  const txt = (input?.value || '').trim();
  if (!txt) return;
  input.value = '';
  input.style.height = 'auto';

  aiAddMsg(escapeHtml(txt), 'user');
  showTyping();
  thinking = true;

  // Pequeña demora para que se vea el indicador de "escribiendo".
  setTimeout(() => {
    removeTyping();
    thinking = false;
    aiAddMsg(aiRespond(txt, getPlaces()).replace(/\n/g, '<br>'), 'bot');
  }, 450 + Math.random() * 350);
}

export function aiSuggest(txt) {
  const input = $('ai-input');
  if (!input) return;
  input.value = txt;
  aiSend();
}

export function bindAiEvents() {
  $('ai-input')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aiSend(); }
  });
  document.querySelectorAll('[data-ai-suggest]').forEach((el) => {
    el.addEventListener('click', () => aiSuggest(el.dataset.aiSuggest));
  });
}
