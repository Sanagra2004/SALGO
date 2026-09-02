import { chromium } from 'playwright';
const errs = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1100 }, locale: 'es-AR' })).newPage();
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('dialog', d => d.accept());
const ok = (l, c, x='') => console.log(`${c ? '✓' : '✗'} ${l}${x ? ' — ' + x : ''}`);

await page.goto('http://localhost:8000/admin.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

const stats = await page.locator('#adm-stats .admin-stat').count();
ok('el resumen carga', stats === 4, stats + ' tarjetas');
ok('no hay pantalla de login falso', (await page.locator('#admin-login-wrap').count()) === 0);
ok('avisa que guarda solo local', (await page.locator('.adm-warn').textContent()).includes('esta computadora'));

await page.click('[data-tab="lugares"]'); await page.waitForTimeout(700);
const filas = await page.locator('.admin-place-row').count();
ok('lista los 30 lugares', filas === 30, String(filas));

// crear un lugar
await page.click('[data-tab="nuevo"]'); await page.waitForTimeout(400);
await page.fill('#adm-name', 'Bar de Prueba');
await page.fill('#adm-addr', 'Calle Falsa 123');
await page.fill('#adm-lat', '-38.01'); await page.fill('#adm-lng', '-57.55');
await page.click('[data-action="guardar"]'); await page.waitForTimeout(900);
await page.click('[data-tab="lugares"]'); await page.waitForTimeout(700);
const conNuevo = await page.locator('.admin-place-row').count();
ok('crea un lugar nuevo', conNuevo === 31, String(conNuevo));

// editar y borrar
await page.locator('[data-edit]').last().click(); await page.waitForTimeout(600);
ok('el formulario se llena al editar', (await page.inputValue('#adm-name')) === 'Bar de Prueba');
await page.click('[data-tab="lugares"]'); await page.waitForTimeout(500);
await page.locator('[data-del]').last().click(); await page.waitForTimeout(900);
const final = await page.locator('.admin-place-row').count();
ok('borra el lugar', final === 30, String(final));

await page.click('[data-tab="afluencia"]'); await page.waitForTimeout(700);
ok('la pestaña de afluencia carga', (await page.locator('.admin-crowd-row').count()) === 30);

console.log('\nerrores de JS:', errs.length ? errs.join('\n') : 'ninguno ✓');
await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(600);
await page.screenshot({ path: 'tests/screenshots/admin.png', fullPage: false });
await browser.close();
