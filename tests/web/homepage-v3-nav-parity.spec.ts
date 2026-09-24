import { expect, test } from "@playwright/test";

const LIVE = process.env.LSV_LIVE_URL ?? "https://lasoviet.net";
const PREVIEW = process.env.LSV_PREVIEW_URL;

type Link = { label: string; target: string };

async function headerSnapshot(page: import("@playwright/test").Page, baseUrl: string, mobile: boolean) {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${baseUrl} must load`).toBeTruthy();
  const header = page.locator("header").first();
  if (mobile) {
    const menu = header.locator(".mobile-menu > summary");
    await expect(menu).toBeVisible();
    await menu.click();
  }
  const nav = header.locator('nav[aria-label="Điều hướng chính"]:visible').first();
  await expect(nav).toBeVisible();
  const links: Link[] = await nav.locator("a").evaluateAll((anchors) =>
    anchors.map((a) => {
      const anchor = a as HTMLAnchorElement;
      const url = new URL(anchor.href);
      return { label: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "", target: url.pathname + url.hash };
    }),
  );
  const actions: Link[] = await header.locator("a:visible").evaluateAll((anchors) =>
    anchors.map((a) => {
      const anchor = a as HTMLAnchorElement;
      const url = new URL(anchor.href);
      return {
        label: anchor.getAttribute("aria-label") ?? anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
        target: url.pathname + url.hash,
      };
    }),
  );
  return { links, actions };
}

test("redesigned homepage retains live desktop and mobile navigation", async ({ page }, testInfo) => {
  test.skip(!PREVIEW, "Set LSV_PREVIEW_URL to the deployed preview before checking navigation parity.");
  for (const mobile of [false, true]) {
    const live = await headerSnapshot(page, LIVE, mobile);
    await page.screenshot({ path: testInfo.outputPath(`nav-live-${mobile ? "mobile" : "desktop"}.png`) });
    const preview = await headerSnapshot(page, PREVIEW!, mobile);
    await page.screenshot({ path: testInfo.outputPath(`nav-preview-${mobile ? "mobile" : "desktop"}.png`) });
    expect(preview.links, `Navigation ${mobile ? "mobile" : "desktop"} must match live labels, order and URLs`).toEqual(live.links);
    expect(preview.actions, `Visible header links and CTA must match live`).toEqual(live.actions);
    for (const link of preview.links) {
      if (link.target.startsWith("/#")) {
        const id = link.target.slice(2);
        await expect(page.locator(`[id="${id}"]`), `Anchor ${link.target} must exist on the new homepage`).toHaveCount(1);
      }
    }
  }
});
