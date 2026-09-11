import { expect, test } from "@playwright/test";

import { createAnonymousChart } from "./helpers/create-anonymous-chart";

test.describe("chart sign-in return and callback preservation", () => {
  test("anonymous chart result page and header carry exact callbackURL and preserve chart return", async ({
    page,
  }) => {
    // 1. Create anonymous chart via canonical helper
    const chartUrl = await createAnonymousChart(page, "vi");
    const chartUrlObj = new URL(chartUrl);
    const chartPath = chartUrlObj.pathname;
    const chartId = chartPath.split("/").pop();
    expect(chartId).toBeTruthy();

    const expectedCallback = encodeURIComponent(chartPath);
    const expectedSignInHref = `/dang-nhap?callbackURL=${expectedCallback}`;

    // 2. Verify result-page privacy note CTA carries exact localized link with callback
    const resultCta = page.getByRole("link", { name: "Đăng nhập để lưu lại" });
    await expect(resultCta).toBeVisible();
    await expect(resultCta).toHaveAttribute("href", expectedSignInHref);

    // 3. Verify desktop header sign-in link preserves the exact chart callback
    const headerLoginLink = page.locator(".site-header .login-link");
    await expect(headerLoginLink).toBeVisible();
    await expect(headerLoginLink).toHaveAttribute("href", expectedSignInHref);

    // 4. Mock social sign-in provider boundary without contacting external Google
    await page.route("**/api/auth/sign-in/social", async (route) => {
      const request = route.request();
      expect(request.method()).toBe("POST");

      const payload = request.postDataJSON() as {
        callbackURL?: unknown;
        provider?: unknown;
      };
      expect(payload.provider).toBe("google");
      expect(payload.callbackURL).toBe(chartPath);

      const validatedCallbackURL = payload.callbackURL as string;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: validatedCallbackURL,
          redirect: true,
        }),
      });
    });

    // 5. Navigate to sign-in via result CTA
    await resultCta.click();
    await expect(page).toHaveURL(new RegExp(`/dang-nhap\\?callbackURL=${expectedCallback}`));

    // 6. Trigger mocked Google sign-in
    const googleButton = page.getByRole("button", { name: /Google/i });
    await expect(googleButton).toBeVisible();

    // Trigger sign in and complete mocked navigation back to original chart
    await Promise.all([
      page.waitForURL(chartUrl),
      googleButton.click(),
    ]);

    // 7. Verify chart returns to the same URL with board intact
    await expect(page).toHaveURL(chartUrl);
    await expect(page.getByTestId("ziwei-chart-grid")).toBeVisible();
  });
});
