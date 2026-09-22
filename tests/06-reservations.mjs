import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'es-AR' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (error) => errs.push(error.message));
const ok = (label, condition, details = '') =>
  console.log(`${condition ? '✓' : '✗'} ${label}${details ? ' — ' + details : ''}`);

await page.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
if (await page.locator('#name-modal.show').count()) {
  await page.locator('#modal-name').fill('Test SALGO');
  await page.locator('#name-modal button').click();
}
await page.locator('#places-list .pcard').first().click();
await page.waitForTimeout(300);
await page.locator('.detail-cta .btn-sec').first().click();

const modal = page.locator('#resv-modal');
ok('abre el formulario de reserva', await modal.evaluate((el) => el.classList.contains('show')));

await page.locator('#resv-fecha').fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
await page.locator('#resv-hora').fill('23:30');
await page.locator('#resv-cant').selectOption('4');
await page.locator('#resv-modal .resv-btn').evaluate((el) => el.click());
await page.waitForTimeout(1000);

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('salgo_reservations') || '[]'));
const toast = await page.locator('#toast').textContent();
ok('guarda una solicitud de reserva', stored.length === 1, `${stored.length} reserva(s) · ${toast}`);
ok('conserva lugar, fecha, hora y cantidad',
  Number.isFinite(Number(stored[0]?.place_id)) &&
  stored[0]?.event_date &&
  stored[0]?.event_time === '23:30' &&
  String(stored[0]?.people) === '4',
  JSON.stringify(stored[0] || {}));
ok('no genera errores de JavaScript', errs.length === 0, errs.join(' | '));

await browser.close();
