import { expect, test } from "@playwright/test";

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
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Ngày sinh dương lịch").fill("1990-01-01");
  await page.getByLabel("Giờ", { exact: true }).fill("09");
  await page.getByLabel("Phút", { exact: true }).fill("30");
  await page.getByLabel("Nam").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lập lá số" }).click();

  await expect(page).toHaveURL(/\/la-so\/[^/]+$/);
  await expect(
    page.locator(".ziwei-chart-grid").getByTestId("ziwei-palace"),
  ).toHaveCount(12);
  await expect(page.getByRole("heading", { name: "Ba điểm để tự quan sát" })).toBeVisible();
  await page.getByRole("button", { name: "Xem căn cứ" }).first().click();
  await expect(page.getByRole("dialog", { name: "Căn cứ luận giải" })).toBeVisible();
});
