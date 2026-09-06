import { expect, test } from "@playwright/test";

test.describe("admin role administration and audit", () => {
  test.skip(
    !process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE,
    "Requires a real verified admin fixture and private API topology; no production identity is fabricated.",
  );

  test("renders the private audit inspection without sensitive values", async ({ page }) => {
    await page.goto("/en/admin/audit");
    await expect(page.getByRole("heading", { name: "Audit inspection" })).toBeVisible();
    await expect(page.getByText("secret", { exact: false })).toHaveCount(0);
  });
});
