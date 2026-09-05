import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test("an anonymous user can confirm immediate deletion and lose chart access", async ({
  page,
}) => {
  const chartUrl = await createAnonymousChart(page, "vi");

  await page.getByRole("button", { name: "Xóa dữ liệu lá số" }).click();
  await expect(page.getByText(
    "Thao tác này xóa ngay hồ sơ sinh và lá số tạm thời của bạn.",
  )).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();

  await expect(page).toHaveURL("/");
  expect(
    (await page.context().cookies()).filter((cookie) =>
      cookie.name.includes("better-auth.session"),
    ),
  ).toEqual([]);

  const response = await page.goto(chartUrl);
  expect(response?.status()).toBe(404);
});
