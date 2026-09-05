import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test("the private Zi Wei result route renders the free chart flow", async ({
  page,
}) => {
  await createAnonymousChart(page, "vi");

  await expect(page.getByRole("heading", { name: "Lá số Tử Vi" })).toBeVisible();
  await expect(page.getByText("Lá số riêng tư")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem căn cứ" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ba điểm để tự quan sát" }),
  ).toBeVisible();
  await expect(page.getByText("Điểm mạnh", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Điểm căng cần quan sát", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Xem căn cứ" }).first().click();
  await expect(page.getByRole("dialog", { name: "Căn cứ luận giải" })).toBeVisible();
  await expect(page.getByText("Điều có thể quan sát")).toBeVisible();
  await expect(page.getByText("Trung bình", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đóng căn cứ" }).click();
  await expect(page.getByRole("dialog", { name: "Căn cứ luận giải" })).toBeHidden();

  await page.getByRole("link", { name: "Chọn chủ đề luận giải" }).click();
  await expect(page.getByRole("heading", { name: "Chọn luận giải chuyên sâu" })).toBeVisible();
  await expect(page.getByText("Bản mệnh và tiềm năng")).toBeVisible();
  await expect(page.getByText("SePay sẽ được mở ở bước tiếp theo.")).toBeVisible();
});
