import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// A1: the offer page lays its cards out for desktop (tier rail + two columns, cards capped at 520px) and keeps one column on phones.
test("offer page layout holds from phone to wide desktop", async ({ page }) => {
  test.setTimeout(120000);
  const chartPath = new URL(await createAnonymousChart(page, "vi")).pathname;
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 800], [1280, 900], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`${chartPath}/chon-luan-giai`);
    const ladder = page.getByTestId("offer-ladder");
    await expect(ladder).toBeVisible();
    await expect(ladder.locator("article[data-sku]").first()).toBeVisible();
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-testid="offer-ladder"] article[data-sku]')].map((card) => {
        const box = card.getBoundingClientRect();
        const button = card.querySelector<HTMLElement>("button, a.button")?.getBoundingClientRect();
        return { sku: card.getAttribute("data-sku"), x: Math.round(box.x), width: Math.round(box.width), top: Math.round(box.y + scrollY), tap: Math.round(button?.height ?? 0),
          tier: card.querySelector(".offer-card-tier") ? getComputedStyle(card.querySelector(".offer-card-tier")!).display : "missing",
          ornaments: card.querySelectorAll(".offer-orn").length, ribbon: Boolean(card.querySelector(".offer-ribbon")) };
      });
      const rail = document.querySelector(".offer-ladder-rail");
      return { overflow: document.documentElement.scrollWidth > window.innerWidth, cards, rail: rail ? getComputedStyle(rail).display : "none" };
    });
    expect(layout.overflow, `no horizontal scroll at ${width}px`).toBe(false);
    expect(layout.cards.length).toBeGreaterThanOrEqual(3);
    for (const card of layout.cards) expect(card.tap, `${card.sku} button is a real tap target at ${width}px`).toBeGreaterThanOrEqual(44);

    if (width < 768) {
      expect(layout.rail).toBe("none");
      expect(new Set(layout.cards.map((card) => card.x)).size, "one column on phones").toBe(1);
    } else {
      for (const card of layout.cards) {
        expect(card.width, `${card.sku} never wider than 520px`).toBeLessThanOrEqual(521);
        if (card.sku !== "ZIWEI-IDENTITY-P0") expect(card.tier, "tier printed on the card").toBe("block");
      }
      const columns = new Set(layout.cards.filter((card) => card.sku !== "ZIWEI-IDENTITY-P0").map((card) => card.x));
      expect(columns.size, `two columns at ${width}px`).toBe(2);
      expect(layout.rail).toBe(width >= 1024 ? "block" : "none");
    }
    const lifetime = layout.cards.find((card) => card.sku === "ZIWEI-IDENTITY-P0")!;
    expect(lifetime.ornaments, "lifetime card has its four corner ornaments").toBe(4);
    expect(lifetime.ribbon).toBe(true);
    if (width >= 1024) {
      const rows = layout.cards.filter((card) => card.sku !== "ZIWEI-IDENTITY-P0").map((card) => card.top);
      expect(lifetime.top, "lifetime closes the grid").toBeGreaterThan(Math.max(...rows));
    }
  }
  // The rail jumps to the first card of a tier.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${chartPath}/chon-luan-giai`);
  await page.locator(".offer-ladder-rail a").last().click();
  await expect(page).toHaveURL(/#offer-tier-first-life$/);
  await expect(page.locator("#offer-tier-first-life")).toBeInViewport();
});
