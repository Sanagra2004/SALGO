import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport:{width:414,height:896}, geolocation:{latitude:-38.0055,longitude:-57.5426}, permissions:['geolocation'], locale:'es-AR' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
const ok = (l,c,x='') => console.log(`${c?'✓':'✗'} ${l}${x?' — '+x:''}`);

await page.goto('http://localhost:8000/index.html', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(4000);

const sw = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { registrado: !!r, activo: !!(r && r.active) };
});
ok('service worker registrado', sw.registrado);
ok('service worker activo', sw.activo);

const mani = await page.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()));
ok('manifest válido', mani.name && mani.icons.length === 3, `${mani.icons.length} iconos, display=${mani.display}`);

// esperar a que el cache se llene y probar sin red
await page.waitForTimeout(2500);
// Sin fijar el nombre: la version del cache sube en cada release del sw.
const cacheados = await page.evaluate(async () => {
  const nombres = await caches.keys();
  let n = 0;
  for (const nombre of nombres) {
    n += (await (await caches.open(nombre)).keys()).length;
  }
  return { n, nombres };
});
ok('app-shell cacheado', cacheados.n > 20,
   cacheados.n + ' archivos en [' + cacheados.nombres.join(', ') + ']');

await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const offCards = await page.locator('#places-list .pcard').count();
ok('la app abre SIN conexión', offCards === 30, offCards + ' lugares');
await ctx.setOffline(false);

// sin permiso de ubicación
const ctx2 = await browser.newContext({ viewport:{width:414,height:896}, locale:'es-AR' });
const p2 = await ctx2.newPage();
const errs2 = [];
p2.on('pageerror', e => errs2.push(e.message));
await p2.goto('http://localhost:8000/index.html', { waitUntil:'domcontentloaded' });
await p2.waitForTimeout(4500);
const sinGps = await p2.locator('#places-list .pcard').count();
const hint = await p2.locator('#map-hint').textContent();
ok('funciona SIN permiso de ubicación', sinGps === 30, sinGps + ' lugares');
ok('avisa que la ubicación está apagada', hint.includes('Activá'), hint.trim());

console.log('\nerrores de JS:', [...errs, ...errs2].length ? [...errs,...errs2].join('\n') : 'ninguno ✓');
await browser.close();
