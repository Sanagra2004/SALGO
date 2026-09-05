// Verifica que la pantalla Pro no prometa lo que todavía no se puede cumplir,
// y que la lista de espera esté en su lugar.
//
// El riesgo que cubre: si alguien paga por "15% off en consumiciones" y en la
// puerta del boliche eso no existe, el problema no es el reembolso — es que esa
// persona no vuelve. Estas pruebas son la red que evita que una promesa se
// cuele de nuevo en la pantalla.

import { chromium } from 'playwright';

const CHROME = process.env.CHROME_PATH || undefined;
const ok = (l, c, x = '') => console.log(`${c ? '✓' : '✗'} ${l}${x ? ' — ' + x : ''}`);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'es-AR' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

await page.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => document.getElementById('name-modal')?.classList.remove('show'));
await page.evaluate(() => window.showScreen('pro'));
await page.waitForTimeout(800);

const texto = await page.locator('#screen-pro').textContent();

ok('avisa que todavía no se cobra',
  texto.includes('todavía no cobramos') || texto.includes('no se cobra'));

ok('NO hay botón de "Activar Pro" visible',
  !(await page.locator('#pro-cta-wrap:visible').count()));

ok('la lista de espera está visible', await page.locator('#pro-wait-email').isVisible());

// Las promesas que dependen de acuerdos con locales tienen que estar marcadas.
const etiquetas = await page.locator('.pro-benefit-tag').allTextContents();
ok('cada beneficio dice de qué depende',
  etiquetas.length >= 5 && etiquetas.every((t) => /Falta acuerdo|A medias|Lo estamos haciendo/.test(t)),
  etiquetas.join(' · '));

ok('NO se vende "chat ilimitado" (ya es gratis para todos)',
  !texto.includes('Chat ilimitado'));
ok('NO se vende "sin publicidad" (no hay publicidad)',
  !/sin ads|sin publicidad/i.test(texto));
ok('NO se ofrecen cuotas sin interés para una suscripción de AR$ 1.500',
  !texto.includes('cuotas sin interés'));
ok('NO se promete una semana gratis', !texto.includes('semana gratis'));
ok('NO muestra un saldo de puntos inventado', !texto.includes('pts disponibles'));

const precio = await page.locator('#pro-price-display').textContent();
ok('el precio es AR$ 1.500', precio.includes('1.500'), precio);

// Cambiar de plan tiene que actualizar el precio mostrado.
await page.evaluate(() => window.selectPlan(12));
await page.waitForTimeout(200);
ok('elegir el plan anual cambia el precio',
  (await page.locator('#pro-price-display').textContent()).includes('1.200'));

// Sin servidor la lista de espera no puede guardar: tiene que decirlo, no fallar.
await page.fill('#pro-wait-email', 'probador@ejemplo.com');
await page.click('[data-action="anotarse"]');
await page.waitForTimeout(600);
const msg = await page.locator('#pro-wait-msg').textContent();
ok('en modo local avisa que necesita el servidor', msg.includes('servidor'), msg.trim());

await page.fill('#pro-wait-email', 'no-es-un-email');
await page.click('[data-action="anotarse"]');
await page.waitForTimeout(400);
ok('rechaza un email inválido antes de mandarlo',
  (await page.locator('#pro-wait-msg').textContent()).includes('válido'));

console.log('\nerrores de JS:', errs.length ? errs.join('\n') : 'ninguno ✓');
if (errs.length) process.exitCode = 1;
await browser.close();
