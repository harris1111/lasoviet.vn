import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// Phase 7 measurements for the free-result and purchase-page revamp. It asserts the hard rules and
// writes everything it measures to test-results/revamp-acceptance/*.json for the acceptance page.
const OUT = process.env.REVAMP_ACCEPTANCE_OUT ?? "test-results/revamp-acceptance";
const WIDTHS = [360, 390, 430, 1024, 1280, 1440];
const MONEY = /\d[\d.,]*\s*(?:₫|đ(?![\p{L}])|VND(?![\p{L}])|VNĐ(?![\p{L}]))/u;

async function measure(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${(el as HTMLElement).className && typeof (el as HTMLElement).className === "string" ? "." + (el as HTMLElement).className.split(" ")[0] : ""} "${(el.textContent ?? "").trim().slice(0, 28)}"`;
    const targets = [...document.querySelectorAll("main button, main a[href], main [role=tab], main summary, main input, main select, header button, header a[href]")]
      .filter(visible).filter((el) => !el.closest("p, li > span") || el.tagName !== "A");
    const small = targets.filter((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; });
    const tiny = [...document.querySelectorAll("main *")].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 2) && parseFloat(getComputedStyle(el).fontSize) < 12);
    const lcp = new Promise<number>((resolve) => {
      let value = 0; try { new PerformanceObserver((list) => { for (const e of list.getEntries()) value = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* unsupported */ }
      setTimeout(() => resolve(Math.round(value)), 400);
    });
    return lcp.then((lcpMs) => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      targets: targets.length, smallTargets: small.length, smallSamples: small.slice(0, 6).map((el) => `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
      tinyText: tiny.length, tinySamples: tiny.slice(0, 4).map(label), lcpMs,
      // On the offer page only the ladder is the "body"; the top-up tab legitimately lists pack prices in đồng.
      bodyText: (document.querySelector('[data-testid="offer-ladder"]') ?? document.querySelector("main"))?.textContent?.slice(0, 200000) ?? "",
    }));
  });
}

test("revamp acceptance measurements", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown>[] = [];
  await page.setViewportSize({ width: 1440, height: 900 });
  const chartUrl = new URL(await createAnonymousChart(page, "vi"));
  const pages = [
    { name: "la-so", path: chartUrl.pathname },
    { name: "chon-luan-giai", path: `${chartUrl.pathname}/chon-luan-giai` },
  ];
  for (const target of pages) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(target.path); await page.waitForLoadState("load");
      await expect(page.locator("main")).toBeVisible();
      const m = await measure(page);
      const { bodyText, ...rest } = m;
      expect(m.overflow, `${target.name}@${width} must not scroll sideways`).toBe(false);
      const priceInBody = MONEY.test(bodyText);
      expect(priceInBody, `${target.name}@${width} must not show đồng`).toBe(false);
      if (target.name === "chon-luan-giai") expect(bodyText).not.toContain("Sắp mở");
      const formulaInBody = target.name === "la-so" && /đóng góp \d+ điểm|phần chiếu \d+|trọng số/u.test(bodyText);
      report.push({ page: target.name, width, ...rest, vndInBody: priceInBody, formulaNumbersInBody: formulaInBody });
    }
    for (const [width, theme] of [[390, "dark"], [390, "light"], [1440, "dark"], [1440, "light"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(target.path);
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${target.name}-${width}-${theme}.png`, fullPage: false });
    }
  }
  // Keyboard: arrow keys move across the five tabs on desktop.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(chartUrl.pathname);
  await page.locator("#tab-overview").focus();
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) { seen.push(await page.evaluate(() => document.activeElement?.id ?? "")); await page.keyboard.press("ArrowRight"); }
  report.push({ keyboardTabOrder: seen });
  writeFileSync(`${OUT}/measurements.json`, JSON.stringify(report, null, 2));
  testInfo.annotations.push({ type: "output", description: OUT });
  expect(seen).toEqual(["tab-overview", "tab-nam-nay", "tab-decade", "tab-palaces", "tab-topics"]);
});
