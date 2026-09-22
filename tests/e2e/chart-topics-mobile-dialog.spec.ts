import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test.describe("ZiweiTopicsTab mobile portal dialog vs desktop inline runtime", () => {
  test("mobile viewport: verifies portal outside main, landmark inert/aria-hidden isolation, focus trap, and restore vectors", async ({
    page,
  }) => {
    // 1. Create real authorized chart
    const chartUrl = await createAnonymousChart(page, "vi");
    const chartPath = new URL(chartUrl).pathname;

    // 2. Set mobile viewport (<= 768px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${chartPath}?tab=topics`);

    // 3. Open mobile topic preview
    const lifeTrigger = page.locator('[data-topic-trigger="life"]');
    await expect(lifeTrigger).toBeVisible();
    await lifeTrigger.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);

    // 4. Verify actual portal mounted directly under body, strictly outside main
    const portalOverlay = page.locator("body > .topic-mobile-sheet-overlay");
    await expect(portalOverlay).toBeVisible();
    await expect(page.locator("main .topic-mobile-sheet-overlay")).toHaveCount(0);

    // 5. Verify background landmarks are inert and aria-hidden
    await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
    const isMainInert = await page.locator("main").evaluate((el: HTMLElement) => el.inert);
    expect(isMainInert).toBe(true);

    await expect(page.locator("header")).toHaveAttribute("aria-hidden", "true");
    const isHeaderInert = await page.locator("header").evaluate((el: HTMLElement) => el.inert);
    expect(isHeaderInert).toBe(true);

    // 6. Verify initial focus is on sheet close button
    const closeBtn = portalOverlay.locator(".sheet-close-btn");
    await expect(closeBtn).toBeFocused();

    // 7. Verify Tab / Shift+Tab keyboard focus trap
    await page.keyboard.press("Tab");
    const ctaLink = portalOverlay.locator(".sheet-cta-wrap a");
    await expect(ctaLink).toBeFocused();

    // Wrap around to first element (close button)
    await page.keyboard.press("Tab");
    await expect(closeBtn).toBeFocused();

    // Shift+Tab wraps back to last element
    await page.keyboard.press("Shift+Tab");
    await expect(ctaLink).toBeFocused();

    // 8. Verify Escape key closes modal, restores landmarks, and restores focus to trigger
    await page.keyboard.press("Escape");
    await expect(portalOverlay).toBeHidden();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);

    await expect(page.locator("main")).not.toHaveAttribute("aria-hidden", "true");
    const isMainInertRestored = await page.locator("main").evaluate((el: HTMLElement) => el.inert);
    expect(isMainInertRestored).toBe(false);

    await expect(lifeTrigger).toBeFocused();

    // 9. Verify backdrop click close and focus restoration
    await lifeTrigger.click();
    await expect(portalOverlay).toBeVisible();
    await portalOverlay.click({ position: { x: 5, y: 5 } });
    await expect(portalOverlay).toBeHidden();
    await expect(lifeTrigger).toBeFocused();

    // 10. Verify deep-link open and browser Back restoration
    await page.goto(`${chartPath}?tab=topics&open=life`);
    await expect(portalOverlay).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");

    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(portalOverlay).toBeHidden();
    await expect(page.locator("main")).not.toHaveAttribute("aria-hidden", "true");
    await expect(lifeTrigger).toBeFocused();
  });

  test("desktop viewport: renders inline non-modal preview within main, without portal or inert isolation", async ({
    page,
  }) => {
    const chartUrl = await createAnonymousChart(page, "vi");
    const chartPath = new URL(chartUrl).pathname;

    // Desktop viewport (> 768px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${chartPath}?tab=topics`);

    const lifeTrigger = page.locator('[data-topic-trigger="life"]');
    await lifeTrigger.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);

    // No portal dialog rendered
    await expect(page.locator(".topic-mobile-sheet-overlay")).toBeHidden();

    // Inline desktop preview rendered inside main
    const inlinePreview = page.locator("main .topic-desktop-inline-preview");
    await expect(inlinePreview).toBeVisible();
    await expect(page.getByText("Cấu trúc nội dung chủ đề: Cung Mệnh")).toBeVisible();

    // Background is NOT inert or aria-hidden
    await expect(page.locator("main")).not.toHaveAttribute("aria-hidden", "true");
    const isMainInert = await page.locator("main").evaluate((el: HTMLElement) => el.inert);
    expect(isMainInert).toBe(false);
  });
});
