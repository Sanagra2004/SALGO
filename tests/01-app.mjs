import { chromium } from 'playwright';
const CHROME = process.env.CHROME_PATH || undefined;
const errs = [];
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  geolocation: { latitude: -38.0055, longitude: -57.5426 },
  permissions: ['geolocation'], locale: 'es-AR',
});
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('dialog', d => d.accept());
const alerts = [];
await ctx.exposeBinding('__xss', () => alerts.push('XSS EJECUTADO'));

const ok = (label, cond, extra='') =>
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);

await page.goto('http://localhost:8000/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

// nombre de usuario (el modal aparece solo)
await page.fill('#modal-name', 'Probador');
await page.evaluate(() => window.saveName());
await page.waitForTimeout(400);

// 1. Navegación por todas las pantallas
const pantallas = ['home','explore','offers','ai','wallet','profile','pro','card','friends','notifs'];
for (const s of pantallas) {
  await page.evaluate(n => window.showScreen(n), s);
  await page.waitForTimeout(220);
}
ok('navegación por las 10 pantallas sin errores', errs.length === 0, errs.join(' | '));

// 2. Detalle + "voy"
await page.evaluate(() => window.showScreen('home'));
await page.locator('#places-list .pcard').first().click();
await page.waitForTimeout(700);
const nombreDetalle = await page.locator('#detail-name').textContent();
ok('el detalle abre', !!nombreDetalle, nombreDetalle);
const antes = await page.locator('#going-btn').textContent();
await page.locator('#going-btn').click();
await page.waitForTimeout(500);
const despues = await page.locator('#going-btn').textContent();
ok('el botón "voy" cambia de estado', antes !== despues, `${antes.trim()} -> ${despues.trim()}`);

// 3. El "voy" marcó el lugar CORRECTO (el bug PLACES[id] del prototipo)
await page.evaluate(() => window.closeDetail());
await page.waitForTimeout(500);
const marcada = await page.locator('#places-list .pcard').first().textContent();
ok('marca "✓ Vas" en la tarjeta correcta', marcada.includes('Vas'), nombreDetalle);

// 4. XSS en el chat
await page.locator('#places-list .pcard').first().click();
await page.waitForTimeout(600);
await page.fill('#chat-input', '<img src=x onerror=window.__xss()>');
await page.evaluate(() => window.sendMsg());
await page.waitForTimeout(900);
const burbuja = await page.locator('.msg-bub-new.me').last().textContent();
ok('el chat NO ejecuta HTML inyectado', alerts.length === 0);
ok('el HTML se muestra como texto literal', burbuja.includes('<img'), burbuja.trim().slice(0, 42));

// 5. Filtro de ciudad
await page.evaluate(() => window.selectCity('Madrid'));
await page.waitForTimeout(900);
const vacio = await page.locator('#places-list').textContent();
ok('Madrid muestra estado vacío honesto', vacio.includes('Todavía no llegamos'));
await page.evaluate(() => window.selectCity('Mar del Plata'));
await page.waitForTimeout(900);
const vuelve = await page.locator('#places-list .pcard').count();
ok('vuelve a mostrar los 30 de Mar del Plata', vuelve === 30, String(vuelve));

// 6. Chip "Cerca mío"
await page.evaluate(() => {
  const c = [...document.querySelectorAll('#chips-home .chip')].find(x => x.dataset.chip === 'Cerca');
  window.filterChip(c, 'Cerca');
});
await page.waitForTimeout(400);
const cerca = await page.locator('#places-list .pcard').count();
ok('chip "Cerca mío" filtra por distancia real', cerca > 0 && cerca < 30, `${cerca} de 30`);

// 7. Vista previa de la tarjeta (bug _u)
await page.evaluate(() => window.showScreen('card'));
await page.fill('#card-num-inp', '4111222233334444');
await page.waitForTimeout(300);
const preview = await page.locator('#card-number-display').textContent();
ok('la vista previa de la tarjeta se actualiza', preview.includes('4111'), preview.trim());

// 8. IA local
await page.evaluate(() => window.showScreen('ai'));
await page.fill('#ai-input', '¿qué está más lleno?');
await page.evaluate(() => window.aiSend());
await page.waitForTimeout(1500);
const respuesta = await page.locator('#ai-msgs .ai-bub.bot').last().textContent();
ok('la IA local responde', respuesta.length > 20, respuesta.trim().slice(0, 60) + '…');

// 9. Badges DEMO
const badges = await page.locator('.demo-badge').count();
ok('3 pantallas marcadas como DEMO', badges === 3, String(badges));

console.log('\nerrores de JS acumulados:', errs.length ? errs.join('\n') : 'ninguno ✓');
await page.evaluate(() => window.showScreen('home'));
await page.waitForTimeout(600);
await page.screenshot({ path: 'tests/screenshots/home.png' });
await browser.close();
