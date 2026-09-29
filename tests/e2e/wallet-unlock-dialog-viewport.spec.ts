import { expect, test, type Page } from "@playwright/test";
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
let bundle = "";

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import {useState} from "react";
        import {createRoot} from "react-dom/client";
        import {NextIntlClientProvider} from "next-intl";
        import {WalletUnlockDialog} from "./src/features/commerce/wallet-unlock-dialog";
        import reports from "./messages/vi/reports.json";
        const s = reports.selection;
        const labels = {
          title: s.unlockDialogTitle, itemLabel: s.unlockDialogItemLabel,
          priceLabel: s.unlockDialogPriceLabel, balanceLabel: s.unlockDialogBalanceLabel,
          balanceAfterLabel: s.unlockDialogBalanceAfterLabel, confirm: s.unlockDialogConfirm,
          confirming: s.unlockDialogConfirming, cancel: s.unlockDialogCancel,
          shortBalanceTitle: s.unlockDialogShortBalanceTitle,
          topUpNote: s.unlockDialogTopupNote, genericError: s.unlockDialogGenericError
        };
        function Fixture() {
          const [open, setOpen] = useState(false);
          return <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh"
            messages={{reports}}>
            <main style={{height: 2400}}>Isolated wallet dialog layout fixture</main>
            <div className="paybar"><div className="container"><div className="paybar-btn">
              <button type="button" className="button" onClick={() => setOpen(true)}>
                Open fixture dialog
              </button>
              {open && <WalletUnlockDialog open onOpenChange={setOpen}
                onUnlocked={() => {}} chartId="fixture-chart" chartVersionId="fixture-version"
                sku="ZIWEI-IDENTITY-P0" locale="vi" itemName="Toàn diện" labels={labels}/>}
            </div></div></div>
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
      "@lasoviet/contracts": resolve(root, "packages/contracts/src/wallet-commerce-v1.ts"),
    },
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  bundle = result.outputFiles[0].text;
});

async function mountFixture(page: Page, balance = 2200) {
  const unlocks: unknown[] = [];
  // Every request is intercepted: no live chart, account, or wallet is touched.
  await page.route("**/*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/commerce/wallet/purchase-intents") {
      await route.fulfill({ json: { id: "intent-fixture", amountLa: 960, stateVersion: 1 } });
    } else if (path === "/api/commerce/wallet/balance") {
      await route.fulfill({ json: { totalLa: balance, stateVersion: 7 } });
    } else if (path === "/api/commerce/wallet/unlock") {
      unlocks.push(route.request().postDataJSON());
      await route.fulfill({ json: { reportId: null } });
    } else if (path === "/") {
      await route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture"></div></body></html>',
      });
    } else {
      await route.abort();
    }
  });
  await page.goto("http://wallet-layout.test/");
  await page.addStyleTag({ content: stylesheet });
  await page.addScriptTag({ content: bundle });
  await expect(page.getByRole("button", { name: "Open fixture dialog" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1000));
  return unlocks;
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 667, height: 280 },
]) {
  test(`wallet confirmation stays within viewport ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const unlocks = await mountFixture(page);
    await page.getByRole("button", { name: "Open fixture dialog" }).click();
    const overlay = page.locator("body > .wallet-unlock-dialog-overlay");
    const dialog = page.getByRole("dialog", { name: "Mở luận giải này" });
    await expect(overlay).toBeVisible();
    await expect(page.locator(".paybar .wallet-unlock-dialog-overlay")).toHaveCount(0);
    await expect(dialog).toContainText("1240 Lá");

    const overlayBox = await overlay.boundingBox();
    const panelBox = await dialog.boundingBox();
    expect(overlayBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(overlayBox!.y).toBeCloseTo(0, 0);
    expect(overlayBox!.height).toBeCloseTo(viewport.height, 0);
    expect(panelBox!.y).toBeGreaterThanOrEqual(0);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(panelBox!.x + panelBox!.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(panelBox!.y + panelBox!.height / 2).toBeCloseTo(viewport.height / 2, 0);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    const confirm = dialog.getByRole("button", { name: "Xác nhận mở", exact: true });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await confirm.click();
    await expect(dialog).toHaveCount(0);
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]).toMatchObject({
      purchaseIntentId: "intent-fixture",
      expectedIntentVersion: 1,
      expectedWalletVersion: 7,
    });
  });
}

test("Escape, cancel, and backdrop dismiss without spending", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const unlocks = await mountFixture(page);
  const trigger = page.getByRole("button", { name: "Open fixture dialog" });
  const dialog = page.getByRole("dialog", { name: "Mở luận giải này" });
  await page.evaluate(() => { document.body.style.overflow = "auto"; });
  await trigger.click();
  await expect(dialog).toContainText("1240 Lá");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "auto");
  await trigger.click();
  await dialog.getByRole("button", { name: "Huỷ", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "auto");
  await trigger.click();
  await page.locator("body > .wallet-unlock-dialog-overlay").click({ position: { x: 2, y: 2 } });
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "auto");
  expect(unlocks).toHaveLength(0);
});

test("short-balance dialog can scroll to its actions on a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 280 });
  const unlocks = await mountFixture(page, 0);
  await page.getByRole("button", { name: "Open fixture dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Mở luận giải này" });
  const topUp = dialog.locator('a[href="/nap-la?pack=LA-START-1100"]');
  await topUp.scrollIntoViewIfNeeded();
  await expect(topUp).toBeInViewport();
  await dialog.getByRole("button", { name: "Huỷ", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(unlocks).toHaveLength(0);
});
