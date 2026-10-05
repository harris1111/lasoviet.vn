import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
// Real deterministic engine output for a synthetic profile; no paid provider calls.
const reading = JSON.parse(readFileSync(resolve(root, "plan/evidence/2026-10-05-personal-daily-editorial-qa.json"), "utf8")).samples[0].reading;
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8")
  .replace(/@import "\.\/([^"]+)";/g, (_, filename: string) => readFileSync(resolve(stylesRoot, filename), "utf8"));
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: {resolveDir: resolve(root, "apps/web"), loader: "tsx", contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {PersonalDailyReadingPanel} from "./src/features/ziwei/personal-daily-reading-panel";
      import viZiwei from "./messages/vi/ziwei.json";
      import enZiwei from "./messages/en/ziwei.json";
      import viReports from "./messages/vi/reports.json";
      import enReports from "./messages/en/reports.json";
      const root = createRoot(document.getElementById("fixture"));
      window.fixtureRender = (chartId = "${reading.chartId}", chartVersionId = "${reading.chartVersionId}", locale = "vi") => root.render(
        <NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{ziwei: locale === "vi" ? viZiwei : enZiwei, reports: locale === "vi" ? viReports : enReports}}>
          <PersonalDailyReadingPanel chartId={chartId} chartVersionId={chartVersionId} locale={locale} includedOnly />
        </NextIntlClientProvider>);
    `},
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: {"process.env": "{}", "process.env.NODE_ENV": '\"production\"'},
    alias: {"@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts")},
    plugins: [{name: "isolated-router", setup(builder: any) {
      builder.onResolve({filter: /^next\/navigation$/}, () => ({path: "router", namespace: "fixture"}));
      builder.onLoad({filter: /.*/, namespace: "fixture"}, () => ({contents: "export const useRouter = () => ({refresh() {}});", loader: "js"}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});

async function mount(page: Page, locale = "vi") {
  await page.clock.install({time: new Date("2026-09-30T00:00:00Z")});
  await page.route("https://daily.test/", route => route.fulfill({contentType: "text/html", body: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="fixture"></main><nav class="report-chart-mobile-bar"><button>Xem lá số</button><button>Mục lục</button><span>9/12</span></nav></body></html>'}));
  await page.route("**/images/**", route => route.fulfill({status: 204}));
  await page.goto("https://daily.test/");
  await page.addStyleTag({content: stylesheet});
  await page.addScriptTag({content: bundle});
  await page.evaluate(({chartId, chartVersionId, locale}) => (window as any).fixtureRender(chartId, chartVersionId, locale), {chartId: reading.chartId, chartVersionId: reading.chartVersionId, locale});
}

for (const width of [320, 390, 1440]) test(`included engine reading without paid controls at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 844});
  await page.route("**/daily-reading", route => route.fulfill({json: reading, headers: {"x-daily-purchased": "false"}}));
  await mount(page);
  const panel = page.getByTestId("personal-daily-reading");
  await expect(panel).toContainText(reading.reading.headline);
  await expect(panel).toContainText(reading.reading.overview);
  await expect(panel.getByRole("button", {name: /mở khóa|hoàn Lá/i})).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await panel.locator("h2, h3").evaluateAll(headings => headings.every(heading => {
    const next = heading.nextElementSibling;
    if (!next) return false;
    const title = heading.getBoundingClientRect(), content = next.getBoundingClientRect();
    return content.top >= title.bottom && Math.abs(content.left - title.left) <= 1;
  }))).toBe(true);
  const lastFeedback = panel.getByRole("button", {name: "Không đúng", exact: true});
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await lastFeedback.evaluate(button => {
    const rect = button.getBoundingClientRect();
    const toolbar = document.querySelector(".report-chart-mobile-bar")!;
    const toolbarRect = toolbar.getBoundingClientRect();
    return rect.bottom <= innerHeight && (getComputedStyle(toolbar).display === "none" || rect.bottom <= toolbarRect.top)
      && button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
  })).toBe(true);
  await lastFeedback.focus();
  await expect(lastFeedback).toBeFocused();
});

for (const scenario of ["foreign-chart", "foreign-version", "failed-quality", "malformed", "expired"] as const) {
  test(`included reading fails closed for ${scenario}`, async ({page}) => {
    const payload = structuredClone(reading);
    if (scenario === "foreign-chart") payload.chartId = "foreign-chart";
    if (scenario === "foreign-version") payload.chartVersionId = "foreign-version";
    if (scenario === "failed-quality") payload.qualityGate.passed = false;
    let requests = 0;
    await page.route("**/daily-reading", async route => {
      requests++;
      await route.fulfill({status: scenario === "expired" ? 403 : 200, json: scenario === "malformed" ? {privateProse: "must-not-display"} : payload});
    });
    const response = page.waitForResponse(response => response.url().endsWith("daily-reading"));
    await mount(page);
    await (await response).finished();
    await page.clock.runFor(100);
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByTestId("personal-daily-reading")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(reading.reading.headline);
  });
}

test("chart change hides the previous reading before the new request resolves", async ({page}) => {
  let release: (() => void) | undefined;
  let secondRequest = false;
  await page.route("**/daily-reading", async route => {
    if (route.request().url().includes("next-chart")) {
      secondRequest = true;
      await new Promise<void>(resolve => {release = resolve;});
      await route.fulfill({json: {...reading, chartId: "next-chart", chartVersionId: "next-version"}});
    } else await route.fulfill({json: reading});
  });
  await mount(page);
  await expect(page.getByTestId("personal-daily-reading")).toBeVisible();
  await page.evaluate(() => (window as any).fixtureRender("next-chart", "next-version", "vi"));
  await expect.poll(() => secondRequest).toBe(true);
  await expect(page.getByTestId("personal-daily-reading")).toHaveCount(0);
  release!();
  await expect(page.getByTestId("personal-daily-reading")).toContainText(reading.reading.headline);
});

test("returning to the tab hides cached prose while the server rechecks expiry", async ({page}) => {
  let requests = 0;
  let release: (() => void) | undefined;
  await page.route("**/daily-reading", async route => {
    if (++requests === 1) await route.fulfill({json: reading});
    else {
      await new Promise<void>(resolve => {release = resolve;});
      await route.fulfill({status: 403, json: {code: "FORBIDDEN"}});
    }
  });
  await mount(page);
  await expect(page.getByTestId("personal-daily-reading")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {configurable: true, value: "visible"});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => requests).toBe(2);
  await expect(page.getByTestId("personal-daily-reading")).toHaveCount(0);
  const response = page.waitForResponse(response => response.url().endsWith("daily-reading") && response.status() === 403);
  release!();
  await response;
  await expect(page.getByTestId("personal-daily-reading")).toHaveCount(0);
});

test("English reports do not request or display Vietnamese-only daily prose", async ({page}) => {
  let requests = 0;
  await page.route("**/daily-reading", route => {requests++; return route.fulfill({json: reading});});
  await mount(page, "en");
  await page.clock.runFor(1000);
  expect(requests).toBe(0);
  await expect(page.getByTestId("personal-daily-reading")).toHaveCount(0);
});
