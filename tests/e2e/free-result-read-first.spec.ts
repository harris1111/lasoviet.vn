import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

const blocks = [
  "chart", "insights", "scores", "free-palace", "year", "decade",
  "palaces", "topics", "evidence", "completion",
];

for (const locale of ["vi", "en"] as const) {
  for (const width of [360, 390, 430, 768, 1023, 1024, 1280, 1440]) {
    test(`${locale} FD109 read-first result fits ${width}px without early money ask`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await createAnonymousChart(page, locale);
      const result = page.getByTestId("fd109-free-result");
      await expect(result).toBeVisible();
      await expect(page.getByTestId("fd109-sticky")).toBeHidden();
      // The route hero is outside the reading component; check the entire page.
      await expect(page.locator('.result-hero a[href*="/chon-luan-giai"]')).toHaveCount(0);
      expect(await page.locator('main a[href*="/chon-luan-giai"]').evaluateAll(
        (links) => links.every((link) => link.closest('[data-testid="fd109-completion"], [data-testid="fd109-sticky"], [data-testid="fd109-preview-dialog"]')),
      )).toBe(true);
      expect(await result.locator("[data-free-result-block]").evaluateAll(
        (elements) => elements.map((element) => element.getAttribute("data-free-result-block")),
      )).toEqual(blocks);
      expect(await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      )).toBe(true);
      const board = result.locator(".ziwei-board-wrapper");
      expect(await board.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      )).toBe(true);
      await expect(board.getByTestId("ziwei-palace")).toHaveCount(12);
      expect(await board.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll('[data-testid="ziwei-palace"]')].every((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
        });
      })).toBe(true);
      await expect(result).not.toContainText(/\b(?:120|240|480|960)\s*(?:Lá|La)\b|₫|\bVND\b/);
      await expect(result.locator('[data-free-result-block]:not([data-free-result-block="completion"]) a[href*="/chon-luan-giai"]')).toHaveCount(0);
      await expect(page.getByTestId("fd109-completion").locator('a[href*="/chon-luan-giai"]')).toHaveCount(1);

      if (width < 1024) {
        // Phone: one scrolling page whose sticky chip bar is the same tablist, used as anchors.
        await expect(result.getByRole("tablist")).toBeVisible();
        await expect(result.getByRole("tab")).toHaveCount(5);
        for (const block of blocks) {
          await expect(result.locator(`[data-free-result-block="${block}"]`)).toBeVisible();
        }
        await page.getByTestId("fd109-completion").scrollIntoViewIfNeeded();
        await expect(page.getByTestId("fd109-sticky")).toBeVisible();
      } else {
        await expect(result.getByRole("tablist")).toBeVisible();
        await expect(result.getByRole("tab")).toHaveCount(5);
        await page.locator("#tab-overview").click();
        await expect(page).toHaveURL(/\?tab=overview$/);
        await expect(page.locator("#panel-overview")).toBeVisible();
      }
      await page.screenshot({ path: testInfo.outputPath(`fd109-${locale}-${width}.png`), fullPage: true });
    });
  }
}

test("FD110 locked preview offers the selected palace and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const chartUrl = new URL(await createAnonymousChart(page, "vi"));
  const trigger = page.getByTestId("fd109-palace-preview").first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const dialog = page.getByTestId("fd109-preview-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('a[href*="/chon-luan-giai"]')).toHaveCount(1);
  await expect(dialog.locator('a[href*="/chon-luan-giai"]')).toHaveAttribute(
    "href", `${chartUrl.pathname}/chon-luan-giai`,
  );
  await expect(dialog).toContainText("120 Lá");
  await expect(dialog).not.toContainText(/₫|VND|VNĐ/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.getByTestId("fd109-sticky")).toBeVisible();
});

test("FD109 retains the private-route 404 boundary before query redirects", async ({ page }) => {
  const response = await page.goto("/la-so/unauthorized-fd109-chart?tab=invalid&unknown=1");
  expect(response?.status()).toBe(404);
});

test("FD109 URL history and direct preview links restore modal and keyboard state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const chartPath = new URL(await createAnonymousChart(page, "vi")).pathname;
  // Back and Forward must restore client-side. A document load would drop the window marker and shows up
  // as a main-frame navigation request (same-document history moves never do).
  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests.push(request.url());
  });
  await page.evaluate(() => { (window as unknown as { __fd109NoReload?: boolean }).__fd109NoReload = true; });
  const expectNoDocumentNavigation = async () => {
    expect(await page.evaluate(() => (window as unknown as { __fd109NoReload?: boolean }).__fd109NoReload)).toBe(true);
    expect(documentRequests).toEqual([]);
  };
  await page.locator("#tab-topics").click();
  await page.locator("#panel-topics button").first().click();
  await expect(page).toHaveURL(new RegExp(`${chartPath}\\?tab=topics&open=(?:career_wealth|relationship_marriage|[a-z]+)$`));
  await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("fd109-preview-dialog")).toBeHidden();
  await expect(page.locator("#panel-topics button").first()).toBeFocused();
  await expectNoDocumentNavigation();
  await page.goForward();
  await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
  await expectNoDocumentNavigation();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("fd109-preview-dialog")).toBeHidden();
  const selectedId = await page.locator('[data-free-result-block="free-palace"]').getAttribute("data-palace-id");
  const selectedSuffix = selectedId!.split(".").pop()!;
  await page.goto(`${chartPath}?tab=palaces&open=${selectedSuffix}`);
  await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("fd109-preview-dialog")).toBeHidden();
  await expect(page.locator("#tab-palaces")).toBeFocused();

  await page.locator("#tab-overview").click();
  await page.locator('[data-testid="fd109-evidence-row"] .evidence-open').first().click();
  await expect(page).toHaveURL(new RegExp(`${chartPath}\\?tab=overview&open=life-palace$`));
  await expect(page.locator(".evidence-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".evidence-drawer")).toBeHidden();
  await page.locator("#tab-overview").click();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.locator("#tab-overview")).toBeFocused();
});

test("FD109 Back from an offer link restores the open preview and keeps the URL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createAnonymousChart(page, "vi");
  const trigger = page.getByTestId("fd109-palace-preview").first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const dialog = page.getByTestId("fd109-preview-dialog");
  await expect(dialog).toBeVisible();
  const openUrl = page.url();
  await dialog.locator('a[href*="/chon-luan-giai"]').click();
  await expect(page).toHaveURL(/\/chon-luan-giai/);
  await page.goBack();
  await expect(page).toHaveURL(openUrl);
  await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
});
