import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// FD-109: a topic preview is one native modal <dialog> (a bottom sheet on phones, a centred card on desktop).
// The browser makes the page behind it inert; the page owns focus, Escape, backdrop, scroll lock and the URL.
for (const [label, width, height] of [["phone", 390, 844], ["desktop", 1280, 900]] as const) {
  test(`${label}: topic preview is a modal with focus, Escape, backdrop, scroll lock and deep link`, async ({ page }) => {
    test.setTimeout(120000);
    const chartPath = new URL(await createAnonymousChart(page, "vi")).pathname;
    await page.setViewportSize({ width, height });
    await page.goto(`${chartPath}?tab=topics`);

    const row = page.locator('[data-topic-id="career_wealth"]');
    const dialog = page.getByTestId("fd109-preview-dialog");
    // A native modal can hand focus to the browser itself (body), but never to the page behind it.
    const focusStaysOut = () => page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement?.closest("dialog[open]")));
    const scrollLocked = () => page.evaluate(() => document.body.style.overflow === "hidden");

    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=career_wealth`);
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element: HTMLDialogElement) => element.open)).toBe(true);
    await expect(dialog.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(dialog.locator(".fd109-close")).toBeFocused();
    expect(await scrollLocked()).toBe(true);

    // Focus never reaches the page behind the dialog while it is open, forwards or backwards.
    for (let press = 0; press < 6; press += 1) {
      await page.keyboard.press("Tab");
      expect(await focusStaysOut(), `Tab ${press + 1}`).toBe(true);
    }
    for (let press = 0; press < 3; press += 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusStaysOut(), `Shift+Tab ${press + 1}`).toBe(true);
    }

    // Escape closes, unlocks scroll and hands focus back to the row that opened it.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    expect(await scrollLocked()).toBe(false);
    await expect(row).toBeFocused();

    // The backdrop closes it too, with the same focus return.
    await row.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).toBeHidden();
    expect(await scrollLocked()).toBe(false);
    await expect(row).toBeFocused();

    // A shared link opens the preview on load; Back leaves it.
    await page.goto(`${chartPath}?tab=topics&open=career_wealth`);
    await expect(dialog).toBeVisible();
    expect(await scrollLocked()).toBe(true);
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(dialog).toBeHidden();
    expect(await scrollLocked()).toBe(false);
  });
}
