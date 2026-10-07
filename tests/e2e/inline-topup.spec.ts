import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const styles = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, file: string) => readFileSync(resolve(stylesRoot, file), "utf8")) + readFileSync(resolve(stylesRoot, "contextual-unlock.css"), "utf8");
const intentId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
let bundle = "";
test.beforeAll(async () => {
  const built = await build({ stdin: { contents: `
    import {useState} from 'react'; import {createRoot} from 'react-dom/client';
    import {NextIntlClientProvider} from 'next-intl'; import {UnlockSheet} from './src/features/commerce/unlock-sheet';
    import {useUnlockLabels} from './src/features/commerce/contextual-unlock';
    import vi from './messages/vi/reports.json'; import en from './messages/en/reports.json';
    function Sheet() { const [open,setOpen]=useState(false); const [done,setDone]=useState(false); const labels=useUnlockLabels();
      const locale=new URLSearchParams(location.search).get('locale')==='en'?'en':'vi';
      return <><button id="open" onClick={()=>setOpen(true)}>Open</button><p id="receipt">{done?'Completed':'Locked'}</p>
        <UnlockSheet open={open} onOpenChange={setOpen} onUnlocked={()=>setDone(true)} chartId="fixture-chart" chartVersionId="fixture-version"
          sku="ZIWEI-IDENTITY-P0" itemName={locale==='vi'?'Tử Vi trọn đời':'Lifetime reading'} locale={locale} labels={labels}/></>; }
    const locale=new URLSearchParams(location.search).get('locale')==='en'?'en':'vi';
    createRoot(document.getElementById('fixture')).render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports:locale==='en'?en:vi}}><Sheet/></NextIntlClientProvider>);
  `, loader: "tsx", resolveDir: resolve(root, "apps/web") }, bundle: true,
    alias: { "@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts") },
    plugins: [{ name: "navigation", setup(context) { context.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "navigation" }));
      context.onLoad({ filter: /.*/, namespace: "navigation" }, () => ({ contents: "const router={push(){},refresh(){}};export function useRouter(){return router;}", loader: "js" })); } }],
    write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  bundle = built.outputFiles[0].text;
});
async function mount(page: Page, locale = "vi", mode = "bank_transfer") {
  const state = { creates: [] as Array<Record<string, unknown>>, paid: false, blocked: false, statusFailed: false, claims: 0, terminal: "", wrongTarget: false, continuationPending: false, holdStatus: false, heldResponses: [] as (() => void)[], analytics: [] as string[], claimResult: "none" };
  page.on("pageerror", error => console.error("Fixture browser error:", error.message));
  await page.clock.install({ time: new Date("2026-10-06T12:00:00Z") });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/commerce/wallet/purchase-intents") return route.fulfill({ json: { id: intentId, amountLa: 840, stateVersion: 1 } });
    if (url.pathname === "/api/commerce/wallet/balance") return route.fulfill({ headers: { "x-wallet-topup-mode": mode }, json: { totalLa: 0, stateVersion: 1 } });
    if (url.pathname === "/api/analytics/events") { state.analytics.push(route.request().postDataJSON().event.name); return route.fulfill({ status: 202, json: { ok: true } }); }
    if (url.pathname.endsWith("/self-claim")) { state.claims++; if (state.claimResult !== "none") { state.paid = true; state.terminal = ""; state.continuationPending = state.claimResult === "pending"; } return route.fulfill({ json: { status: "claimed", orderId, kind: "wallet_topup", creditedLa: 1100 } }); }
    if (url.pathname === "/api/commerce/wallet/top-up-orders" || url.pathname.endsWith("/status")) {
      if (route.request().method() === "POST" && url.pathname.endsWith("/status")) return route.fulfill({ status: 204 });
      if (url.pathname.endsWith("/status") && state.holdStatus) await new Promise<void>(resolve => state.heldResponses.push(resolve));
      if (url.pathname.endsWith("/status") && state.statusFailed) return route.fulfill({ status: 503, json: {} });
      if (url.pathname === "/api/commerce/wallet/top-up-orders") { state.creates.push(route.request().postDataJSON()); if (mode === "test") state.paid = true; }
      const selected = state.creates[0]?.packId === "LA-DISCOVER-3000" ? { amount: 249000, credited: 3000 } : { amount: 99000, credited: 1100 };
      return route.fulfill({ json: { order: { id: orderId, kind: "wallet_topup", status: state.terminal || (state.paid ? "paid" : "pending"), amount: selected.amount, currency: "VND", locale,
        productTitle: "TEST ONLY PACK", paymentCode: "NOT-PAYABLE-TEST", chartId: null, createdAt: "2026-10-06T12:00:00Z", creditApplied: 0, creditExpiresAt: null,
        creditedLa: state.paid ? selected.credited : null, supportUrl: "/lien-he", continuation: { purchaseIntentId: intentId, chartVersionId: state.wrongTarget ? "another-version" : "fixture-version", unlockedSku: "ZIWEI-IDENTITY-P0", status: state.paid ? state.continuationPending ? "pending" : state.blocked ? "blocked" : "completed" : "pending",
          returnPath: `${locale === "en" ? "/en" : ""}/la-so/fixture-chart?tab=topics&topupOrder=${orderId}`, reportId: state.paid ? "test-report" : null,
          remainingLa: state.paid ? selected.credited - 840 : null, errorCode: state.blocked ? "INTENT_TERMS_CHANGED" : null } },
        paymentInstructions: state.paid || state.terminal ? null : { bankCode: "VCB", accountNumber: "00000000", accountHolder: "TEST ONLY", amount: selected.amount, currency: "VND", transferDescription: "NOT-PAYABLE-TEST",
          qrUrl: "https://vietqr.app/fixture.png", expiresAt: "2026-10-06T12:15:00Z" }, reportId: null } });
    }
    if (url.hostname === "vietqr.app") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><text x="20" y="160">NONPAYABLE TEST ONLY</text></svg>' });
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: "text/html", body: '<html><body><div id="fixture" data-light-ready></div></body></html>' });
    return route.abort();
  });
  await page.goto(`https://inline-topup.test/?locale=${locale}`);
  await page.addStyleTag({ content: styles }); await page.addScriptTag({ content: bundle });
  await expect(page.locator("#open")).toBeVisible({ timeout: 3000 });
  await page.locator("#open").click(); await expect(page.getByTestId("inline-topup")).toBeVisible();
  return state;
}
for (const width of [390, 1440]) test(`pay and complete within the same sheet at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); const state = await mount(page);
  await expect(page.getByTestId("inline-selected-pack")).toContainText("Khởi Đọc");
  await page.getByText("Xem các gói khác", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Khởi Đọc/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Nhập Môn/ })).toBeDisabled();
  await expect(page.getByTestId("inline-topup")).toContainText("260 Lá"); expect(state.creates).toHaveLength(0);
  await page.getByRole("radio", { name: /Khám Phá/ }).check(); await expect(page.getByTestId("inline-topup")).toContainText("2.160 Lá");
  await page.getByRole("button", { name: /Tiếp tục thanh toán 249.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  expect(state.creates).toHaveLength(1); expect(state.creates[0]).toMatchObject({ packId: "LA-DISCOVER-3000", continuation: { purchaseIntentId: intentId, confirmedPriceLa: 840 } });
  expect(await page.locator("dialog[open]").count()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape"); await page.locator("#open").click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  expect(state.creates).toHaveLength(1); await expect(page.getByTestId("inline-topup-payment")).toContainText("NOT-PAYABLE-TEST");
  state.paid = true; await page.clock.runFor(3000); await expect(page.locator("#receipt")).toHaveText("Completed");
  await expect(page.locator("dialog[open]")).toHaveCount(0); await expect(page).toHaveURL(/inline-topup\.test/);
});
test("failed restoration retains the same order and requires retry rather than another purchase", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.statusFailed = true; await page.locator("#open").click();
  await expect(page.getByRole("alert")).toBeVisible(); await expect(page.getByRole("button", { name: /Tiếp tục thanh toán/ })).toHaveCount(0);
  state.statusFailed = false; await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  expect(state.creates).toHaveLength(1);
});
test("a blocked server continuation never unlocks, and English retains the payment in context", async ({ page }) => {
  const state = await mount(page, "en"); await page.getByRole("button", { name: /Continue to payment — 99,000 VND/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  state.paid = true; state.blocked = true; await page.clock.runFor(3000); await expect(page.locator("#receipt")).toHaveText("Locked");
  await expect(page.locator("dialog[open]")).toHaveCount(1); await expect(page).toHaveURL(/inline-topup\.test/);
});

test("paid-pending continuation exposes status failures and retries before completing", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  state.paid = true; state.continuationPending = true; await page.clock.runFor(3000);
  await expect(page.getByTestId("inline-topup-payment")).toContainText("Đã cộng Lá");
  state.statusFailed = true; await page.clock.runFor(3000); await expect(page.getByRole("button", { name: "Kiểm tra lại", exact: true })).toBeVisible();
  await expect(page.locator("#receipt")).toHaveText("Locked"); state.statusFailed = false; state.continuationPending = false;
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click(); await expect(page.locator("#receipt")).toHaveText("Completed");
});
test("same-owner wrong-target restore fails closed and never completes the current selection", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.wrongTarget = true; state.paid = true; await page.locator("#open").click();
  await expect(page.getByRole("alert")).toBeVisible(); await expect(page.locator("#receipt")).toHaveText("Locked"); expect(state.creates).toHaveLength(1);
});
test("expired order keeps late-transfer claim and requires explicit fresh terms before another purchase", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.terminal = "expired"; await page.locator("#open").click();
  await expect(page.getByText("Đã chuyển khoản nhưng chưa được ghi nhận?", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chưa chuyển tiền — chọn lại gói", exact: true })).toBeVisible();
  state.terminal = ""; await page.getByRole("button", { name: "Chưa chuyển tiền — chọn lại gói", exact: true }).click();
  await expect(page.getByTestId("inline-topup")).toBeVisible(); expect(state.creates).toHaveLength(1);
  await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible(); expect(state.creates).toHaveLength(2);
});

test("a restore response after closing the sheet cannot complete or reopen it", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.holdStatus = true; state.paid = true; await page.locator("#open").click();
  await expect.poll(() => state.heldResponses.length).toBe(1); await page.keyboard.press("Escape");
  const response = page.waitForResponse(response => response.url().endsWith("/status") && response.request().method() === "GET");
  state.holdStatus = false; state.heldResponses[0](); await response;
  await expect(page.locator("dialog[open]")).toHaveCount(0); await expect(page.locator("#receipt")).toHaveText("Locked");
});
test("a self-claim receipt alone cannot complete the current order", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.locator('input[name="transferredAtLocal"]').fill("2026-10-06T19:00");
  await page.getByRole("button", { name: "Kiểm tra và nhận báo cáo", exact: true }).click();
  await expect.poll(() => state.claims).toBe(1); await page.clock.runFor(3000);
  await expect(page.locator("#receipt")).toHaveText("Locked"); await expect(page.locator("dialog[open]")).toHaveCount(1);
});
test("explicit pack consent is measured in the same browser session", async ({ page }) => {
  const state = await mount(page); await expect.poll(() => state.analytics.includes("unlock_confirm_view")).toBe(true);
  await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).dblclick(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  expect(state.creates).toHaveLength(1); await expect.poll(() => state.analytics.includes("pack_selected")).toBe(true);
});

for (const outcome of ["complete", "pending", "none", "mismatch"]) test(`late claim refreshes the exact expired order: ${outcome}`, async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.terminal = "expired"; await page.locator("#open").click();
  await expect(page.getByText("Đã chuyển khoản nhưng chưa được ghi nhận?", { exact: true })).toBeVisible();
  state.claimResult = outcome === "mismatch" ? "complete" : outcome; state.wrongTarget = outcome === "mismatch";
  await page.locator('input[name="transferredAtLocal"]').fill("2026-10-06T19:00");
  await page.getByRole("button", { name: "Kiểm tra và nhận báo cáo", exact: true }).click();
  await expect.poll(() => state.claims).toBe(1);
  if (outcome === "pending") {
    await expect(page.getByTestId("inline-topup-payment")).toContainText("Đã cộng Lá"); await expect(page.locator("#receipt")).toHaveText("Locked");
    state.continuationPending = false; await page.clock.runFor(3000);
  }
  await expect(page.locator("#receipt")).toHaveText(outcome === "complete" || outcome === "pending" ? "Completed" : "Locked");
  expect(state.creates).toHaveLength(1);
});

test("a late-claim status response after unmount cannot complete the abandoned sheet", async ({ page }) => {
  const state = await mount(page); await page.getByRole("button", { name: /Tiếp tục thanh toán 99.000đ/ }).click(); await expect(page.getByTestId("inline-topup-payment")).toBeVisible();
  await page.keyboard.press("Escape"); state.terminal = "expired"; await page.locator("#open").click();
  await expect(page.getByText("Đã chuyển khoản nhưng chưa được ghi nhận?", { exact: true })).toBeVisible();
  state.claimResult = "complete"; state.holdStatus = true;
  await page.locator('input[name="transferredAtLocal"]').fill("2026-10-06T19:00");
  await page.getByRole("button", { name: "Kiểm tra và nhận báo cáo", exact: true }).click();
  await expect.poll(() => state.heldResponses.length).toBe(1); await page.keyboard.press("Escape");
  const response = page.waitForResponse(response => response.url().endsWith("/status") && response.request().method() === "GET");
  state.holdStatus = false; state.heldResponses[0](); await response;
  await expect(page.locator("#receipt")).toHaveText("Locked"); await expect(page.locator("dialog[open]")).toHaveCount(0);
});


for (const locale of ["vi", "en"]) for (const width of [390, 412, 1440]) for (const theme of ["light", "dark"]) {
  test(`test top-up consent is explicit at ${width}px ${locale} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await mount(page, locale, "test");
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    const inline = page.getByTestId("inline-topup");
    await expect(inline.getByRole("note")).toContainText(locale === "vi" ? "không cần chuyển tiền" : "No money transfer");
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByTestId("inline-selected-pack")).toContainText(locale === "vi" ? "Khởi Đọc" : "Starter");
    expect(state.creates).toHaveLength(0);
    if (process.env.LSV_MOBILE_REPAIR_EVIDENCE) await page.screenshot({ path: `${process.env.LSV_MOBILE_REPAIR_EVIDENCE}/topup-${locale}-${width}-${theme}.png` });
    await page.getByText(locale === "vi" ? "Xem các gói khác" : "Compare other packs", { exact: true }).click();
    await expect(page.getByRole("radio")).toHaveCount(4);
    await page.getByRole("radio", { name: /8[.,]000/ }).check();
    await expect(page.getByTestId("inline-selected-pack")).toContainText(/8[.,]000 Lá/);
    const button = inline.getByRole("button", { name: locale === "vi" ? /Nạp thử 8.000 Lá/ : /Add 8,000 test Lá/ });
    await expect(button).toBeEnabled();
    expect(await page.locator("dialog[open]").count()).toBe(1);
    expect(await page.locator("dialog[open]").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await button.dblclick();
    await expect.poll(() => state.creates.length).toBe(1);
    expect(state.creates[0]).toMatchObject({ packId: "LA-LIBRARY-8000" });
    await expect(page.locator("#receipt")).toHaveText("Completed");
  });
}

test("unavailable top-up mode cannot create an order", async ({ page }) => {
  const state = await mount(page, "vi", "unavailable");
  await expect(page.getByTestId("inline-topup")).toContainText("Nạp Lá đang tạm dừng");
  await expect(page.getByRole("button", { name: /Tiếp tục thanh toán/ })).toBeDisabled();
  expect(state.creates).toHaveLength(0);
});
