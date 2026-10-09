import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

// FD-109: five tabs (Tổng quan, Năm nay, Đại vận, 12 cung, Chủ đề) on one page; the evidence is a row under the tabs and opens a drawer on Tổng quan.
// Tabs, previews and the evidence drawer write ?tab=&open= and Back/Forward restore them without a document load.
test.describe("Free result tabs: URL, Back and Forward (FD-109)", () => {
  test("canonical URLs, tab history, preview and evidence drawer restore client-side", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1280, height: 900 });

    // The private route answers 404 before any query canonicalisation.
    const unauthorized = await page.goto("/la-so/unauthorized-chart-99999?tab=invalid_tab&unknown=foo");
    expect(unauthorized?.status()).toBe(404);

    const chartUrl = await createAnonymousChart(page, "vi");
    const chartPath = new URL(chartUrl).pathname;
    const selected = (id: string) => expect(page.locator(`#tab-${id}`)).toHaveAttribute("aria-selected", "true");

    // Canonicalisation of what the server is handed.
    await page.goto(`${chartPath}?tab=invalid_tab&unknown=foo`);
    await expect(page).toHaveURL(chartUrl);
    await selected("overview");
    await page.goto(`${chartPath}?tab=chart`);
    await expect(page).toHaveURL(chartUrl);
    await page.goto(`${chartPath}?tab=topics&open=non_existent_topic_xyz`);
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await selected("topics");
    await page.goto(`${chartPath}?tab=evidence`);
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await selected("overview");

    // Walk the history on a fresh load. Nothing below may load a document.
    await page.goto(chartPath);
    await selected("overview");
    const documentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests.push(request.url());
    });
    await page.evaluate(() => { (window as unknown as { __fd109NoReload?: boolean }).__fd109NoReload = true; });
    const expectNoDocumentLoad = async () => {
      expect(await page.evaluate(() => (window as unknown as { __fd109NoReload?: boolean }).__fd109NoReload)).toBe(true);
      expect(documentRequests).toEqual([]);
    };
    const dialog = page.getByTestId("fd109-preview-dialog");
    const drawer = page.locator(".evidence-drawer");

    for (const [tab, query] of [["nam-nay", "?tab=nam-nay"], ["decade", "?tab=decade"], ["palaces", "?tab=palaces"], ["topics", "?tab=topics"]] as const) {
      await page.locator(`#tab-${tab}`).click();
      await expect(page).toHaveURL(`${chartPath}${query}`);
      await selected(tab);
    }
    const careerRow = page.locator('[data-topic-id="career_wealth"]');
    await careerRow.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=career_wealth`);
    await expect(dialog).toBeVisible();

    // Back: the preview closes and the row it came from has focus, then each earlier tab in turn.
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(dialog).toBeHidden();
    await expect(careerRow).toBeFocused();
    for (const [tab, query] of [["palaces", "?tab=palaces"], ["decade", "?tab=decade"], ["nam-nay", "?tab=nam-nay"]] as const) {
      await page.goBack();
      await expect(page).toHaveURL(`${chartPath}${query}`);
      await selected(tab);
    }
    await page.goBack();
    await expect(page).toHaveURL(chartUrl);
    await selected("overview");
    await expectNoDocumentLoad();

    // Forward replays the same walk and reopens the preview.
    for (const [tab, query] of [["nam-nay", "?tab=nam-nay"], ["decade", "?tab=decade"], ["palaces", "?tab=palaces"], ["topics", "?tab=topics"]] as const) {
      await page.goForward();
      await expect(page).toHaveURL(`${chartPath}${query}`);
      await selected(tab);
    }
    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=career_wealth`);
    await expect(dialog).toBeVisible();
    await expectNoDocumentLoad();

    // Evidence lives in Tổng quan and is a drawer with its own URL.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.locator("#tab-overview").click();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await page.locator('[data-testid="fd109-evidence-row"] .evidence-open').first().click();
    await expect(page).toHaveURL(`${chartPath}?tab=overview&open=life-palace`);
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".evidence-close")).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await expect(drawer).toBeHidden();
    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=overview&open=life-palace`);
    await expect(drawer).toBeVisible();
    await expectNoDocumentLoad();
  });
});
