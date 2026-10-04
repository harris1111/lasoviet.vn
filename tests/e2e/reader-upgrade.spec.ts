import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, name: string) => readFileSync(resolve(stylesRoot, name), "utf8"));
const sheetStyles = readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: resolve(root, "apps/web"), loader: "tsx", contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {ReaderUpgrade} from "./src/features/reports/reader-upgrade";
      import vi from "./messages/vi/reports.json";
      import en from "./messages/en/reports.json";
      const locale = new URL(location.href).searchParams.get("locale") || "vi";
      createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports: locale === "vi" ? vi : en}}><ReaderUpgrade chartId="chart-fixture" chartVersionId="version-fixture" locale={locale}/></NextIntlClientProvider>);
    ` },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
    alias: { "@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts") },
    plugins: [{ name: "isolated-router", setup(builder: any) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "router", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "const router = {push: path => {window.fixtureDestination = path}, refresh: () => {window.fixtureRefresh = true}}; export const useRouter = () => router;", loader: "js" }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});

for (const [locale, width, price] of [["vi", 390, 480], ["en", 1440, 960], ["vi", 320, 0], ["vi", 390, 768]] as const) {
  test(`server-priced reader upgrade ${locale} ${width}px ${price} La`, async ({ page }) => {
    page.on("pageerror", error => console.error(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.clock.setFixedTime(new Date("2026-10-04T00:00:00Z"));
    const spends: unknown[] = [];
    const intents: unknown[] = [];
    const analytics: Array<{event: {name: string; properties: Record<string, unknown>}}> = [];
    const discount = price === 768 ? 192 : 0;
    const credit = 960 - price - discount;
    const sources = credit === 480 ? ["ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-SPOUSE-P0"] : credit === 960 ? ["LIFE", "SIBLINGS", "SPOUSE", "CHILDREN", "WEALTH", "HEALTH", "TRAVEL", "FRIENDS"].map(id => `ZIWEI-PALACE-${id}-P0`) : [];
    await page.route("**/*", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/quotes")) {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({json: {version: 1, chartId: "chart-fixture", chartVersionId: "version-fixture", locale, quotedAt: "2026-10-04T00:00:00Z", quotes: [{sku: "ZIWEI-IDENTITY-P0", state: "available", basePriceLa: 960, priceLa: price, creditLa: credit, discountLa: discount, creditExpiresAt: credit ? "2026-10-10T00:00:00Z" : null, creditSourceSkus: sources, reportId: null, reportState: null}]}});
      } else if (path === "/api/analytics/events") {
        analytics.push(route.request().postDataJSON());
        await route.fulfill({json: {ok: true}});
      } else if (path.endsWith("/purchase-intents")) {
        intents.push(route.request().postDataJSON());
        expect(route.request().postDataJSON()).toEqual({ chartId: "chart-fixture", chartVersionId: "version-fixture", locale, sku: "ZIWEI-IDENTITY-P0" });
        await route.fulfill({ json: { id: "intent", sku: "ZIWEI-IDENTITY-P0", chartVersionId: "version-fixture", locale, amountLa: price, status: "pending", stateVersion: 2, createdAt: "2026-09-30T10:00:00Z" } });
      } else if (path.endsWith("/balance")) {
        await route.fulfill({ json: { totalLa: 1100, stateVersion: 4 } });
      } else if (path.endsWith("/unlock")) {
        spends.push(route.request().postDataJSON());
        await route.fulfill({ json: { reportId: "report-unlocked" } });
      } else if (path === "/") {
        await route.fulfill({ contentType: "text/html", body: '<html data-theme="light"><meta name="viewport" content="width=device-width, initial-scale=1"><body><main id="fixture" style="padding:16px"></main></body></html>' });
      } else await route.abort();
    });
    await page.goto(`https://upgrade.test/?locale=${locale}`);
    await page.addStyleTag({ content: stylesheet + sheetStyles });
    await page.addScriptTag({ content: bundle });
    await expect(page.getByRole("status")).toContainText(`${price} Lá`);
    expect(spends).toHaveLength(0);
    expect(intents).toHaveLength(0);
    if (credit) {
      await expect.poll(() => analytics.filter(item => item.event.name === "upgrade_view").length).toBe(sources.length);
      for (const event of analytics.filter(item => item.event.name === "upgrade_view")) expect(event.event.properties).toEqual({source_sku: expect.any(String), target_sku: "ZIWEI-IDENTITY-P0", days_remaining: 6});
    }
    await expect(page.locator("[data-locked=true]")).toHaveCount(3);
    expect(await page.locator(".blur-bar").allTextContents()).toEqual(Array(9).fill(""));
    expect(await page.locator(".reader-upgrade").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.locator(".reader-upgrade-topup")).toHaveAttribute("href", locale === "en" ? "/en/nap-la" : "/nap-la");
    await page.getByRole("button", { name: locale === "vi" ? "Xem giá và xác nhận nâng cấp" : "Review upgrade" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => intents.length).toBe(1);
    expect(await page.locator("dialog").evaluate((dialog: HTMLDialogElement) => dialog.matches(":modal"))).toBe(true);
    expect(spends).toHaveLength(0);
    await page.getByRole("button", { name: locale === "vi" ? "Xác nhận mở" : "Confirm unlock", exact: true }).click();
    await expect.poll(() => spends.length).toBe(1);
    expect(spends[0]).toMatchObject({ purchaseIntentId: "intent", expectedIntentVersion: 2, expectedWalletVersion: 4 });
    await expect.poll(() => page.evaluate(() => (window as any).fixtureDestination)).toBe(`${locale === "en" ? "/en" : ""}/bao-cao/report-unlocked`);
    expect(analytics.filter(item => item.event.name === "upgrade_view")).toHaveLength(sources.length);
    expect(analytics.filter(item => item.event.name === "upgrade_purchased")).toHaveLength(0);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".reader-upgrade")).not.toBeVisible();
  });
}
