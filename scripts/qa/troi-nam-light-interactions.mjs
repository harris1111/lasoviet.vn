import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

export async function runInteractions({ base, launch, out }) {
  const results = [];
  async function check(name, options, initialize, run) {
    const browser = await launch();
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, ...options });
      const errors = [];
      await context.addInitScript(() => {
        localStorage.setItem('lasoviet:theme', 'light');
        window.__qaEvents = [];
        new PerformanceObserver(list => window.__qaEvents.push(...list.getEntries().map(e => ({ name: e.name, duration: e.duration, interactionId: e.interactionId })))).observe({ type: 'event', buffered: true, durationThreshold: 16 });
      });
      await initialize?.(context);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (/hydrat|server.rendered|didn't match|Minified React error #(418|425)|Error compiling/i.test(m.text())) errors.push(m.text()); });
      const evidence = await run(page);
      assert.deepEqual(errors, [], name + ': no client errors');
      results.push({ name, ...evidence, errors });
      writeFileSync(resolve(out, 'interactions.json'), JSON.stringify(results, null, 2));
      console.log('Passed: ' + name);
    } finally { await browser.close(); }
  }
  const open = async (page, path = '/') => {
    await page.goto(base + path + '?troiNamWorldDebug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.tn-hero-plate')?.naturalWidth > 0);
    await page.evaluate(() => document.fonts.ready);
  };
  const world = page => page.waitForFunction(() => document.querySelector('.tn')?.getAttribute('data-troi-nam-world-ready')?.startsWith(document.documentElement.dataset.theme + ':'), null, { timeout: 30000 });
  for (const [width, path] of [[320, '/'], [430, '/en']]) await check('static controls ' + width + path, { viewport: { width, height: 900 }, reducedMotion: 'reduce' }, null, async page => {
    await open(page, path);
    const time = page.locator('.hv3-seg[aria-labelledby="hv3-time-label"]');
    const targets = await time.locator('button').evaluateAll(buttons => buttons.map(b => ({ label: b.textContent, height: b.getBoundingClientRect().height, clipped: b.scrollWidth > b.clientWidth })));
    assert.ok(targets.every(t => t.height >= 44 && !t.clipped));
    await page.locator('.hv3-form button[type="submit"]').click();
    assert.ok(await page.locator('.hv3-form [role="alert"]').count() > 0);
    await page.locator('#hv3-day').focus(); await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ id: document.activeElement.id, visible: document.activeElement.matches(':focus-visible'), outline: getComputedStyle(document.activeElement).outlineWidth, color: getComputedStyle(document.activeElement).outlineColor }));
    assert.ok(focus.visible && parseFloat(focus.outline) > 0);
    await page.screenshot({ path: resolve(out, `form-error-focus-${width}.png`) });
    await page.locator('.mobile-menu summary').click();
    assert.ok(await page.locator('.mobile-menu').evaluate(e => e.open));
    await page.locator('.mobile-menu summary').click();
    const faq = page.locator('.hv3-faq-q').nth(1);
    await faq.click(); assert.equal(await faq.getAttribute('aria-expanded'), 'true');
    await faq.focus(); await page.keyboard.press('Enter'); assert.equal(await faq.getAttribute('aria-expanded'), 'false');
    for (const need of await page.locator('.hv3-need').all()) { await need.click(); assert.equal(await need.getAttribute('aria-pressed'), 'true'); }
    for (const palace of await page.locator('.hv3-chart [aria-pressed]').all()) { await palace.click(); assert.equal(await palace.getAttribute('aria-pressed'), 'true'); }
    await page.locator('.hv3-tt-read:visible').first().click();
    await page.locator('[role="dialog"]').waitFor();
    await page.keyboard.press('Tab');
    assert.ok(await page.locator('[role="dialog"]').evaluate(e => e.contains(document.activeElement)));
    await page.keyboard.press('Escape'); assert.equal(await page.locator('[role="dialog"]').count(), 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.equal(overflow, false);
    await page.screenshot({ path: resolve(out, `interactions-${width}.png`) });
    return { targets, focus, overflow, events: await page.evaluate(() => window.__qaEvents) };
  });
  await check('ten delayed theme swaps, motion and context loss', {}, async context => {
    await context.route('**/images/troi-nam/**', async route => { if (/world-|W0|W1/.test(route.request().url())) await new Promise(ok => setTimeout(ok, 120)); await route.continue(); });
  }, async page => {
    await open(page); await world(page);
    await page.locator('#hv3-day').fill('12'); await page.locator('#hv3-month').fill('8'); await page.locator('#hv3-year').fill('1992');
    await page.locator('input[autocomplete="given-name"]').fill('Theme QA');
    await page.evaluate(() => { window.__qaForm = document.querySelector('#hv3-day'); });
    await page.locator('.hv3-need').nth(1).click();
    const before = await page.evaluate(() => ({ progress: document.querySelector('.tn').dataset.troiNamProgress, ready: document.querySelector('.tn').getAttribute('data-troi-nam-world-ready') }));
    await page.evaluate(async () => { for (let i = 0; i < 10; i++) { document.querySelector('.theme-toggle').click(); await new Promise(ok => setTimeout(ok, 30)); } });
    await world(page);
    assert.ok(await page.evaluate(() => document.querySelector('#hv3-day') === window.__qaForm));
    assert.equal(await page.locator('#hv3-day').inputValue(), '12'); assert.equal(await page.locator('input[autocomplete="given-name"]').inputValue(), 'Theme QA');
    assert.equal(await page.locator('.hv3-need').nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.querySelector('.tn').dataset.troiNamProgress), before.progress);
    const after = await page.evaluate(() => ({ ready: document.querySelector('.tn').getAttribute('data-troi-nam-world-ready'), diagnostics: window.__troiNamWorld.getDiagnostics() }));
    assert.equal(await page.locator('.tn-world-canvas').count(), 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.tn-world-canvas'));
    assert.equal(await page.locator('.tn-story').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await world(page);
    await page.locator('.tn-world-canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => !document.querySelector('.tn-world-canvas'));
    assert.equal(await page.locator('.tn').getAttribute('data-troi-nam-world-ready'), null);
    return { before, after, contextLossFallback: true, events: await page.evaluate(() => window.__qaEvents) };
  });
  await check('saveData startup and re-enable', {}, async context => context.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), { saveData: true });
    Object.defineProperty(navigator, 'connection', { value: connection });
  }), async page => {
    const chunks = []; page.on('request', r => { if (/\.js/.test(r.url())) chunks.push(r.url()); });
    await open(page); await page.waitForTimeout(400);
    assert.equal(await page.locator('.tn-world-canvas').count(), 0);
    await page.evaluate(() => { navigator.connection.saveData = false; navigator.connection.dispatchEvent(new Event('change')); }); await world(page);
    const diagnostics = await page.evaluate(() => window.__troiNamWorld.getDiagnostics());
    return { startupStatic: true, reenabled: true, requestedChunks: chunks.length, diagnostics };
  });
  await check('blocked storage retains explicit session choice', { reducedMotion: 'reduce' }, async context => context.addInitScript(() => {
    Storage.prototype.setItem = () => { throw Error('Storage blocked for QA'); };
  }), async page => {
    await open(page);
    await page.locator('.theme-toggle').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.evaluate(() => window.__lsvTheme.getSnapshot().source), 'session');
    await page.locator('.theme-toggle').click();
    await page.waitForFunction(() => document.querySelector('.tn-hero-plate')?.dataset.activeTheme === 'light' && document.querySelector('.tn-hero-plate').style.visibility !== 'hidden');
    return { snapshot: await page.evaluate(() => window.__lsvTheme.getSnapshot()) };
  });
  await check('no JavaScript dark responsive art', { javaScriptEnabled: false }, null, async page => {
    await page.goto(base + '/', { waitUntil: 'load' });
    const picture = page.locator('.tn-hero-media noscript img').first();
    assert.ok(await picture.evaluate(e => e.naturalWidth > 0));
    assert.ok(await picture.evaluate(e => !e.currentSrc.includes('/light/')));
    return { currentSrc: await picture.evaluate(e => e.currentSrc) };
  });
  await check('unknown route starts dark with saved light', {}, null, async page => {
    await page.goto(base + '/en/theme-qa-unknown', { waitUntil: 'domcontentloaded' });
    const attribute = await page.locator('html').getAttribute('data-theme');
    // The global 404 may bypass the locale bootstrap and uses the dark CSS default.
    assert.ok(attribute === null || attribute === 'dark');
    assert.equal(await page.locator('[data-light-ready]').count(), 0);
    return { theme: attribute ?? 'dark CSS default', bootstrapPresent: await page.evaluate(() => Boolean(window.__lsvTheme)) };
  });
}
