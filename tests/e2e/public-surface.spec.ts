import { expect, test } from "@playwright/test";

const homepageHeading = "Lập lá số. Hiểu vận mệnh.";

async function visitVietnameseRoot(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/");
}

for (const viewport of [
  { name: "mobile", width: 320, height: 720 },
  { name: "desktop", width: 1200, height: 900 },
]) {
  test(`keeps the public homepage within the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await visitVietnameseRoot(page);

    await expect(page.getByRole("heading", { name: homepageHeading })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("renders canonical locale routes and uses real links", async ({ page }) => {
  await visitVietnameseRoot(page);

  await expect(page.getByRole("link", { name: "Lập lá số miễn phí" }).first()).toHaveAttribute(
    "href",
    "/tao-la-so/tu-vi",
  );
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute(
    "href",
    "/en",
  );

  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Build your chart. Understand your path." })).toBeVisible();
  await page.getByRole("link", { name: "Tiếng Việt" }).click();
  await expect(page).toHaveURL("/");
  await expect
    .poll(async () => (
      await page.context().cookies()
    ).find((cookie) => cookie.name === "NEXT_LOCALE")?.value)
    .toBe("vi");
});

test("keeps the homepage capability-honest", async ({ page }) => {
  await visitVietnameseRoot(page);

  const teaser = page.locator(".birth-cta");
  await expect(teaser.locator("input, select")).toHaveCount(0);
  await expect(teaser.getByRole("link", { name: "Lập lá số miễn phí" })).toHaveAttribute(
    "href",
    "/tao-la-so/tu-vi",
  );

  await expect(page.locator(".topic")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Bản mệnh & Tiềm năng" })).toBeVisible();
  await expect(page.getByText("Tình duyên & Hôn nhân")).toHaveCount(0);
  await expect(page.getByText("Công việc & Tài lộc")).toHaveCount(0);
  await expect(page.getByText("Vận trình năm 2026")).toHaveCount(0);

  const evidenceLink = page.locator(".insight").first().getByRole("link", {
    name: "Vì sao có nhận định này?",
  });
  await expect(evidenceLink).toHaveAttribute("href", "#can-cu");
  await evidenceLink.click();
  await expect(page).toHaveURL(/#can-cu$/);
  await expect(page.locator("#can-cu details")).toBeVisible();

  await expect(page.getByText(
    "Bạn có thể lưu dữ liệu sinh khi chưa rõ giờ, nhưng chưa thể lập lá số Tử Vi cho đến khi có giờ sinh chính xác phù hợp.",
  )).toBeVisible();
});

test("routes the localized footer privacy link to the public policy", async ({
  page,
}) => {
  await visitVietnameseRoot(page);

  const privacyLink = page.getByRole("link", { name: "Quyền riêng tư" });
  await expect(privacyLink).toHaveAttribute("href", "/chinh-sach-bao-mat");
  await privacyLink.click();
  await expect(page).toHaveURL("/chinh-sach-bao-mat");

  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/en/chinh-sach-bao-mat",
  );
});

test("opens the mobile navigation and exposes visible keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await visitVietnameseRoot(page);

  await page.locator("summary[aria-label='Mở điều hướng']").click();
  await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toHaveCount(1);
});

test("does not expose an API host in the public homepage", async ({ page }) => {
  await visitVietnameseRoot(page);

  await expect(page.locator("body")).not.toContainText(/https?:\/\/[^/\s]*api/i);
});
