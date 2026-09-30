import { expect, test } from "@playwright/test";

const testCases = [
  {
    locale: "vi",
    path: "/thong-bao/huy-dang-ky",
    confirmButtonText: "Xác nhận hủy đăng ký",
    submittingText: "Đang xử lý...",
    successTitle: "Đã hủy đăng ký thành công",
    errorTitle: "Không thể xử lý yêu cầu",
    noTokenText: "Không tìm thấy mã xác nhận hủy đăng ký hợp lệ.",
    invalidOrExpiredText: "Liên kết hủy đăng ký không hợp lệ hoặc đã hết hạn.",
    homeHref: "/",
  },
  {
    locale: "en",
    path: "/en/thong-bao/huy-dang-ky",
    confirmButtonText: "Confirm unsubscribe",
    submittingText: "Processing...",
    successTitle: "Successfully unsubscribed",
    errorTitle: "Unable to process request",
    noTokenText: "No valid unsubscribe confirmation token was found.",
    invalidOrExpiredText: "The unsubscribe link is invalid or has expired.",
    homeHref: "/en",
  },
] as const;

for (const tc of testCases) {
  test.describe(`${tc.locale} notification unsubscribe page`, () => {
    test("does not send POST on mount, removes hash fragment, renders confirmation, and suppresses duplicate click", async ({
      page,
    }) => {
      let postCount = 0;
      let resolveHeldResponse: (() => void) | undefined;
      const responseHeldPromise = new Promise<void>((resolve) => {
        resolveHeldResponse = resolve;
      });

      // Console collection asserting token is never logged
      const consoleMessages: string[] = [];
      page.on("console", (msg) => consoleMessages.push(msg.text()));

      // Intercept POST endpoint
      await page.route("**/api/notifications/unsubscribe", async (route) => {
        if (route.request().method() === "POST") {
          postCount += 1;
          // Hold the response to test rapid duplicate clicks
          await responseHeldPromise;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true }),
            headers: {
              "cache-control": "no-store",
              "referrer-policy": "no-referrer",
            },
          });
          return;
        }
        await route.continue();
      });

      try {
        // 1. Mount page with token fragment in URL
        const sampleToken = "sample-valid-token-value-12345";
        await page.goto(`${tc.path}#token=${sampleToken}`);

        // 2. GET / mount must NOT send POST
        expect(postCount).toBe(0);

        // 3. Hash must be cleared from address bar without logging
        await expect.poll(async () => {
          return await page.evaluate(() => window.location.hash);
        }).toBe("");
        expect(page.url()).not.toContain("#token=");

        // 4. Confirm button must be visible (guards against React 19 StrictMode duplicate effect wiping token)
        const panelButton = page.locator(".unsubscribe-panel button");
        await expect(panelButton).toBeVisible();
        await expect(panelButton).toHaveText(tc.confirmButtonText);

        // 5. Trigger real DOM clicks on the same resolved element before state changes
        await panelButton.evaluate((btn) => {
          btn.click();
          btn.click();
        });

        // Exactly one POST must be dispatched
        await expect.poll(() => postCount).toBe(1);

        // Submitting button must be disabled and display submitting copy
        await expect(panelButton).toBeDisabled();
        await expect(panelButton).toHaveText(tc.submittingText);

        // 6. Release response and verify success UI
        resolveHeldResponse?.();

        await expect(page.locator(".unsubscribe-panel[role='status']")).toBeVisible();
        await expect(page.getByText(tc.successTitle)).toBeVisible();
        await expect(page.getByRole("link", { name: /trang chủ|home/i })).toHaveAttribute(
          "href",
          tc.homeHref,
        );

        // Verify zero PII and token was never logged to console or rendered on screen
        const bodyText = await page.innerText("body");
        expect(bodyText).not.toContain("user@");
        expect(bodyText).not.toContain(sampleToken);
        expect(consoleMessages.join(" ")).not.toContain(sampleToken);
      } finally {
        resolveHeldResponse?.();
      }
    });

    test("renders uniform error state when server rejects token", async ({ page }) => {
      await page.route("**/api/notifications/unsubscribe", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              ok: false,
              error: { code: "UNSUBSCRIBE_TOKEN_INVALID" },
            }),
            headers: {
              "cache-control": "no-store",
              "referrer-policy": "no-referrer",
            },
          });
          return;
        }
        await route.continue();
      });

      await page.goto(`${tc.path}#token=invalid-or-expired-token`);
      const panelButton = page.locator(".unsubscribe-panel button");
      await expect(panelButton).toBeVisible();

      await panelButton.click();

      // Error alert visible
      await expect(page.locator(".unsubscribe-panel[role='alert']")).toBeVisible();
      await expect(page.getByText(tc.errorTitle)).toBeVisible();
      await expect(page.getByText(tc.invalidOrExpiredText)).toBeVisible();

      const bodyText = await page.innerText("body");
      expect(bodyText).not.toContain("invalid-or-expired-token");
    });

    test("renders no-token alert when visited without fragment", async ({ page }) => {
      await page.goto(tc.path);

      await expect(page.locator(".unsubscribe-panel[role='alert']")).toBeVisible();
      await expect(page.getByText(tc.noTokenText)).toBeVisible();
      await expect(page.locator(".unsubscribe-panel button")).toHaveCount(0);
    });
  });
}
