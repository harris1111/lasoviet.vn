import { expect, test, type Page } from "@playwright/test";
import { minimumButtonContrast } from "./helpers/button-contrast";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
// Use the bundler already pinned by the workspace's Vite dependency.
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8")
  .replace(/@import "\.\/([^"]+)";/g, (_, filename: string) =>
    readFileSync(resolve(stylesRoot, filename), "utf8"));
const freeStyles = readFileSync(resolve(stylesRoot, "free-result-read-first.css"), "utf8");
const sheetStyles = readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
let bundle = "";

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import {useRef, useState} from "react";
        import {createRoot} from "react-dom/client";
        import {NextIntlClientProvider} from "next-intl";
        import {ContextualUnlock} from "./src/features/commerce/contextual-unlock";
        import {OfferLadder} from "./src/features/reports/offer-ladder";
        import vi from "./messages/vi/reports.json";
        import en from "./messages/en/reports.json";
        function Fixture() {
          const locale = new URLSearchParams(location.search).get("locale") === "en" ? "en" : "vi";
          const reports = locale === "en" ? en : vi;
          const dialog = useRef(null);
          const [show, setShow] = useState(false);
          const [version, setVersion] = useState("fixture-version");
          return <NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports}}>
            <button id="change-version" onClick={() => setVersion("next-version")}>Change version</button>
            <button id="preview-trigger" onClick={() => {setShow(true); dialog.current.showModal();}}>Open locked palace</button>
            <dialog ref={dialog} className="fd109-preview" onCancel={() => setShow(false)}>
              {show && <ContextualUnlock chartId="fixture-chart" chartVersionId={version} locale={locale} sku="ZIWEI-PALACE-SPOUSE-P0" offerHref="/la-so/fixture-chart/chon-luan-giai" />}
            </dialog>
            <OfferLadder chartId="fixture-chart" chartVersionId="fixture-version" locale={locale} initialSku="ZIWEI-IDENTITY-P0" initialQuotes={{status: "guest"}} balance={2000} scores={{"ziwei.palace.spouse": 63}} />
          </NextIntlClientProvider>;
        }
        createRoot(document.getElementById("fixture")).render(<Fixture/>);
      `,
      loader: "tsx",
      resolveDir: resolve(root, "apps/web"),
    },
    bundle: true,
    // Resolve the real browser-safe contract without the server-only barrel.
    alias: {
      "@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts"),
    },
    plugins: [{
      name: "next-navigation-mock",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^next\/navigation$/ }, () => ({
          path: "next-navigation-mock",
          namespace: "next-navigation-mock",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "next-navigation-mock" }, () => ({
          contents: "export function useRouter() { return { push() {}, refresh() {} }; }",
          loader: "js",
        }));
      },
    }],
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  bundle = result.outputFiles[0].text;
});


async function mountFixture(page: Page, locale = "vi", options: { quoteStatus?: number; intentPrice?: number } = {}) {
  const commands: unknown[] = [];
  const progress = { sku: "", state: "processing", reads: 0, quoteStatus: 200, mismatch: false, revoke: false, hold: false, responses: [] as (() => void)[] };
  const analytics: Array<{ event: { name: string; properties: Record<string, unknown> } }> = [];
  page.on("pageerror", error => { console.error(error.message); });
  const quotes = [
    { sku: "ZIWEI-PALACE-SPOUSE-P0", basePriceLa: 120, priceLa: 120, creditLa: 0, discountLa: 0, creditExpiresAt: null, creditSourceSkus: [], reportId: null, reportState: null, state: locale === "vi" ? "available" : "unavailable" },
    { sku: "ZIWEI-IDENTITY-P0", basePriceLa: 960, priceLa: 720, creditLa: 240, discountLa: 0, creditExpiresAt: "2026-10-10T00:00:00Z", creditSourceSkus: ["ZIWEI-NATAL-EXCERPT-P0"], reportId: null, reportState: null, state: "available" },
  ];
  if (locale === "en") quotes[0].priceLa = null as never;
  await page.route("**/*", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/commerce/wallet/quotes") {
      progress.reads++;
      if (progress.hold) await new Promise<void>(resolve => progress.responses.push(resolve));
      const projected = quotes.map(item => commands.length > 0 && item.sku === progress.sku && !progress.revoke ? { ...item, state: "owned", priceLa: null, creditLa: 0, discountLa: 0, creditExpiresAt: null, creditSourceSkus: [], reportId: progress.mismatch ? "33333333-3333-4333-8333-333333333333" : "22222222-2222-4222-8222-222222222222", reportState: progress.state } : item);
      await route.fulfill({ status: options.quoteStatus ?? progress.quoteStatus, json: { version: 1, chartId: "fixture-chart", chartVersionId: "fixture-version", locale, quotedAt: "2026-10-04T00:00:00Z", quotes: projected } });
    }
    else if (path === "/api/analytics/events") { analytics.push(route.request().postDataJSON()); await route.fulfill({ json: { ok: true } }); }
    else if (path === "/api/commerce/wallet/purchase-intents") {
      const sku = route.request().postDataJSON().sku;
      progress.sku = sku;
      await route.fulfill({ json: { id: "11111111-1111-4111-8111-111111111111", amountLa: options.intentPrice ?? (sku === "ZIWEI-IDENTITY-P0" ? 720 : 120), stateVersion: 1 } });
    } else if (path === "/api/commerce/wallet/balance") await route.fulfill({ json: { totalLa: 2000, stateVersion: 7 } });
    else if (path === "/api/commerce/wallet/unlock") { commands.push(route.request().postDataJSON()); await route.fulfill({ json: { reportId: "22222222-2222-4222-8222-222222222222" } }); }
    else if (path === "/") await route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture" class="fd109" data-light-ready></div></body></html>' });
    else await route.abort();
  });
  await page.goto(`https://contextual-unlock.test/?locale=${locale}`);
  await page.addStyleTag({ content: stylesheet + freeStyles + sheetStyles });
  await page.addScriptTag({ content: bundle });
  await expect(page.getByTestId("offer-ladder")).toBeVisible();
  return { commands, analytics, progress };
}
for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`palace120 purchases inside one preview at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { commands } = await mountFixture(page);
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await page.locator("#preview-trigger").click();
    const dialog = page.locator("dialog.fd109-preview");
    const buy = page.getByTestId("contextual-palace-unlock");
    await expect(buy).toBeEnabled(); await expect(buy).toContainText("120 Lá");
    expect(await minimumButtonContrast(buy)).toBeGreaterThanOrEqual(4.5);
    await buy.click(); await expect(dialog.getByRole("region")).toContainText("1880 Lá");
    expect(await page.locator("dialog[open]").count()).toBe(1);
    await page.keyboard.press("Tab"); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const confirm = dialog.getByRole("button", { name: "Xác nhận mở", exact: true });
    expect(await minimumButtonContrast(confirm)).toBeGreaterThanOrEqual(4.5);
    await confirm.click();
    await expect(page.getByTestId("contextual-unlock-success")).toBeVisible();
    expect(commands).toHaveLength(1);
    await expect(page).toHaveURL(/contextual-unlock.test/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog).not.toContainText(/VND|VNĐ|₫/);
    await expect(dialog.getByRole("link")).toHaveAttribute("href", "/bao-cao/22222222-2222-4222-8222-222222222222");
  });
}
test("cancel restores entry focus; errors and reserved choices cannot buy", async ({ page }) => {
  await mountFixture(page); await page.locator("#preview-trigger").click();
  await page.getByTestId("contextual-palace-unlock").click();
  await page.locator("dialog.fd109-preview").getByRole("button", { name: "Huỷ", exact: true }).click();
  await expect(page.getByTestId("contextual-palace-unlock")).toBeFocused();
  await page.getByTestId("contextual-lifetime-unlock").click();
  await page.locator("dialog.fd109-preview").getByRole("button", { name: "Huỷ", exact: true }).click();
  await expect(page.getByTestId("contextual-lifetime-unlock")).toBeFocused();
  await page.keyboard.press("Escape");
  for (const sku of ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-COMBO-2026-P0"]) {
    const card = page.locator(`[data-sku="${sku}"]`); await expect(card).toContainText("Sắp mở"); await expect(card.getByRole("button")).toHaveCount(0);
  }
  await mountFixture(page, "vi", { quoteStatus: 503 }); await page.locator("#preview-trigger").click();
  await expect(page.getByTestId("contextual-palace-unlock")).toBeDisabled();
  await expect(page.getByTestId("contextual-unlock").getByRole("alert")).toBeVisible();
});
test("server intent updates stale displayed rollover before confirmation", async ({ page }) => {
  const { commands } = await mountFixture(page, "vi", { intentPrice: 840 });
  await page.getByTestId("offer-ladder").getByRole("button", { name: "Mở luận giải — 720 Lá" }).click();
  const dialog = page.locator("dialog.unlock-sheet"); await expect(dialog).toContainText("840 Lá"); await expect(dialog).toContainText("1160 Lá");
  await dialog.getByRole("button", { name: "Xác nhận mở", exact: true }).click();
  expect(commands).toHaveLength(1); expect(commands[0]).toMatchObject({ expectedIntentVersion: 1, expectedWalletVersion: 7 });
});
test("English cannot buy an unsupported palace but retains lifetime", async ({ page }) => {
  await mountFixture(page, "en"); await page.locator("#preview-trigger").click();
  await expect(page.getByTestId("contextual-palace-unlock")).toBeDisabled();
  await expect(page.getByTestId("contextual-lifetime-unlock")).toBeEnabled();
});

test("visible ladder impressions preserve actual offers and authoritative upgrade attribution", async ({ page }) => {
  const { analytics } = await mountFixture(page);
  const lifetime = page.locator('[data-sku="ZIWEI-IDENTITY-P0"]');
  await lifetime.scrollIntoViewIfNeeded();
  await expect.poll(() => analytics.filter(item => item.event.name === "offer_view" && item.event.properties.sku === "ZIWEI-IDENTITY-P0").length).toBe(1);
  const impression = analytics.find(item => item.event.name === "offer_view" && item.event.properties.sku === "ZIWEI-IDENTITY-P0")!;
  expect(impression.event.properties).toEqual({ offer_id: "ZIWEI-IDENTITY-P0", sku: "ZIWEI-IDENTITY-P0", locale: "vi", placement: "paid_topic_selector" });
  await expect.poll(() => analytics.filter(item => item.event.name === "upgrade_view").length).toBe(1);
  expect(analytics.find(item => item.event.name === "upgrade_view")!.event.properties).toMatchObject({ source_sku: "ZIWEI-NATAL-EXCERPT-P0", target_sku: "ZIWEI-IDENTITY-P0" });
  await page.locator("#preview-trigger").scrollIntoViewIfNeeded(); await lifetime.scrollIntoViewIfNeeded();
  expect(analytics.filter(item => item.event.name === "offer_view" && item.event.properties.sku === "ZIWEI-IDENTITY-P0")).toHaveLength(1);
});


test("purchase receipt changes from preparing to read-now using authoritative quotes", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T07:00:00Z") });
  const { commands, progress } = await mountFixture(page);
  await page.locator("#preview-trigger").click();
  await page.getByTestId("contextual-palace-unlock").click();
  await page.locator("dialog.fd109-preview").getByRole("button", { name: "Xác nhận mở", exact: true }).click();
  const receipt = page.getByTestId("contextual-unlock-success");
  await expect(receipt).toContainText("đang được chuẩn bị");
  await expect(receipt.getByRole("link")).toHaveText("Xem tiến trình");
  progress.state = "ready";
  await page.clock.runFor(15000);
  await expect(receipt).toContainText("đã sẵn sàng");
  await expect(receipt.getByRole("link")).toHaveText("Đọc luận giải");
  const reads = progress.reads;
  await page.clock.runFor(30000);
  expect(progress.reads).toBe(reads);
  expect(commands).toHaveLength(1);
});


for (const failure of ["guest", "error", "mismatch", "revoked"]) test(`receipt does not claim processing after ${failure}`, async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T07:00:00Z") });
  const { progress } = await mountFixture(page);
  await page.locator("#preview-trigger").click();
  await page.getByTestId("contextual-palace-unlock").click();
  await page.locator("dialog.fd109-preview").getByRole("button", { name: "Xác nhận mở", exact: true }).click();
  const receipt = page.getByTestId("contextual-unlock-success");
  await expect(receipt).toContainText("đang được chuẩn bị");
  progress.quoteStatus = failure === "guest" ? 401 : failure === "error" ? 503 : 200;
  progress.mismatch = failure === "mismatch"; progress.revoke = failure === "revoked";
  await page.clock.runFor(15000);
  await expect(receipt).not.toContainText("đang được chuẩn bị");
  await expect(receipt.locator('a[href^="/bao-cao/"]')).toHaveCount(0);
  if (failure === "guest") await expect(receipt.getByRole("link")).toHaveText("Đăng nhập lại");
  else await expect(receipt.getByRole("button")).toHaveText("Thử lại");
  const reads = progress.reads; await page.clock.runFor(30000); expect(progress.reads).toBe(reads);
});

test("changing chart version discards receipt and ignores the old late quote response", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T07:00:00Z") });
  const { progress } = await mountFixture(page);
  await page.locator("#preview-trigger").click();
  await page.getByTestId("contextual-palace-unlock").click();
  await page.locator("dialog.fd109-preview").getByRole("button", { name: "Xác nhận mở", exact: true }).click();
  await expect(page.getByTestId("contextual-unlock-success")).toContainText("đang được chuẩn bị");
  progress.hold = true; await page.clock.runFor(15000);
  await expect.poll(() => progress.responses.length).toBeGreaterThan(0);
  await page.locator("#change-version").evaluate((el: HTMLButtonElement) => el.click());
  await expect(page.getByTestId("contextual-unlock-success")).toHaveCount(0);
  progress.hold = false; for (const release of progress.responses) release();
  await expect(page.getByTestId("contextual-unlock-success")).toHaveCount(0);
  await expect(page.locator('dialog.fd109-preview a[href^="/bao-cao/"]')).toHaveCount(0);
});
