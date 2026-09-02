import { expect, test } from "@playwright/test";

test("the private Zi Wei result route renders the free chart flow", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto("/la-so/chart-1");

  await expect(page.getByRole("heading", { name: "Lá số Tử Vi" })).toBeVisible();
  await expect(page.getByTestId("ziwei-palace")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "Xem căn cứ" }).first()).toBeVisible();
  await expect(page.getByText("Điểm mạnh")).toBeVisible();
  await expect(page.getByText("Điểm căng cần quan sát")).toBeVisible();
  await expect(page.getByText("ZIWEI-IDENTITY-P0")).toBeVisible();

  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.getByTestId("ziwei-chart-list")).toBeVisible();

  await page.getByRole("button", { name: "Xem căn cứ" }).first().click();
  await expect(page.getByRole("dialog", { name: "Căn cứ luận giải" })).toBeVisible();
  await page.getByRole("button", { name: "Đóng căn cứ" }).click();
  await expect(page.getByRole("dialog", { name: "Căn cứ luận giải" })).toBeHidden();

  await page.getByRole("link", { name: "Chọn chủ đề luận giải" }).click();
  await expect(page.getByRole("heading", { name: "Chọn luận giải chuyên sâu" })).toBeVisible();
  await expect(page.getByText("ZIWEI-IDENTITY-P0")).toBeVisible();
  await expect(page.getByText("SePay sẽ được mở ở bước tiếp theo.")).toBeVisible();
});
