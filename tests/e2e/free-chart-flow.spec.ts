import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test("the private Zi Wei result route renders the free chart flow with 5 tabs", async ({
  page,
}) => {
  await createAnonymousChart(page, "vi");

  // 1. Hero
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lá số Tử Vi");
  await expect(page.getByText("Lá số riêng tư")).toBeVisible();

  // 2. Tab Bar presence & accessible roles
  const tablist = page.getByRole("tablist", { name: "Các tầng nội dung lá số" });
  await expect(tablist).toBeVisible();
  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(5);

  // Tab 1: Chart tab (Default)
  await expect(tabs.nth(0)).toHaveText("Lá số");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

  const chartGrid = page.getByTestId("ziwei-chart-grid");
  await expect(chartGrid).toBeVisible();
  const palaces = chartGrid.getByTestId("ziwei-palace");
  await expect(palaces).toHaveCount(12);

  // Palace selection updates inspector and aria-pressed
  const targetPalace = palaces.nth(1);
  await targetPalace.click();
  await expect(targetPalace).toHaveAttribute("aria-pressed", "true");
  const inspector = page.getByTestId("ziwei-detail-inspector");
  await expect(inspector).toBeVisible();
  await expect(targetPalace.locator(".palace-relation-tag")).toHaveText("Bản cung");

  // Verify discovery strip
  await expect(page.getByText("12 cung bản mệnh đã an")).toBeVisible();

  // Tab 2: Overview tab
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/tab=overview/);
  await expect(page.getByRole("heading", { name: "Ba điểm để tự quan sát" })).toBeVisible();
  await expect(page.getByText("Điểm mạnh")).toBeVisible();
  await expect(page.getByText("Điểm cần điềm tĩnh quan sát")).toBeVisible();

  // CTA on Overview tab navigates to Palaces
  const toPalacesBtn = page.getByRole("button", { name: "Xem luận giải 12 cung →" });
  await expect(toPalacesBtn).toBeVisible();
  await toPalacesBtn.click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/tab=palaces/);

  // Tab 3: Palaces tab with 12 rows
  await expect(page.getByRole("heading", { name: "Bản đồ 12 cung bản mệnh" })).toBeVisible();
  const palaceRows = page.locator(".palace-row-card");
  await expect(palaceRows).toHaveCount(12);
  await expect(page.getByText("Xem trước")).toBeVisible();
  await expect(page.getByText("Chưa mở").first()).toBeVisible();
  await expect(page.getByText("Đã đọc")).toHaveCount(0);

  // Tab 4: Topics tab with 12 reading themes
  await tabs.nth(3).click();
  await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/tab=topics/);
  await expect(page.getByRole("heading", { name: "Chuyên đề luận giải sâu" })).toBeVisible();
  const topicRows = page.locator(".topic-row-item");
  await expect(topicRows).toHaveCount(12);

  // Open topic preview
  const firstInspectBtn = page.getByRole("button", { name: "Xem cấu trúc chủ đề" }).first();
  await firstInspectBtn.click();
  await expect(page).toHaveURL(/open=life/);

  // Navigate to Topic Selection Page
  await page.getByRole("link", { name: "Mở chuyên đề luận giải" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chọn chủ đề luận giải");

  // Layer 1: Disciplines
  const disciplines = page.getByTestId("disciplines-layer");
  await expect(disciplines.getByText("Tử Vi Đẩu Số")).toBeVisible();
  await expect(disciplines.getByText("Bát Tự (Tứ Trụ)")).toBeVisible();
  await expect(disciplines.getByText("Bản đồ sao phương Tây")).toBeVisible();
  await expect(disciplines.getByText("Thần số học (Pitago)")).toBeVisible();
  await expect(disciplines.getByText("Đang phát triển")).toHaveCount(3);
  await expect(disciplines.getByText("Kinh Dịch")).toHaveCount(0);

  // Layer 2: Zi Wei topics
  const activeTopic = page.getByTestId("topic-lifetime-active");
  await expect(activeTopic).toBeVisible();
  await expect(activeTopic.getByText("Luận giải Tử Vi trọn đời")).toBeVisible();
  await expect(activeTopic.getByText("79.000 ₫")).toBeVisible();
  await expect(activeTopic.getByRole("button", { name: "Tiếp tục thanh toán" })).toBeVisible();
});
