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

    test("there is no consent checkbox and no 'someone else' option on the homepage form", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".hv3-form").getByText(CONSENT)).toHaveCount(0);
      await expect(page.locator(".hv3-form").getByRole("button", { name: "Tôi xem cho người khác" })).toHaveCount(0);
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

    test("the name field is always there and the typed name shows on the sample chart", async ({ page }) => {
      await page.goto("/");
      const form = page.locator(".hv3-form");
      await expect(form.locator("#hv3-name")).toBeVisible();
      await fillValidBirth(page);
      await form.locator("#hv3-name").fill("An Nhiên");
      await expect(page.locator(".hv3-chart-name").first()).toHaveText("An Nhiên");
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

// Desktop fold regressions and the previously unchecked tablet breakpoint are locale-sensitive.
for (const locale of ["vi", "en"] as const) {
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 600, height: 960 },
    { width: 768, height: 1024 },
    { width: 879, height: 1024 },
  ]) {
    test.describe(`homepage ${locale} at ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport });
      test("controls fit horizontally and submit remains reachable", async ({ page }) => {
        await page.goto(locale === "vi" ? "/" : "/en");
        const submit = page.locator('.hv3-form button[type="submit"]');
        await expect(submit).toHaveAttribute("aria-disabled", "false");
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (viewport.width >= 880) {
          const bounds = await submit.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.y).toBeGreaterThanOrEqual(0);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
        }
        const timeField = page.locator(".hv3-field:has(#hv3-time-label)");
        const modes = timeField.locator(".hv3-seg button");
        const exact = await modes.nth(0).boundingBox();
        const range = await modes.nth(1).boundingBox();
        const hour = await page.locator("#hv3-hour").boundingBox();
        expect(exact!.x + exact!.width).toBeLessThanOrEqual(range!.x);
        const overlaps = range!.x < hour!.x + hour!.width && range!.x + range!.width > hour!.x
          && range!.y < hour!.y + hour!.height && range!.y + range!.height > hour!.y;
        expect(overlaps).toBe(false);
        await modes.nth(1).click();
        await expect(modes.nth(1)).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("#hv3-branch")).toBeVisible();
        await modes.nth(0).click();
        await submit.scrollIntoViewIfNeeded();
        await expect(submit).toBeInViewport({ ratio: 1 });
        await submit.click();
        await expect(page.locator(".hv3-form").getByRole("alert")).toHaveCount(3);
        await expect(page.locator("#hv3-day")).toBeFocused();
      });
    });
  }
}

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
