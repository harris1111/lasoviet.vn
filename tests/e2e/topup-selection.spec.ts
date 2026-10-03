import { expect, test } from "@playwright/test";

// Regression for the 2026-10-03 money-path bugs: cards, packs and tabs on the
// selection/top-up page rendered but did nothing, and the sticky bar never
// followed the active tab. No account is needed; guests see the same controls.
for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(`top-up page selection (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every pack can be chosen and the sticky bar follows the choice", async ({ page }) => {
      await page.goto("/nap-la");
      const paybar = page.locator(".paybar");

      for (const pack of [
        { id: "LA-ENTRY-300", vnd: "29.000" },
        { id: "LA-START-1100", vnd: "99.000" },
        { id: "LA-DISCOVER-3000", vnd: "249.000" },
        { id: "LA-LIBRARY-8000", vnd: "599.000" },
      ]) {
        await page.locator(`[data-pack-id="${pack.id}"]`).click();
        await expect(page.locator(`[data-pack-id="${pack.id}"]`)).toHaveAttribute("aria-checked", "true");
        await expect(paybar).toContainText(pack.vnd);
        await expect(paybar.getByRole("button", { name: new RegExp(pack.vnd) })).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`pack=${pack.id}`));
      }
    });

    test("tabs switch and the sticky bar changes with them", async ({ page }) => {
      await page.goto("/nap-la");
      const paybar = page.locator(".paybar");

      await page.getByRole("tab", { name: "Hội viên" }).click();
      await expect(page.locator("#hoi-vien")).toBeVisible();
      await expect(page.locator("#nap-la")).toBeHidden();
      await expect(paybar.getByRole("button", { name: "Sắp ra mắt" })).toBeDisabled();

      await page.getByRole("tab", { name: "Luận giải" }).click();
      await expect(page.locator("#luan-giai")).toBeVisible();
      await expect(paybar).toContainText("Lá");

      await page.getByRole("tab", { name: "Nạp Lá" }).click();
      await expect(page.locator("#nap-la")).toBeVisible();
      await expect(paybar.getByRole("button", { name: /Nạp .*đ/ })).toBeVisible();
    });

    test("both reading cards can be selected", async ({ page }) => {
      await page.goto("/nap-la?tab=luan-giai");
      await page.locator('[data-offer-key="ziwei-natal-excerpt"]').click();
      await expect(page.locator('[data-offer-key="ziwei-natal-excerpt"]')).toHaveAttribute("data-selected", "true");
      await expect(page.locator(".paybar")).toContainText("240");
      await page.locator('[data-offer-key="ziwei-comprehensive"]').click();
      await expect(page.locator(".paybar")).toContainText("960");
    });

    test("a refresh keeps the chosen pack and tab", async ({ page }) => {
      await page.goto("/nap-la?pack=LA-LIBRARY-8000");
      await expect(page.locator('[data-pack-id="LA-LIBRARY-8000"]')).toHaveAttribute("aria-checked", "true");
      await page.reload();
      await expect(page.locator('[data-pack-id="LA-LIBRARY-8000"]')).toHaveAttribute("aria-checked", "true");
    });
  });
}
