import { expect, test } from "@playwright/test";
import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test.describe("Chart result tabs URL navigation & Back/Forward contracts", () => {
  test("creates an authorized chart and tests tab/topic/evidence URL and Back/Forward history hydration", async ({
    page,
  }) => {
    // 1. Create real authorized anonymous chart via canonical helper
    const chartUrl = await createAnonymousChart(page, "vi");
    const chartUrlObj = new URL(chartUrl);
    const chartPath = chartUrlObj.pathname;

    // 2. Canonicalizes non-canonical query params on authorized chart URL
    await page.goto(`${chartPath}?tab=invalid_tab&unknown=foo`);
    await expect(page).toHaveURL(chartUrl);

    // 3. Tab navigation pushes URL history
    // Click Overview tab
    const tablist = page.getByRole("tablist", { name: "Các tầng nội dung lá số" });
    await expect(tablist).toBeVisible();
    await tablist.getByRole("tab", { name: "Tổng quan" }).click();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);

    // Click Topics tab
    await tablist.getByRole("tab", { name: "Chủ đề" }).click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);

    // Open Topic outline (Life palace topic)
    const lifeTopicBtn = page.getByRole("button", { name: "Xem cấu trúc chủ đề" }).first();
    await lifeTopicBtn.click();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);

    // Click Evidence tab
    await tablist.getByRole("tab", { name: "Căn cứ" }).click();
    await expect(page).toHaveURL(`${chartPath}?tab=evidence`);

    // 4. Test browser Back button history traversal
    // Back -> returns to Topics tab with open=life
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics&open=life`);

    // Back -> returns to Topics tab without open
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);

    // Back -> returns to Overview tab
    await page.goBack();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);

    // Back -> returns to default chart URL
    await page.goBack();
    await expect(page).toHaveURL(chartUrl);

    // 5. Test browser Forward button history traversal
    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=overview`);
    await page.goForward();
    await expect(page).toHaveURL(`${chartPath}?tab=topics`);
  });
});
