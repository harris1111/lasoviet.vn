import { expect, test } from "@playwright/test";

test.describe("Chart result tabs URL navigation & Back/Forward contracts", () => {
  test("canonicalizes invalid query parameters to canonical URL", async ({ page }) => {
    // Attempt navigating with invalid tab parameter
    await page.goto("/la-so/chart-test-noncanonical?tab=invalid_tab&unknown=foo");
    // Should safely redirect to canonical chart URL
    await expect(page).toHaveURL(/\/la-so\/chart-test-noncanonical$/);
  });
});
