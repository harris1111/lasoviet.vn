// Real application verification. Run after building the workspace packages.
// Optional executable/single-process flags support constrained containers.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const out = resolve(process.env.LSV_QA_OUTPUT ?? 'test-results/troi-nam-light');
mkdirSync(out, { recursive: true });
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3011';
let server;
if (!process.env.PLAYWRIGHT_BASE_URL) {
  const args = process.env.LSV_QA_NODE_PRELOAD ? ['--require', process.env.LSV_QA_NODE_PRELOAD] : [];
  args.push('node_modules/next/dist/bin/next', process.env.LSV_QA_SERVER_MODE === 'production' ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', '3011');
  server = spawn(process.execPath, args, { cwd: resolve(process.env.LSV_QA_WEB_DIR ?? 'apps/web'), stdio: ['ignore', 'pipe', 'pipe'] });
  const log = createWriteStream(resolve(out, 'server.log')); server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((ok, fail) => { server.stdout.on('data', chunk => { if (/Ready|ready/.test(String(chunk))) ok(); }); server.on('exit', code => fail(Error(`Server exited ${code}`))); });
}
const launch = (extra = []) => chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', ...extra, ...(process.env.LSV_QA_SINGLE_PROCESS ? ['--no-zygote', '--single-process'] : [])],
});
let browser;
const results = [];
const errors = [];
try {
  if (!process.env.LSV_QA_INTERACTIONS_ONLY && !process.env.LSV_QA_PERFORMANCE_ONLY && !process.env.LSV_QA_COLD_LOAD_ONLY && !process.env.LSV_QA_CONTRAST_ONLY) for (const width of [390, 1440]) for (const theme of process.env.LSV_QA_DARK_BASELINE ? ['dark'] : ['dark', 'light']) for (const mode of ['static', 'world']) {
    browser = await launch();
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: width === 390 ? 2 : 1, isMobile: width === 390, hasTouch: width === 390, reducedMotion: mode === 'static' ? 'reduce' : 'no-preference' });
    await context.addInitScript(theme => localStorage.setItem('lasoviet:theme', theme), theme);
    const page = await context.newPage(); const requests = []; const pageErrors = [];
    page.on('request', request => { if (/\.(webp|png|svg)(\?|$)/.test(request.url())) requests.push(new URL(request.url()).pathname); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (/THREE.WebGLProgram.*Error|VALIDATE_STATUS|Error compiling|hydrat|server.rendered|didn't match|Minified React error #(418|425)/i.test(message.text())) pageErrors.push(message.text()); });
    await page.goto(base + '/?troiNamWorldDebug=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(theme => document.documentElement.dataset.theme === theme && document.querySelector('.tn-hero-media .tn-hero-plate')?.naturalWidth > 0, theme);
    if (mode === 'world') await page.waitForFunction(({ theme, baseline }) => baseline ? document.querySelector('.tn')?.hasAttribute('data-troi-nam-world-ready') : document.querySelector('.tn')?.getAttribute('data-troi-nam-world-ready')?.startsWith(theme + ':'), { theme, baseline: Boolean(process.env.LSV_QA_DARK_BASELINE) }, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(out, `${theme}-${mode}-${width}-hero.png`) });
    const state = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, ready: document.querySelector('.tn')?.getAttribute('data-troi-nam-world-ready'), currentSrc: document.querySelector('.tn-hero-media .tn-hero-plate')?.currentSrc, preload: document.querySelector('link[data-theme-preload]')?.href, overflow: document.documentElement.scrollWidth > innerWidth, diagnostics: window.__troiNamWorld?.getDiagnostics?.() }));
    assert.equal(state.overflow, false, 'No horizontal overflow');
    if (mode === 'static') assert.equal(state.ready, null, 'Reduced motion stays static');
    if (mode === 'world' && theme === 'light') {
      assert.equal(state.diagnostics.raysEnabled, false);
      assert.ok(state.diagnostics.textureBytes <= (width === 390 ? 24 : 48) * 1024 * 1024);
      assert.ok(state.diagnostics.sceneBytes <= (width === 390 ? 48 : 96) * 1024 * 1024);
    }
    for (const block of await page.locator('[data-troi-nam-block]').all()) {
      const name = await block.getAttribute('data-troi-nam-block');
      if (mode === 'static') { await block.scrollIntoViewIfNeeded(); await block.screenshot({ path: resolve(out, `${theme}-${width}-${name}.png`) }); }
    }
    if (mode === 'static') await page.locator('.site-footer').screenshot({ path: resolve(out, `${theme}-${width}-footer.png`) });
    if (mode === 'world') for (const progress of [0, .25, .375, .5, .625, .75, 1]) {
      await page.evaluate(progress => {
        const hero = document.querySelector('.tn-hero'); const chart = document.querySelector('.tn-explore .hv3-chart');
        const start = hero.getBoundingClientRect().top + scrollY;
        const end = chart.getBoundingClientRect().top + scrollY + chart.offsetHeight / 2 - innerHeight / 2;
        scrollTo(0, start + progress * (end - start));
      }, progress);
      await page.waitForTimeout(160);
      await page.screenshot({ path: resolve(out, `${theme}-world-${width}-p${progress}.png`) });
    }
    const dark = JSON.parse(readFileSync('apps/web/public/images/troi-nam/manifest.json', 'utf8'));
    const light = JSON.parse(readFileSync('apps/web/public/images/troi-nam/manifest-light.json', 'utf8'));
    const forbidden = theme === 'light' ? Object.entries(dark).filter(([id, asset]) => /^(L0[1-7]|L13|W0[1-8]|W10|W11|T01)/.test(id) && light[id]?.src !== asset.src).flatMap(([, asset]) => [asset.src, ...(asset.srcSet ?? '').split(', ').map(candidate => candidate.split(' ')[0])]) : Object.values(light).filter(asset => asset.src.includes('/light/') && !asset.src.includes('-shared')).flatMap(asset => [asset.src, asset.lowSrc, ...(asset.srcSet ?? '').split(', ').map(candidate => candidate.split(' ')[0])]);
    const inactive = requests.filter(url => forbidden.includes(url));
    assert.deepEqual(inactive, [], 'No inactive-theme-only image requests');
    results.push({ width, theme, mode, ...state, requests: [...new Set(requests)], pageErrors });
    errors.push(...pageErrors);
    writeFileSync(resolve(out, 'results.json'), JSON.stringify({ environment: 'Chromium; GPU depends on executable/launch options. Software rendering does not represent mobile GPU performance.', results, errors }, null, 2));
    await browser.close(); browser = undefined;
  }
  assert.deepEqual(errors, [], 'No hydration or shader errors');
  if (process.env.LSV_QA_INTERACTIONS_ONLY) {
    const { runInteractions } = await import('./troi-nam-light-interactions.mjs');
    await runInteractions({ base, launch, out });
  }
  if (process.env.LSV_QA_CONTRAST || process.env.LSV_QA_CONTRAST_ONLY) {
    const { measureContrast } = await import('./troi-nam-light-contrast.mjs');
    await measureContrast({ base, launch, out });
  }
  if (process.env.LSV_QA_PERFORMANCE_ONLY) {
    const { measurePerformance } = await import('./troi-nam-light-performance.mjs');
    await measurePerformance({ base, launch, out });
  }
  if (process.env.LSV_QA_COLD_LOAD_ONLY) {
    const { measureColdLoad } = await import('./troi-nam-light-cold-load.mjs');
    await measureColdLoad({ base, launch, out });
  }
  console.log(results.length ? `Passed ${results.length} real application cases` : 'QA measurements/checks completed');
} finally { await browser?.close(); server?.kill(); }
