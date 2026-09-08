import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

const recipient = process.env.MVP_TEST_RECIPIENT;
const password = process.env.MVP_TEST_PASSWORD;
const signupAlreadySent = process.env.MVP_SIGNUP_ALREADY_SENT === "true";

test("the founder-run web service exposes readiness outside locale routing", async ({
  request,
}) => {
  const response = await request.get("/health/ready");

  expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    version: 1,
    status: "ok",
  });
});

test("the founder-run stack delivers registration email and serves the anonymous free Zi Wei flow", async ({
  page,
}) => {
  test.skip(
    recipient === undefined || password === undefined,
    "MVP_TEST_RECIPIENT and MVP_TEST_PASSWORD are required for the founder-run smoke",
  );

  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: new URL(test.info().project.use.baseURL as string).hostname,
      path: "/",
    },
  ]);

  await page.goto("/dang-nhap");
  if (!signupAlreadySent) {
    await page.getByLabel("Tên hiển thị").fill("Founder MVP verification");
    await page.getByLabel("Email").fill(recipient);
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Hãy kiểm tra email để xác minh tài khoản.",
    );
  }

  await page.getByRole("tab", { name: "Đăng nhập" }).click();
  await page.getByLabel("Email").fill(recipient);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.goto("/tao-la-so/tu-vi");
  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Ngày").fill("01");
  await page.getByLabel("Tháng").fill("01");
  await page.getByLabel("Năm").fill("1990");
  await page.getByLabel("Giờ", { exact: true }).fill("09");
  await page.getByLabel("Phút", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lập lá số" }).click();

  await expect(page).toHaveURL(/\/la-so\/[^/]+$/);
  const chartGrid = page.getByTestId("ziwei-chart-grid");
  await expect(chartGrid.getByTestId("ziwei-palace")).toHaveCount(12);

  // Inspector is visible
  await expect(page.getByTestId("ziwei-detail-inspector")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Ba điểm để tự quan sát" })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Xem căn cứ" }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Căn cứ/);
  await page.getByRole("button", { name: "Đóng căn cứ" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the founder-run stack serves the complete English private funnel", async ({
  page,
}) => {
  await createAnonymousChart(page, "en");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zi Wei");
  await expect(page.getByText("Private chart")).toBeVisible();

  const chartGrid = page.getByTestId("ziwei-chart-grid");
  await expect(chartGrid).toBeVisible();
  const palaces = chartGrid.getByTestId("ziwei-palace");
  await expect(palaces).toHaveCount(12);

  const inspector = page.getByTestId("ziwei-detail-inspector");
  await expect(inspector).toBeVisible();

  // Palace selection
  await palaces.nth(2).click();
  await expect(palaces.nth(2)).toHaveAttribute("aria-pressed", "true");

  // Evidence dialog with keyboard and restore
  const trigger = page.getByRole("button", { name: "View evidence" }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(/Evidence/);
  const closeBtn = dialog.getByRole("button", { name: "Close evidence" });
  await expect(closeBtn).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await expect(
    page.getByRole("heading", { name: "Three points to reflect on" }),
  ).toBeVisible();
  await expect(page.getByText("Core Strength", { exact: true })).toBeVisible();
  await expect(page.getByText("Area to Observe Mindfully", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Choose a reading topic" }).click();
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toContainText("Choose an in-depth reading");

  // Disciplines
  const disciplines = page.getByTestId("disciplines-layer");
  await expect(disciplines.getByText("Zi Wei Dou Shu")).toBeVisible();
  await expect(disciplines.getByText("In development")).toHaveCount(3);

  // Topics
  const activeTopic = page.getByTestId("topic-lifetime-active");
  await expect(activeTopic.getByText("79,000 VND")).toBeVisible();
  await expect(activeTopic.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  await expect(page.getByTestId("topic-relationship-disabled")).toBeVisible();
  await expect(page.getByTestId("topic-relationship-disabled").getByText("Coming soon")).toBeVisible();
  await expect(page.getByTestId("topic-relationship-disabled").getByRole("button")).toHaveCount(0);
});
