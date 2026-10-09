import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// FD-109: the free result is one reading page (chart stage + five tabs + evidence row) that ends in a single door to the offer page.
test("the private Zi Wei result route renders the free chart flow", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await createAnonymousChart(page, "vi");

  // 1. Hero
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lá số Tử Vi");
  await expect(page.getByText("Lá số riêng tư", { exact: true })).toBeVisible();

  // 2. Traditional 4x4 board with 12 palaces
  const chartGrid = page.getByTestId("ziwei-chart-grid");
  await expect(chartGrid).toBeVisible();
  const palaces = chartGrid.getByTestId("ziwei-palace");
  await expect(palaces).toHaveCount(12);

  // 3. Selecting a palace marks it and shows the inspector beside the board
  const targetPalace = palaces.nth(1);
  await targetPalace.click();
  await expect(targetPalace).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("ziwei-detail-inspector")).toBeVisible();

  // 4. Evidence drawer: focus lands on the close button, Tab/Shift+Tab stay inside, Escape and the backdrop both close and restore focus
  const trigger = page.locator('[data-testid="fd109-evidence-row"] .evidence-open').first();
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Căn cứ/);
  const closeButton = dialog.getByRole("button", { name: "Đóng căn cứ" });
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // 5. The reading itself: plain-language headings on the overview, and no price on the page body
  await expect(page.getByRole("heading", { level: 2, name: "Lá số này nói gì về bạn" })).toBeVisible();
  await expect(page.getByTestId("fd109-free-result")).not.toContainText(/₫|\bVND\b/);

  // 6. One door to the offer page, at the end of the reading
  const completionDoor = page.getByTestId("fd109-completion").locator('a[href*="/chon-luan-giai"]');
  await expect(completionDoor).toHaveCount(1);
  await completionDoor.scrollIntoViewIfNeeded();
  await completionDoor.click();
  await expect(page).toHaveURL(/\/chon-luan-giai/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Luận giải cho lá số của bạn");
  await expect(page.getByRole("heading", { level: 2, name: "Bạn muốn đọc phần nào của lá số?" })).toBeVisible();

  // 7. The offer page lists products in Lá, each with one button; nothing is priced in đồng or marked as coming soon
  const ladder = page.getByTestId("offer-ladder");
  await expect(ladder).toBeVisible();
  const lifetime = ladder.locator('article[data-sku="ZIWEI-IDENTITY-P0"]');
  await expect(lifetime).toBeVisible();
  await expect(lifetime.getByRole("heading", { name: "Tử Vi trọn đời" })).toBeVisible();
  await expect(lifetime).toContainText(/\d+ Lá/);
  await expect(lifetime.getByRole("button")).toHaveCount(1);
  await expect(ladder).not.toContainText(/₫|\bVND\b|Sắp mở|Sắp ra mắt/);
});
