import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8")
  .replace(/@import "\.\/([^"]+)";/g, (_, filename: string) => readFileSync(resolve(stylesRoot, filename), "utf8"));
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {ComprehensiveReportReader} from "./src/features/reports/comprehensive-report-reader";
      import reports from "./messages/vi/reports.json";
      import {report} from "../../tests/e2e/helpers/report-reader-fixture";
      import nativeSnapshot from "../../tests/e2e/helpers/report-reader-native-snapshot.json";
      const mobileReport = {...report, chartSnapshot: nativeSnapshot.chartSnapshot, content: {...report.content, palaceReadings: report.content.palaceReadings.map((palace, index) => ({...palace, title: "Cung thử nghiệm số " + (index + 1)}))}};
      createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{reports}}><ComprehensiveReportReader report={mobileReport}/></NextIntlClientProvider>);
    `, loader: "tsx", resolveDir: resolve(root, "apps/web") },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    alias: {"@lasoviet/contracts": resolve(root, "tests/e2e/helpers/browser-commerce-contracts.ts")},
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
  });
  bundle = result.outputFiles[0].text;
});

for (const width of [320, 390, 1440]) {
  test(`chart navigation, focus and print at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date("2026-10-05T03:00:00Z"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
    await page.route("**/*", route => {
      if (new URL(route.request().url()).pathname === "/") return route.fulfill({contentType: "text/html", body: '<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture"></div></body></html>'});
      return route.fulfill({ status: 204 });
    });
    await page.goto("http://reader-navigation.test/");
    await page.addStyleTag({ content: stylesheet });
    await page.addScriptTag({ content: bundle });
    await expect(page.locator(".report-reader-root")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const firstPalace = page.locator(".report-palace-card").first();
    await expect(firstPalace.locator(".report-band")).toBeVisible();
    const palaceCardsFit = () => page.locator(".report-palace-card").evaluateAll(cards => cards.every(card => {
      const rect = card.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth;
    }));
    expect(await palaceCardsFit()).toBe(true);
    if (width <= 600) {
      await expect(firstPalace.locator("summary > .report-chart")).toBeHidden();
    } else {
      await expect(firstPalace.locator("summary > .report-chart")).toBeVisible();
    }
    const initiallyOpen = await firstPalace.evaluate(card => (card as HTMLDetailsElement).open);
    await firstPalace.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => firstPalace.evaluate(card => (card as HTMLDetailsElement).open)).toBe(!initiallyOpen);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await palaceCardsFit()).toBe(true);
    await page.keyboard.press("Enter");
    await expect.poll(() => firstPalace.evaluate(card => (card as HTMLDetailsElement).open)).toBe(initiallyOpen);
    if (width < 1200) {
      const trigger = page.getByRole("button", {name: "Xem lá số", exact: true});
      await trigger.click();
      const dialog = page.getByRole("dialog");
      const close = dialog.getByRole("button", {name: "Đóng lá số"});
      await expect(close).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await page.keyboard.press("Tab");
      await expect(dialog.locator('button.cell[tabindex="0"]')).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.keyboard.press("Tab");
      const before = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      await page.keyboard.press("ArrowRight");
      expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).not.toBe(before);
      await page.keyboard.press("Enter");
      await expect(dialog).toHaveCount(0);
    } else {
      await expect(page.locator(".report-navigation-chart")).toBeVisible();
      await page.locator(".report-navigation-chart button.cell").nth(3).click();
    }
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches(".report-palace-card > summary"))).toBe(true);
    const original = await page.locator(".report-palace-card").evaluateAll(cards => cards.map(card => (card as HTMLDetailsElement).open));
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({media: "print"});
    expect(await page.locator(".report-palace-card").evaluateAll(cards => cards.every(card => (card as HTMLDetailsElement).open))).toBe(true);
    await expect(page.locator(".report-chart:visible")).toHaveCount(1);
    await expect(page.locator(".report-chart-mobile-bar")).toBeHidden();
    await page.emulateMedia({media: "screen"});
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect.poll(() => page.locator(".report-palace-card").evaluateAll(cards => cards.map(card => (card as HTMLDetailsElement).open))).toEqual(original);
    expect(errors).toEqual([]);
  });
}
