import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

export async function measureColdLoad({ base, launch, out }) {
  const results = [];
  for (const theme of ['dark', 'light']) for (let run = 1; run <= 3; run++) {
    const browser = await launch();
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await context.addInitScript(theme => {
        localStorage.setItem('lasoviet:theme', theme);
        window.__qaVitals = { lcp: [], shifts: [] };
        new PerformanceObserver(list => window.__qaVitals.lcp.push(...list.getEntries().map(e => ({ startTime: e.startTime, renderTime: e.renderTime, loadTime: e.loadTime, size: e.size, tag: e.element?.className })))).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => window.__qaVitals.shifts.push(...list.getEntries().filter(e => !e.hadRecentInput).map(e => ({ value: e.value, startTime: e.startTime })))).observe({ type: 'layout-shift', buffered: true });
      }, theme);
      const page = await context.newPage(); const session = await context.newCDPSession(page);
      await session.send('Network.enable'); await session.send('Network.setCacheDisabled', { cacheDisabled: true });
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, connectionType: 'cellular4g' });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(base + '/?troiNamWorldDebug=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(20000);
      const measured = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, ...window.__qaVitals, worldReady: document.querySelector('.tn').getAttribute('data-troi-nam-world-ready'), heroLoaded: document.querySelector('.tn-hero-media img[data-preload]').naturalWidth > 0, resources: performance.getEntriesByType('resource').filter(e => /hero|L0[12]|\.css|woff/.test(e.name)).map(e => ({url: new URL(e.name).pathname, start: e.startTime, end: e.responseEnd, bytes: e.transferSize, initiator: e.initiatorType})) }));
      let cls = 0, windowSum = 0, start = -Infinity, last = -Infinity;
      for (const shift of measured.shifts) {
        if (shift.startTime - last > 1000 || shift.startTime - start > 5000) { start = shift.startTime; windowSum = 0; }
        windowSum += shift.value; last = shift.startTime; cls = Math.max(cls, windowSum);
      }
      results.push({ theme, run, LCPms: measured.lcp.at(-1)?.startTime, CLS: cls, ...measured });
      writeFileSync(resolve(out, 'cold-load.json'), JSON.stringify({ environment: 'Fresh Chrome per run; localhost production; HTTP cache disabled; real CDP emulation 150ms latency,1.6Mbps download,750Kbps upload,4x CPU;20s observation after DOMContentLoaded;390x844,DPR2,touch. GPU software rendering. These are lab session observations, not field Web Vitals.', results }, null, 2));
      console.log(JSON.stringify(results.at(-1)));
    } finally { await browser.close(); }
  }
}
