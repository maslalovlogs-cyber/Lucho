import { chromium } from 'playwright';

const BASE = 'http://localhost:3113';
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? '✓' : '✗') + ' ' + msg); if (!cond) fallos.push(msg); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errores.push(m.text()); });

// 1. Carga inicial
await page.goto(BASE, { waitUntil: 'networkidle' });
ok(await page.title() === 'Método 3·2·1 — Inteligencia Estratégica', 'título correcto');
ok(await page.locator('#nav button').count() === 10, 'nav renderiza las 10 pantallas');
ok(await page.locator('#view .empty h4').first().textContent() === 'Empieza con tu primer cliente', 'estado vacío de Clientes visible');

// 2. Crear cliente y llenar un campo
await page.click('#bNuevo2');
await page.waitForSelector('[data-f="empresa"]');
await page.fill('[data-f="empresa"]', 'Café Prueba');
await page.locator('[data-f="empresa"]').blur();          // dispara change → save (debounce 500ms)
await page.waitForTimeout(900);
ok((await page.locator('#saveDot').textContent()).includes('Guardado'), 'indicador "Guardado ✓" tras editar');

// 3. Navegación entre pantallas
await page.click('[data-go="dash"]');
ok((await page.locator('#crumb').textContent()) === 'Dashboard', 'navegación a Dashboard');
await page.click('[data-go="kb"]');
ok((await page.locator('#view h2').first().textContent()).includes('Método 3·2·1'), 'pantalla Método renderiza KB');
const hint = await page.locator('.login-hint').textContent();
ok(hint.includes('Persistencia activa'), 'Store reporta persistencia activa (IndexedDB)');

// 4. RECARGA — pruebas clave: B2 (datos persisten) y M8 (pantalla persiste)
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const sel = await page.locator('#clientSel option').first().textContent();
ok(sel === 'Café Prueba', 'el cliente sobrevive a la recarga (IndexedDB) → "' + sel + '"');
ok((await page.locator('#crumb').textContent()) === 'Método y actualizaciones', 'la pantalla activa sobrevive a la recarga (hash routing M8)');

// 4b. G6 — eliminar cliente usa modal propio (no confirm() nativo)
await page.click('[data-go="cli"]');
await page.click('#bBorrar');
await page.waitForSelector('#cfSi');
ok((await page.locator('.modal h3').textContent()) === 'Eliminar cliente', 'modal de confirmación propio al eliminar');
await page.click('#cfNo');   // cancelar: el cliente sigue
ok((await page.locator('#clientSel option').first().textContent()) === 'Café Prueba', 'cancelar la eliminación conserva el cliente');

// 5. El botón de IA muestra error legible (backend sin key → 503 con mensaje claro)
await page.click('[data-go="dx"]');
await page.click('#bGen');
await page.waitForSelector('#dxProg .warn', { timeout: 5000 });
const warn = await page.locator('#dxProg .warn').textContent();
ok(warn.includes('ANTHROPIC_API_KEY'), 'error de IA legible para el usuario: "' + warn.slice(0, 80) + '…"');

ok(errores.length === 0, 'sin errores de consola/página' + (errores.length ? ' → ' + errores.join(' | ') : ''));

await browser.close();
if (fallos.length){ console.log('\nFALLOS: ' + fallos.length); process.exit(1); }
console.log('\nSMOKE TEST COMPLETO: todo OK');
