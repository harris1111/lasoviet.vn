import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test.describe("Chart result tabs URL navigation & Back/Forward contracts", () => {
  test("creates an authorized chart and tests tab/topic/evidence URL and Back/Forward history hydration", async ({
    page,
  }) => {
    // 1. Verify private route returns 404 for unauthorized chart request before canonicalization
    const unauthorizedRes = await page.goto("/la-so/unauthorized-chart-99999?tab=invalid_tab&unknown=foo");
    expect(unauthorizedRes?.status()).toBe(404);

    // 2. Create real authorized anonymous chart via canonical helper
    const chartUrl = await createAnonymousChart(page, "vi");
    const chartUrlObj = new URL(chartUrl);
    const chartPath = chartUrlObj.pathname;

    // 3. Canonicalizes non-canonical query params on authorized chart URL
    await page.goto(`${chartPath}?tab=invalid_tab&unknown=foo`);
    await expect(page).toHaveURL(chartUrl);
    const chartTab = page.locator("#tab-chart");
    await expect(chartTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-chart")).toBeVisible();

    // Canonicalizes invalid child open state for tab
    await page.goto(`${chartPath}?tab=topics&open=non_existent_topic_xyz`);
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    const topicsTab = page.locator("#tab-topics");
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-topics")).toBeVisible();

    // 4. Tab navigation pushes URL history and updates aria-selected & panel UI
    // Click Overview tab
    const overviewTab = page.locator("#tab-overview");
    await overviewTab.click();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await expect(overviewTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-overview")).toBeVisible();

    // Click Topics tab
    await topicsTab.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-topics")).toBeVisible();

    // Open Topic outline (Life palace topic)
    const lifeTopicBtn = page.getByRole("button", { name: "Xem cấu trúc chủ đề" }).first();
    await lifeTopicBtn.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);
    await expect(page.getByText("Cấu trúc nội dung chủ đề: Cung Mệnh")).toBeVisible();

    // Click Evidence tab
    const evidenceTab = page.locator("#tab-evidence");
    await evidenceTab.click();
    await expect(page).toHaveURL(`${chartPath}?tab=evidence`);
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-evidence")).toBeVisible();

    // Open Evidence child drawer
    const openEvidenceBtn = page.locator("#panel-evidence .evidence-open").first();
    await openEvidenceBtn.click();
    await expect(page).toHaveURL(new RegExp(`${chartPath}\\?tab=evidence&open=[a-z0-9-]+`));
    const evidenceDrawer = page.locator(".evidence-drawer");
    await expect(evidenceDrawer).toBeVisible();

    // 5. Test browser Back button history traversal with both URL and UI panel assertions
    // Back -> returns to Evidence tab with drawer closed
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=evidence`);
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await expect(evidenceDrawer).toBeHidden();

    // Back -> returns to Topics tab with open=life
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cấu trúc nội dung chủ đề: Cung Mệnh")).toBeVisible();

    // Back -> returns to Topics tab without open (closed preview)
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cấu trúc nội dung chủ đề: Cung Mệnh")).toBeHidden();

    // Back -> returns to Overview tab
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await expect(overviewTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-overview")).toBeVisible();

    // Back -> returns to default chart URL
    await page.goBack();
    await expect(page).toHaveURL(chartUrl);
    await expect(chartTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-chart")).toBeVisible();

    // 6. Test browser Forward button history traversal
    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await expect(overviewTab).toHaveAttribute("aria-selected", "true");

    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");

    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);
    await expect(topicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Cấu trúc nội dung chủ đề: Cung Mệnh")).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=evidence`);
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-evidence")).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${chartPath}\\?tab=evidence&open=[a-z0-9-]+`));
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await expect(evidenceDrawer).toBeVisible();
  });
});
