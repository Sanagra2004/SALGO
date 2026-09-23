import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 }, locale: 'es-AR' });
const app = await ctx.newPage();
const errors = [];
app.on('pageerror', (error) => errors.push(error.message));
const today = new Date().toISOString().slice(0, 10);
const ok = (label, condition, details = '') =>
  console.log(`${condition ? '✓' : '✗'} ${label}${details ? ' — ' + details : ''}`);

await app.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
await app.waitForTimeout(2200);
const firstPlaceId = Number(await app.locator('#places-list .pcard').first().getAttribute('data-place'));
await app.evaluate(async ({ date, placeId }) => {
  const mod = await import('/src/js/store.local.js');
  await mod.localStore.saveEvent({
    place_id: placeId,
    event_date: date,
    title: 'Noche UI Test',
    line_up: ['DJ Test', 'Banda Test'],
    entry_price: '$5.000',
  });
}, { date: today, placeId: firstPlaceId });
if (await app.locator('#name-modal.show').count()) {
  await app.locator('#modal-name').fill('Test SALGO');
  await app.locator('#name-modal button').evaluate((el) => el.click());
}
await app.locator('#places-list .pcard').first().click();
await app.waitForTimeout(300);
ok('la ficha muestra el evento publicado',
  (await app.locator('#detail-events').textContent()).includes('Noche UI Test'));
ok('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
await browser.close();
