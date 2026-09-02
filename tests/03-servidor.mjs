import { chromium } from 'playwright';
import fs from 'fs';

const CFG = new URL('../src/js/config.js', import.meta.url).pathname;
const original = fs.readFileSync(CFG, 'utf8');
const ok = (l, c, x='') => console.log(`${c?'✓':'✗'} ${l}${x?' — '+x:''}`);

// Backend configurado, pero apuntando a un host que no existe.
// Simula: proyecto mal configurado, o simplemente estar sin señal.
fs.writeFileSync(CFG, original
  .replace("export const SUPABASE_URL = '';",
           "export const SUPABASE_URL = 'https://noexiste.supabase.co';")
  .replace("export const SUPABASE_ANON_KEY = '';",
           "export const SUPABASE_ANON_KEY = 'clave-de-prueba';"));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    geolocation: { latitude: -38.0055, longitude: -57.5426 },
    permissions: ['geolocation'], locale: 'es-AR',
  });
  const page = await ctx.newPage();
  const errs = [], logs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => logs.push(m.text()));

  await page.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  ok('el modo pasa a "servidor" al configurar las claves',
    logs.some(l => l.includes('modo de datos: servidor')),
    logs.find(l => l.includes('modo de datos')) || '(no apareció)');

  ok('supabase-js se cargó',
    await page.evaluate(() => typeof supabase !== 'undefined' && typeof supabase.createClient === 'function'));

  ok('NO explota con el servidor caído', errs.length === 0, errs.join(' | '));

  const vacio = await page.locator('#places-list').textContent();
  ok('sin conexion dice "no pude conectarme", NO "no llegamos a la ciudad"',
    vacio.includes('No pude conectarme') && !vacio.includes('Todavia no llegamos')
      && !vacio.includes('Todavía no llegamos'),
    vacio.trim().split('\n')[0].slice(0, 50));

  // Segunda visita: ya hay copia guardada del catálogo.
  await page.evaluate(() => localStorage.setItem('salgo_cache_places',
    JSON.stringify([{id:1,name:'Cacheado',city:'Mar del Plata',type:'Bar',cat:[],
      rating:4.5,crowd:10,going:3,open:true,icon:'🍺',color1:'#ff2d78',color2:'#b44dff',
      entrada:'Sin entrada',consumo:'-',horario:'20-03h',lat:-38.0,lng:-57.54,addr:'x'}])));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const conCache = await page.locator('#places-list .pcard').count();
  ok('con el servidor caído usa la copia guardada del catálogo',
    conCache === 1, conCache + ' tarjeta(s)');

  // La navegación tiene que seguir funcionando igual
  for (const s of ['explore','offers','ai','profile']) {
    await page.evaluate(n => window.showScreen(n), s);
    await page.waitForTimeout(200);
  }
  ok('la navegación sigue andando sin servidor', errs.length === 0, errs.join(' | '));

  console.log('\nerrores de JS:', errs.length ? errs.join('\n') : 'ninguno ✓');
} finally {
  fs.writeFileSync(CFG, original);   // dejar config.js como estaba
  await browser.close();
}
