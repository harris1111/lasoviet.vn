import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// The shared header and footer sit on every page: each link and button in them is a real tap target (44px), at every width.
for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  test(`header and footer controls are at least 44px at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    const small = await page.evaluate(() => {
      const visible = (element: Element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none"; };
      return [...document.querySelectorAll("header.site-header a, header.site-header button, header.site-header summary, footer.site-footer a, footer.site-footer button")]
        .filter(visible)
        .filter((element) => { const box = element.getBoundingClientRect(); return box.height < 43.5 || box.width < 43.5; })
        .map((element) => `${element.tagName.toLowerCase()} "${(element.textContent ?? element.getAttribute("aria-label") ?? "").trim().slice(0, 24)}" ${Math.round(element.getBoundingClientRect().width)}x${Math.round(element.getBoundingClientRect().height)}`);
    });
    expect(small).toEqual([]);
  });
}

test("no visible text on the free result is smaller than 12px, and its private-chart link is a tap target", async ({ page }) => {
  test.setTimeout(120000);
  await createAnonymousChart(page, "vi");
  for (const [width, height] of [[390, 844], [1280, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(800);
    const tiny = await page.evaluate(() => {
      const visible = (element: Element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none" && !element.closest("[aria-hidden='true']"); };
      return [...document.querySelectorAll('[data-testid="fd109-free-result"] *')]
        .filter((element) => visible(element) && [...element.childNodes].some((node) => node.nodeType === 3 && (node.textContent ?? "").trim().length > 0) && parseFloat(getComputedStyle(element).fontSize) < 12)
        .map((element) => `${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 20)}" ${getComputedStyle(element).fontSize}`);
    });
    expect(tiny, `text under 12px at ${width}px`).toEqual([]);
    const link = page.locator(".result-privacy-note a").first();
    if (await link.count()) expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
});
