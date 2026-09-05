import { expect, test } from "@playwright/test";

test("opens the canonical birth wizard and advances through its exact-time steps", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "localhost",
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

test("prefills birth data from hero form into wizard using sessionStorage without URL query params", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/");

  const heroForm = page.locator("#hero-form");
  await heroForm.locator('input[placeholder="12"]').fill("12");
  await heroForm.locator('input[placeholder="04"]').fill("04");
  await heroForm.locator('input[placeholder="1994"]').fill("1994");
  await heroForm.locator("select").selectOption("si");

  await heroForm.getByRole("button", { name: "Lập lá số miễn phí" }).click();

  // Verify navigation to wizard WITHOUT query parameters in URL
  await expect(page).toHaveURL("/tao-la-so/tu-vi");
  expect(new URL(page.url()).search).toBe("");

  // Wizard starts at step 1
  await expect(page.getByRole("heading", { name: "Lập lá số cho ai?" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Step 2 shows prefilled date and branch
  await expect(page.getByLabel("Ngày sinh dương lịch")).toHaveValue("1994-04-12");
  await expect(page.getByLabel("Địa Chi giờ sinh")).toHaveValue("si");

  await page.getByLabel("Nữ").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Step 3 (Review) shows localized branch label
  await expect(page.getByRole("heading", { name: "Kiểm tra thông tin" })).toBeVisible();
  await expect(page.getByText("1994-04-12")).toBeVisible();
  await expect(page.getByText("Tỵ (09:00 - 11:00)")).toBeVisible();
  await expect(page.getByText("Nữ", { exact: true })).toBeVisible();
});

test("prefills birth data with unknown time from hero form and respects honest eligibility gate", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/");

  const heroForm = page.locator("#hero-form");
  await heroForm.locator('input[placeholder="12"]').fill("12");
  await heroForm.locator('input[placeholder="04"]').fill("04");
  await heroForm.locator('input[placeholder="1994"]').fill("1994");
  await heroForm.locator("select").selectOption("");

  await heroForm.getByRole("button", { name: "Lập lá số miễn phí" }).click();

  await expect(page).toHaveURL("/tao-la-so/tu-vi");
  expect(new URL(page.url()).search).toBe("");

  await expect(page.getByRole("heading", { name: "Lập lá số cho ai?" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByLabel("Ngày sinh dương lịch")).toHaveValue("1994-04-12");
  await expect(page.getByLabel("Không rõ giờ sinh")).toBeChecked();

  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra thông tin" })).toBeVisible();
  await expect(page.getByText("Không rõ giờ sinh")).toBeVisible();
});
