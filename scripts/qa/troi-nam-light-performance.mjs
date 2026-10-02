import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function measurePerformance({ base, launch, out }) {
  if (!process.env.LSV_LIGHTHOUSE_MODULE) throw Error('Set LSV_LIGHTHOUSE_MODULE to an installed lighthouse/core/index.js');
  const { default: lighthouse } = await import(pathToFileURL(resolve(process.env.LSV_LIGHTHOUSE_MODULE)).href);
  const results = [];
  for (const theme of ['dark', 'light']) for (let run = 1; run <= 3; run++) {
    const browser = await launch(['--remote-debugging-port=9222']);
    let cdpBrowser;
    try {
      cdpBrowser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      const context = cdpBrowser.contexts()[0];
      const page = await context.newPage();
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(theme => localStorage.setItem('lasoviet:theme', theme), theme);
      const session = await context.newCDPSession(page); await session.send('Network.clearBrowserCache'); await session.detach(); await page.close();
      const report = await lighthouse(base + '/', {
        port: 9222, hostname: '127.0.0.1', logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility'],
        disableStorageReset: true, maxWaitForLoad: 30000,
        formFactor: 'mobile', throttlingMethod: 'simulate',
        throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      });
      const lhr = report.lhr;
      writeFileSync(resolve(out, `lighthouse-${theme}-${run}.json`), JSON.stringify(lhr));
      const metric = key => lhr.audits[key]?.numericValue;
      results.push({ theme, run, lighthouseVersion: lhr.lighthouseVersion, performance: lhr.categories.performance.score, accessibility: lhr.categories.accessibility.score, LCPms: metric('largest-contentful-paint'), CLS: metric('cumulative-layout-shift'), TBTms: metric('total-blocking-time'), FCPms: metric('first-contentful-paint'), runtimeError: lhr.runtimeError, warnings: lhr.runWarnings, failingAccessibility: lhr.categories.accessibility.auditRefs.filter(ref => lhr.audits[ref.id].score === 0).map(ref => ({ id: ref.id, details: lhr.audits[ref.id].details })) });
      writeFileSync(resolve(out, 'performance.json'), JSON.stringify({ environment: 'Fresh Chrome per run; HTTP localhost production, empty HTTP cache with saved theme only; Lighthouse simulated mobile 4G 150ms/1.6Mbps, 4x CPU. Software rendering/container is not physical mobile evidence. TBT is not INP.', results }, null, 2));
      console.log(JSON.stringify(results.at(-1), (key, value) => key === 'failingAccessibility' ? value.map(v => v.id) : value));
    } finally { await cdpBrowser?.close(); await browser.close(); }
  }
}
