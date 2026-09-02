import { expect, test } from "@playwright/test";

test("opens the canonical birth wizard and advances through its exact-time steps", async ({
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
  await page.goto("/tao-la-so/tu-vi");

  await expect(page.getByRole("heading", { name: "Lập lá số cho ai?" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByLabel("Ngày sinh dương lịch")).toBeVisible();

  await page.getByLabel("Ngày sinh dương lịch").fill("1990-01-01");
  await page.getByLabel("Giờ", { exact: true }).fill("09");
  await page.getByLabel("Phút", { exact: true }).fill("30");
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra thông tin" })).toBeVisible();
  await expect(page.getByText("1990-01-01")).toBeVisible();
  await expect(page.getByText("09:30")).toBeVisible();
  await expect(page.getByText("Nam", { exact: true })).toBeVisible();
});
