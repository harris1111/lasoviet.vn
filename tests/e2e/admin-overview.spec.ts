import { expect, test } from "@playwright/test";

test.describe("admin overview", () => {
  test.skip(
    !process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE,
    "Requires a real verified admin fixture and private API topology; no production identity is fabricated.",
  );

  test("renders only operational overview fields", async ({ page }) => {
    await page.goto("/en/admin");

    await expect(page.getByRole("heading", { name: "Operations overview" })).toBeVisible();
    await expect(page.getByText("secret", { exact: false })).toHaveCount(0);
  });
});
