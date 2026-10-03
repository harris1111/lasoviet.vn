import { expect, test, type Page } from "@playwright/test";

// Phase 3 of the UX funnel overhaul: the homepage form creates the chart directly,
// no wizard in between. Mobile first (390x844), desktop checks the same logic.
const CTA = "Xem lá số của tôi";

async function fillValidBirth(page: Page) {
  await page.fill("#hv3-day", "25");
  await page.fill("#hv3-month", "07");
  await page.fill("#hv3-year", "1993");
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

    test("an empty submit lists every missing piece and focuses the first field", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await form.getByRole("button", { name: CTA }).click();
      await expect(form.getByRole("alert")).toHaveCount(4);
      await expect(page.locator("#hv3-day")).toBeFocused();
      await expect(form.locator("#hv3-consent-error")).toHaveText("Cần đồng ý để lập lá số.");
    });

    test("consent is never pre-ticked and is the only error left once the rest is valid", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await expect(page.locator("#hv3-consent")).not.toBeChecked();
      await fillValidBirth(page);
      await form.getByRole("button", { name: CTA }).click();
      await expect(form.getByRole("alert")).toHaveCount(1);
      await expect(page.locator("#hv3-consent")).toBeFocused();
    });

    test("the third-party consent only exists after choosing to view for someone else", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await expect(form.locator("#hv3-consent-other")).toHaveCount(0);

      await form.getByRole("button", { name: "Tôi xem cho người khác" }).click();
      await expect(form.locator("#hv3-consent-other")).toBeVisible();
      await expect(form.getByLabel("Tên gọi")).toBeVisible();

      await fillValidBirth(page);
      await page.locator("#hv3-consent").check();
      await form.getByRole("button", { name: CTA }).click();
      await expect(form.locator("#hv3-consent-other-error")).toBeVisible();
      await expect(page.locator("#hv3-consent-other")).toBeFocused();

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
test("one submit on the homepage lands on the chart page, with no wizard", async ({ page }) => {
  await page.goto("/");
  await fillValidBirth(page);
  await page.getByRole("button", { name: "Công việc, tiền bạc" }).click();
  await page.locator("#hv3-consent").check();
  await page.locator(".hv3-form").getByRole("button", { name: CTA }).click();
  await expect(page.locator(".hv3-form").getByRole("button", { name: "Đang an sao…" })).toBeDisabled();
  await page.waitForURL(/\/la-so\/[^/]+$/);
  expect(page.url()).not.toContain("/tao-la-so");
});
