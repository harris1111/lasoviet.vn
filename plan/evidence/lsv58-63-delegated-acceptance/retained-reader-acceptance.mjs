import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { assertFd123OutputPath } from '../../../scripts/continue-paid-manual-trials.mjs';

// Explicit private input; this read-only harness never creates product trials.
const journalPath = process.env.LASOVIET_ACCEPTANCE_JOURNAL;
const outputDirectory = process.env.LASOVIET_ACCEPTANCE_OUTPUT;
assert(journalPath && outputDirectory, 'Explicit journal and output paths are required');
assertFd123OutputPath(resolve(outputDirectory, 'receipt.json'));
const stat = lstatSync(journalPath);
assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0);
const bytes = readFileSync(journalPath);
const journal = JSON.parse(bytes);
const hash = value => createHash('sha256').update(value).digest('hex');
const slots = ['monthly:0', 'monthly:1', 'current_annual:0', 'career_wealth:0'];
const samples = slots.map(slot => {
  const row = journal.reports.find(item => item.slot === slot);
  assert(row?.result?.ok && row.result.value?.content, `Retained response unavailable: ${slot}`);
  return row;
});
const root = process.cwd();
const require = createRequire(resolve(root, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
const stylesRoot = resolve(root, 'apps/web/src/styles');
const stylesheet = readFileSync(resolve(stylesRoot, 'global.css'), 'utf8').replace(/@import "\.\/([^"]+)";/g,
  (_, name) => readFileSync(resolve(stylesRoot, name), 'utf8'));
mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
const rows = [];
try {
  for (const sample of samples) {
    const period = sample.group !== 'career_wealth';
    const component = period ? 'PeriodReportReader' : 'TopicReportReader';
    const content = sample.result.value.content;
    const report = { version: 1, state: 'ready', contentVersion: period ? 'ziwei.period-reading.v1' : 'ziwei.topic-deep-dive.v1',
      reportId: 'synthetic-retained-report', reportVersionId: 'synthetic-retained-version', chartId: 'synthetic-retained-chart',
      sku: sample.group === 'monthly' ? 'ZIWEI-MONTHLY-P0' : period ? 'ZIWEI-YEAR-P0' : 'ZIWEI-CAREER-P0',
      locale: 'vi', fulfillmentStatus: 'html_ready', lineage: { supersedesReportVersionId: null }, content };
    const bundle = await build({ stdin: { contents: `
      import {createRoot} from 'react-dom/client';
      import {NextIntlClientProvider} from 'next-intl';
      import {${component}} from './src/features/reports/${period ? 'period-report-reader' : 'topic-report-reader'}';
      import reports from './messages/vi/reports.json';
      createRoot(document.getElementById('fixture')).render(<NextIntlClientProvider locale='vi' timeZone='Asia/Ho_Chi_Minh' messages={{reports}}><${component} report={${JSON.stringify(report)}}/></NextIntlClientProvider>);
    `, loader: 'tsx', resolveDir: resolve(root, 'apps/web') },
      alias: { '@lasoviet/contracts': resolve(root, 'tests/e2e/helpers/browser-commerce-contracts.ts') },
      bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
      plugins: [{ name: 'isolated-router', setup(build) {
        build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'stub' }));
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const useRouter=()=>({refresh(){},push(){}});', loader: 'js' }));
      } }] });
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).pathname === '/' ? route.fulfill({
        contentType: 'text/html', body: '<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div data-light-ready><div id="fixture"></div></div></body></html>',
      }) : route.fulfill({ status: 204 }));
      try {
        await page.goto('http://retained-reader.test/');
        await page.addStyleTag({ content: stylesheet });
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(content.title);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
        await expect(page.getByRole('link', { name: 'Về thư viện của bạn' })).toHaveAttribute('href', '/tai-khoan/bao-cao');
        await expect(page.getByRole('button', { name: 'Không đúng', exact: true })).toBeVisible();
        const prose = await page.locator('body').innerText();
        assert(!prose.includes('evidenceKeys'), 'Internal evidence field disclosed');
        const evidenceKeys = [];
        const collect = value => {
          if (!value || typeof value !== 'object') return;
          for (const [key, item] of Object.entries(value)) {
            if (key === 'evidenceKeys') evidenceKeys.push(...item);
            else if (typeof item === 'object') collect(item);
          }
        };
        collect(content);
        assert(evidenceKeys.every(key => !prose.includes(key)), 'Internal evidence identifier disclosed');
        const renderedHeadingStyle = await page.getByRole('heading', { level: 1 }).evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element.closest('main')).backgroundColor }));
        await page.screenshot({ path: resolve(outputDirectory, `${sample.slot.replace(':', '-')}-${width}.png`), fullPage: true });
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('.topic-reader-tools')).toBeHidden();
        await expect(page.locator('.part-feedback')).toBeHidden();
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        assert.deepEqual(errors, []);
        rows.push({ slot: sample.slot, width, contentSha256: hash(JSON.stringify(content)), pass: true, clientErrors: 0, renderedHeadingStyle });
      } catch (error) {
        rows.push({ slot: sample.slot, width, contentSha256: hash(JSON.stringify(content)), pass: false, error: error.message });
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
assert.equal(hash(readFileSync(journalPath)), hash(bytes), 'Actual authority changed');
const receipt = { status: rows.every(row => row.pass) ? 'PASS' : 'FAIL', sourceJournalSha256: hash(bytes), rows,
  scope: 'Isolated browser rendering of four retained real responses; no authenticated purchase/export integration or editorial/product acceptance implied',
  physicalProviderCalls: 0, productionDatabaseWrites: 0, financialWrites: 0, customerSends: 0, manualAccepted: false };
writeFileSync(resolve(outputDirectory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ status: receipt.status, passed: rows.filter(row => row.pass).length, failed: rows.filter(row => !row.pass).length }));
if (receipt.status !== 'PASS') process.exitCode = 1;
