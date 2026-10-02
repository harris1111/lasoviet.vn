import { expect, test } from "@playwright/test";

for (const locale of ["vi", "en"]) {
  test(`homepage contracts and mobile budget in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(locale === "vi" ? "/" : "/en");
    await expect(page.locator(".tn-compare details")).toHaveCount(0);
    await expect(page.locator(".tn-compare .hv3-compare-mobile")).toBeVisible();
    await expect(page.locator(".tn-faq .hv3-faq-q").first()).toHaveAttribute("aria-expanded", "true");
    const day = page.locator("#hv3-day");
    await expect(day).toBeHidden();
    await page.locator(".tn-hero-start").click();
    await expect(day).toBeVisible();
    await day.fill("12");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(day).toHaveValue("12");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(day).toHaveValue("12");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("carousel advances left, wraps all readers, and pauses for focus and reduced motion", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const carousel = page.locator(".hv3-tt-carousel");
  await carousel.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.runFor(100);
  const names = new Set<string>();
  for (let index = 0; index < 15; index++) {
    names.add(await carousel.locator(".hv3-tt-name").first().innerText());
    let x = 0;
    for (let tick = 0; tick < 140 && x === 0; tick++) {
      await page.clock.runFor(50);
      x = await carousel.locator(".hv3-tt-track").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    }
    expect(await carousel.locator("article").count()).toBeLessThanOrEqual(3);
    expect(x).toBeLessThan(0);
    await page.clock.runFor(700);
  }
  expect(names.size).toBe(15);
  await expect(carousel.locator("article").nth(1)).toHaveAttribute("inert", "");
  const read = carousel.locator(".hv3-tt-read").first();
  await read.focus();
  const name = await carousel.locator(".hv3-tt-name").first().innerText();
  await page.clock.runFor(7000);
  expect(await carousel.locator(".hv3-tt-name").first().innerText()).toBe(name);
  await read.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(10);
  await expect(read).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(7000);
  expect(await carousel.locator(".hv3-tt-name").first().innerText()).toBe(name);
});
