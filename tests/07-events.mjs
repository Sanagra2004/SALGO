import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'es-AR' });
const page = await ctx.newPage();
const ok = (label, condition, details = '') =>
  console.log(`${condition ? '✓' : '✗'} ${label}${details ? ' — ' + details : ''}`);

await page.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const result = await page.evaluate(async () => {
  const mod = await import('/src/js/store.local.js');
  const event = await mod.localStore.saveEvent({
    place_id: 1,
    event_date: '2026-10-10',
    title: 'Fiesta de prueba',
    line_up: ['DJ Test'],
    entry_price: '$5.000',
  });
  return {
    saved: event.title === 'Fiesta de prueba',
    visible: (await mod.localStore.getEvents({ placeId: 1, date: '2026-10-10' })).length,
    hidden: (await mod.localStore.getEvents({ placeId: 1, date: '2026-10-11' })).length,
  };
});
ok('guarda un evento fechado', result.saved);
ok('filtra eventos por lugar y fecha', result.visible === 1 && result.hidden === 0,
  `${result.visible} visible, ${result.hidden} fuera de fecha`);
await browser.close();
