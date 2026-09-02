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
  await expect(page.getByRole("link", { name: "Tiếng Việt" })).toHaveAttribute(
    "href",
    "/",
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
