import { expect, test } from "@playwright/test";

test("opens the canonical birth wizard and advances through its exact-time steps", async ({
  page,
}) => {
  const baseURL = test.info().project.use.baseURL as string;
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: new URL(baseURL).hostname,
      path: "/",
    },
  ]);
  await page.goto("/tao-la-so/tu-vi");

  await expect(page.getByRole("heading", { name: "Người được lập lá số" })).toBeVisible();
  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Ngày, giờ sinh & nơi sinh" })).toBeVisible();
  await page.getByRole("textbox", { name: "Ngày", exact: true }).fill("01");
  await page.getByRole("textbox", { name: "Tháng", exact: true }).fill("01");
  await page.getByRole("textbox", { name: "Năm", exact: true }).fill("1990");
  await page.getByLabel("Giờ", { exact: true }).fill("09");
  await page.getByLabel("Phút", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư" })).toBeVisible();
  await expect(page.getByText("01/01/1990")).toBeVisible();
  await expect(page.getByText("09:30")).toBeVisible();
  await expect(page.getByText("Nam", { exact: true })).toBeVisible();
});

test("prefills birth data from hero form into wizard using the reusable cache without URL query params", async ({
  page,
}) => {
  const baseURL = test.info().project.use.baseURL as string;
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: new URL(baseURL).hostname,
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
  await expect(page.getByRole("heading", { name: "Người được lập lá số" })).toBeVisible();
  await page.getByLabel("Nữ").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Step 2 shows prefilled date and branch
  await expect(page.getByRole("heading", { name: "Ngày, giờ sinh & nơi sinh" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Ngày", exact: true })).toHaveValue("12");
  await expect(page.getByRole("textbox", { name: "Tháng", exact: true })).toHaveValue("04");
  await expect(page.getByRole("textbox", { name: "Năm", exact: true })).toHaveValue("1994");
  await expect(page.getByLabel("Địa Chi giờ sinh")).toHaveValue("si");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Step 3 (Review) shows localized branch label
  await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư" })).toBeVisible();
  await expect(page.getByText("12/04/1994")).toBeVisible();
  await expect(page.getByText("Tỵ (09:00 - 11:00)")).toBeVisible();
  await expect(page.getByText("Nữ", { exact: true })).toBeVisible();
});

test("preserves exact birth hour and minute from homepage cache into the wizard", async ({
  page,
}) => {
  const baseURL = test.info().project.use.baseURL as string;
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: new URL(baseURL).hostname,
      path: "/",
    },
  ]);
  await page.goto("/");

  const heroForm = page.locator("#hero-form");
  await heroForm.getByRole("textbox", { name: "Ngày", exact: true }).fill("12");
  await heroForm.getByRole("textbox", { name: "Tháng", exact: true }).fill("04");
  await heroForm.getByRole("textbox", { name: "Năm", exact: true }).fill("1994");
  await heroForm.getByRole("button", { name: "Giờ & phút" }).click();
  await heroForm.getByRole("textbox", { name: "Giờ", exact: true }).fill("09");
  await heroForm.getByRole("textbox", { name: "Phút", exact: true }).fill("05");
  await heroForm.getByRole("button", { name: "Lập lá số miễn phí" }).click();

  await expect(page).toHaveURL("/tao-la-so/tu-vi");
  expect(new URL(page.url()).search).toBe("");

  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("textbox", { name: "Ngày", exact: true })).toHaveValue("12");
  await expect(page.getByRole("textbox", { name: "Tháng", exact: true })).toHaveValue("04");
  await expect(page.getByRole("textbox", { name: "Năm", exact: true })).toHaveValue("1994");
  await expect(page.getByRole("textbox", { name: "Giờ", exact: true })).toHaveValue("09");
  await expect(page.getByRole("textbox", { name: "Phút", exact: true })).toHaveValue("05");
});

test("prefills birth data with unknown time from hero form and respects honest eligibility gate", async ({
  page,
}) => {
  const baseURL = test.info().project.use.baseURL as string;
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: new URL(baseURL).hostname,
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

  await expect(page.getByRole("heading", { name: "Người được lập lá số" })).toBeVisible();
  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Ngày, giờ sinh & nơi sinh" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Ngày", exact: true })).toHaveValue("12");
  await expect(page.getByRole("textbox", { name: "Tháng", exact: true })).toHaveValue("04");
  await expect(page.getByRole("textbox", { name: "Năm", exact: true })).toHaveValue("1994");
  await expect(page.getByLabel("Không rõ giờ sinh")).toBeChecked();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư" })).toBeVisible();
  await expect(page.getByText("12/04/1994")).toBeVisible();
  await expect(page.getByText("Không rõ giờ sinh")).toBeVisible();
});
