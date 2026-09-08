import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test("the private Zi Wei result route renders the free chart flow", async ({
  page,
}) => {
  await createAnonymousChart(page, "vi");

  // 1. Hero
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lá số Tử Vi");
  await expect(page.getByText("Lá số riêng tư")).toBeVisible();

  // 2. Traditional 4x4 board with 12 palaces
  const chartGrid = page.getByTestId("ziwei-chart-grid");
  await expect(chartGrid).toBeVisible();
  const palaces = chartGrid.getByTestId("ziwei-palace");
  await expect(palaces).toHaveCount(12);

  // 3. Palace selection updates inspector, aria-pressed, and relation labels
  const targetPalace = palaces.nth(1);
  await targetPalace.click();
  await expect(targetPalace).toHaveAttribute("aria-pressed", "true");
  const inspector = page.getByTestId("ziwei-detail-inspector");
  await expect(inspector).toBeVisible();
  await expect(targetPalace.locator(".palace-relation-tag")).toHaveText("Bản cung");

  // 4. Evidence drawer: focus close button, trap Tab/Shift+Tab, Escape restore, and backdrop close
  const trigger = page.getByRole("button", { name: "Xem căn cứ" }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Căn cứ/);

  const closeButton = dialog.getByRole("button", { name: "Đóng căn cứ" });
  await expect(closeButton).toBeFocused();

  // Tab & Shift+Tab stay inside dialog panel
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();

  // Escape closes dialog and restores focus to trigger button
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // Re-open and close via backdrop click, then verify focus is restored
  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // 5. Free Identity Preview sections
  await expect(
    page.getByRole("heading", { name: "Ba điểm để tự quan sát" }),
  ).toBeVisible();
  await expect(page.getByText("Điểm mạnh")).toBeVisible();
  await expect(page.getByText("Điểm cần điềm tĩnh quan sát")).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem bản luận giải mẫu" })).toBeVisible();

  // 6. Topic Selection Page
  await page.getByRole("link", { name: "Chọn chủ đề luận giải" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chọn chủ đề luận giải");

  // Layer 1: Disciplines
  const disciplines = page.getByTestId("disciplines-layer");
  await expect(disciplines.getByText("Tử Vi Đẩu Số")).toBeVisible();
  await expect(disciplines.getByText("Bát Tự (Tứ Trụ)")).toBeVisible();
  await expect(disciplines.getByText("Bản đồ sao phương Tây")).toBeVisible();
  await expect(disciplines.getByText("Thần số học (Pitago)")).toBeVisible();
  await expect(disciplines.getByText("Đang phát triển")).toHaveCount(3);
  await expect(disciplines.getByText("Kinh Dịch")).toHaveCount(0);

  // Layer 2: Zi Wei topics (active lifetime + 3 disabled topics with no action)
  const activeTopic = page.getByTestId("topic-lifetime-active");
  await expect(activeTopic).toBeVisible();
  await expect(activeTopic.getByText("Luận giải Tử Vi trọn đời")).toBeVisible();
  await expect(activeTopic.getByText("79.000 ₫")).toBeVisible();
  await expect(activeTopic.getByRole("button", { name: "Tiếp tục thanh toán" })).toBeVisible();

  const relTopic = page.getByTestId("topic-relationship-disabled");
  await expect(relTopic).toBeVisible();
  await expect(relTopic.getByText("Sắp ra mắt")).toBeVisible();
  await expect(relTopic.getByRole("button")).toHaveCount(0);

  const careerTopic = page.getByTestId("topic-career-wealth-disabled");
  await expect(careerTopic).toBeVisible();
  await expect(careerTopic.getByText("Sắp ra mắt")).toBeVisible();
  await expect(careerTopic.getByRole("button")).toHaveCount(0);

  const annualTopic = page.getByTestId("topic-annual-disabled");
  await expect(annualTopic).toBeVisible();
  await expect(annualTopic.getByText("Sắp ra mắt")).toBeVisible();
  await expect(annualTopic.getByRole("button")).toHaveCount(0);
});
