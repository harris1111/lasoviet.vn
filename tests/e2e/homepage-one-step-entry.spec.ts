import { expect, test, type Page } from "@playwright/test";

// Phase 3 of the UX funnel overhaul: the homepage form is the only data-entry step. It opens the
// wizard straight on its review step, where the visitor confirms and consents once, then the chart
// is created. No subject or birth step in between. Mobile first (390x844), desktop checks the same.
const CTA = "Xem lá số của tôi";
const CONSENT = "Tôi đồng ý để Lá Số Việt xử lý thông tin sinh để lập lá số";

async function fillValidBirth(page: Page) {
  await page.selectOption("#hv3-day", "25");
  await page.selectOption("#hv3-month", "07");
  await page.selectOption("#hv3-year", "1993");
  await page.fill("#hv3-hour", "06");
  await page.fill("#hv3-minute", "40");
  await page.locator("#hv3-gender-female").click();
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(`homepage one-step entry (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("there is no consent checkbox on the homepage form", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".hv3-form").getByText(CONSENT)).toHaveCount(0);
    });

    test("an empty submit lists every missing piece and focuses the first field", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await form.getByRole("button", { name: CTA }).click();
      await expect(form.getByRole("alert")).toHaveCount(3);
      await expect(page.locator("#hv3-day")).toBeFocused();
    });

    test("a valid submit opens the wizard on its review step with consent still unticked", async ({ page }) => {
      await page.goto("/");
      await fillValidBirth(page);
      await page.locator(".hv3-form").getByRole("button", { name: CTA }).click();
      await page.waitForURL(/tao-la-so\/tu-vi/);
      await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư", level: 1 })).toBeVisible();
      await expect(page.getByLabel(CONSENT)).not.toBeChecked();
    });

    test("the third-party consent only exists after choosing to view for someone else", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await expect(form.locator("#hv3-consent-other")).toHaveCount(0);

      await form.getByRole("button", { name: "Tôi xem cho người khác" }).click();
      await expect(form.locator("#hv3-consent-other")).toBeVisible();
      await expect(form.getByLabel("Tên gọi")).toBeVisible();

      await fillValidBirth(page);
      await form.getByRole("button", { name: CTA }).click();
      await expect(form.locator("#hv3-consent-other-error")).toBeVisible();
      await expect(page.locator("#hv3-consent-other")).toBeFocused();

      await form.locator("#hv3-consent-other").check();
      await form.getByRole("button", { name: CTA }).click();
      await page.waitForURL(/tao-la-so\/tu-vi/);
      await expect(page.getByText("Người khác (đã xác nhận đồng ý)")).toBeVisible();

      await page.goto("/");
      await form.getByRole("button", { name: "Tôi xem cho người khác" }).click();
      await form.getByRole("button", { name: "Tôi xem cho chính mình" }).click();
      await expect(form.locator("#hv3-consent-other")).toHaveCount(0);
    });

    test("one concern can be chosen and is exposed as pressed", async ({ page }) => {
      await page.goto("/");
      const chip = page.getByRole("button", { name: "Công việc, tiền bạc" });
      await expect(chip).toHaveAttribute("aria-pressed", "false");
      await chip.click();
      await expect(chip).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Tình duyên" }).click();
      await expect(chip).toHaveAttribute("aria-pressed", "false");
    });
  });
}

test.describe("homepage one-step entry (phone fold)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the first field and the submit button are visible without scrolling", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hv3-day")).toBeInViewport();
    await expect(page.locator(".hv3-form").getByRole("button", { name: CTA })).toBeInViewport();
  });
});

// Needs the full stack (API, database, Redis) like the other chart-creating specs.
test("homepage form, one confirmation, then the chart page", async ({ page }) => {
  await page.goto("/");
  await fillValidBirth(page);
  await page.locator(".hv3-form").getByRole("button", { name: CTA }).click();
  await page.waitForURL(/tao-la-so\/tu-vi/);
  await page.getByLabel(CONSENT).check();
  await page.getByRole("button", { name: "Lập lá số" }).click();
  await page.waitForURL(/\/la-so\/[^/]+$/);
});
