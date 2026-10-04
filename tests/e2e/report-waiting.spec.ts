import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8")
  .replace(/@import "\.\/([^"]+)";/g, (_, name: string) => readFileSync(resolve(stylesRoot, name), "utf8"))
  + readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: {resolveDir: resolve(root, "apps/web"), loader: "tsx", contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {ReportProgress} from "./src/features/reports/report-progress";
      import {report} from "../../tests/e2e/helpers/report-reader-fixture";
      import vi from "./messages/vi/reports.json";
      import en from "./messages/en/reports.json";
      const locale = new URL(location.href).searchParams.get("locale") || "vi";
      const root = createRoot(document.getElementById("fixture"));
      window.fixtureRefreshes = 0;
      window.fixtureRender = (state = "pending") => root.render(
        <NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports: locale === "vi" ? vi : en}}>
          {state === "ready" ? <h1>Ready reading</h1> : <ReportProgress locale={locale} view={state === "failed"
            ? {version: 2, state: "failed", locale, purchaseSource: "wallet_spend", reportId: "private-report", reportVersionId: "private-version", errorCode: "REPORT_GENERATION_FAILED", supportReference: "RPT-SAFE"}
            : {version: 1, state: "pending", locale, purchaseSource: "wallet_spend", reportId: "private-report", reportVersionId: "private-version", sku: "ZIWEI-IDENTITY-P0", fulfillmentStatus: "generating", refreshAfterMs: 5000, chartSnapshot: report.chartSnapshot}} />}
        </NextIntlClientProvider>);
      window.fixtureRender();
    `},
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: {"process.env": "{}", "process.env.NODE_ENV": '"production"'},
    alias: {"@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts")},
    plugins: [{name: "stable-router", setup(builder: any) {
      builder.onResolve({filter: /^next\/navigation$/}, () => ({path: "router", namespace: "fixture"}));
      builder.onLoad({filter: /.*/, namespace: "fixture"}, () => ({contents: "const router = {refresh() {window.fixtureRefreshes++; if (!window.fixtureNoRerender) window.fixtureRender(window.fixtureNext || 'pending')}}; export const useRouter = () => router;", loader: "js"}));
    }}],
  });
  bundle = result.outputFiles[0].text;
});

for (const locale of ["vi", "en"]) for (const theme of ["light", "dark"]) {
  test(`truthful waiting, paused polling and ready transition ${locale} ${theme}`, async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.clock.install({time: new Date("2026-10-04T00:00:00Z")});
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).pathname === "/"
      ? route.fulfill({contentType: "text/html", body: `<!doctype html><html data-theme="${theme}"><meta name="viewport" content="width=device-width, initial-scale=1"><body><main id="fixture"></main></body></html>`})
      : route.abort());
    await page.goto(`https://waiting.test/?locale=${locale}`);
    await page.addStyleTag({content: stylesheet});
    await page.addScriptTag({content: bundle});
    const facts = page.getByTestId("waiting-chart-facts");
    await expect(facts).toBeVisible();
    await expect(facts.locator("article")).toHaveCount(12);
    await expect(facts).toContainText(locale === "vi" ? "Độ mạnh cấu trúc" : "Structural strength");
    await expect(page.getByRole("status")).toContainText(locale === "vi" ? "Đã mở khóa bằng Lá" : "Unlocked with La");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("body").innerText()).not.toMatch(/private-report|private-version|VND|VNĐ|₫|remaining minutes|phút còn lại/);
    await page.evaluate(() => { (window as any).fixtureNoRerender = true; });
    await page.clock.runFor(15_000);
    expect(await page.evaluate(() => (window as any).fixtureRefreshes)).toBe(3);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {configurable: true, value: "hidden"});
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.runFor(15_000);
    expect(await page.evaluate(() => (window as any).fixtureRefreshes)).toBe(3);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {configurable: true, value: "visible"});
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => page.evaluate(() => (window as any).fixtureRefreshes)).toBe(4);
    await page.evaluate(() => { (window as any).fixtureNext = "ready"; (window as any).fixtureNoRerender = false; });
    await page.clock.runFor(5000);
    await expect(page.getByRole("heading", {name: "Ready reading"})).toBeVisible();
    await page.clock.runFor(15_000);
    expect(await page.evaluate(() => (window as any).fixtureRefreshes)).toBe(5);
    await page.evaluate(() => { (window as any).fixtureRender("failed"); });
    await expect(page.getByRole("alert")).toContainText("RPT-SAFE");
    await expect(page.getByRole("alert")).not.toContainText(locale === "vi" ? "Đã hoàn" : "refunded");
    await expect(page.getByRole("link", {name: locale === "vi" ? "Liên hệ hỗ trợ" : "Contact support"})).toHaveAttribute("href", `${locale === "en" ? "/en" : ""}/lien-he`);
    await page.clock.runFor(15_000);
    expect(await page.evaluate(() => (window as any).fixtureRefreshes)).toBe(5);
    expect(errors).toEqual([]);
  });
}
