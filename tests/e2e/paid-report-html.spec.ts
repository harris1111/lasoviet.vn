import { expect, test } from "@playwright/test";

const ownerStorage = process.env.PLAYWRIGHT_REPORT_OWNER_STORAGE_STATE;
const otherStorage = process.env.PLAYWRIGHT_REPORT_OTHER_STORAGE_STATE;
const pendingId = process.env.PLAYWRIGHT_REPORT_PENDING_ID;
const readyViId = process.env.PLAYWRIGHT_REPORT_READY_VI_ID;
const readyEnId = process.env.PLAYWRIGHT_REPORT_READY_EN_ID;
const failedId = process.env.PLAYWRIGHT_REPORT_FAILED_ID;

const hasRequiredEnv = Boolean(
  ownerStorage &&
  otherStorage &&
  pendingId &&
  readyViId &&
  readyEnId &&
  failedId
);

test.describe("paid report html reader e2e", () => {
  test.skip(!hasRequiredEnv, "Report e2e fixtures are not configured in environment");

  test("signed-out visitor is redirected to login with callbackURL", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/bao-cao/${readyViId}`);
    await expect(page).toHaveURL(new RegExp(`/dang-nhap\\?callbackURL=`));
    await context.close();
  });

  test("cross-owner read produces identical 404 outcome and body as missing report without redirect", async ({ browser }) => {
    const context = await browser.newContext({ storageState: otherStorage });
    const page = await context.newPage();

    const responseCrossOwner = await page.goto(`/bao-cao/${readyViId}`);
    expect(responseCrossOwner?.status()).toBe(404);
    expect(responseCrossOwner?.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe(`/bao-cao/${readyViId}`);
    const crossOwnerBody = await page.locator("main, body").innerText();

    const missingId = "00000000-0000-0000-0000-000000000000";
    const responseMissing = await page.goto(`/bao-cao/${missingId}`);
    expect(responseMissing?.status()).toBe(404);
    expect(responseMissing?.request().redirectedFrom()).toBeNull();
    expect(new URL(page.url()).pathname).toBe(`/bao-cao/${missingId}`);
    const missingBody = await page.locator("main, body").innerText();

    expect(crossOwnerBody.trim()).toBe(missingBody.trim());

    await context.close();
  });

  test("owner reads ready VI report with expanded evidence details, noindex, and canonical disclosure", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerStorage });
    const page = await context.newPage();

    await page.goto(`/bao-cao/${readyViId}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex.*nofollow/);
    await expect(page.getByText("Lá Số Việt dùng công cụ tính toán theo phương pháp và AI để tổ chức, đối chiếu và diễn giải bằng tiếng Việt. Mỗi nhận định quan trọng đều gắn với dữ liệu lá số được sử dụng.")).toBeVisible();

    // Verify wrong-locale URL redirects to canonical locale URL
    await page.goto(`/en/bao-cao/${readyViId}`);
    await expect(page).toHaveURL(`/bao-cao/${readyViId}`);

    // Verify frontispiece image rendered
    const img = page.locator('img[src*="frontispiece-bao-cao-luan-giai-tu-vi.webp"]');
    await expect(img).toBeVisible();

    // Open one adjacent evidence <details> control
    const firstEvidenceDetails = page.locator(".report-evidence-inline-details").first();
    await expect(firstEvidenceDetails).toBeVisible();
    await firstEvidenceDetails.locator("summary").click();

    // Assert the expanded detail shows non-empty fact references, interpretation bounds, confidence, limitations, and allowed action categories
    const spec = firstEvidenceDetails.locator(".report-evidence-spec");
    await expect(spec).toBeVisible();

    // For fact references, interpretation bounds, confidence, limitations, and allowed categories, locate each label's adjacent <dd> and assert non-whitespace content
    const confidenceDd = spec.locator("dt:has-text('Độ tin cậy'), dt:has-text('Confidence')").locator("+ dd");
    await expect(confidenceDd).toBeVisible();
    expect(await confidenceDd.innerText()).toMatch(/\S+/);

    const boundsDd = spec.locator("dt:has-text('Giới hạn diễn giải'), dt:has-text('Interpretation bounds')").locator("+ dd");
    await expect(boundsDd).toBeVisible();
    expect(await boundsDd.innerText()).toMatch(/\S+/);

    const factsDd = spec.locator("dt:has-text('Trường dữ liệu'), dt:has-text('Evidence fields')").locator("+ dd");
    await expect(factsDd).toBeVisible();
    expect(await factsDd.innerText()).toMatch(/\S+/);

    const actionsDd = spec.locator("dt:has-text('Điều có thể quan sát'), dt:has-text('Observable actions')").locator("+ dd");
    await expect(actionsDd).toBeVisible();
    expect(await actionsDd.innerText()).toMatch(/\S+/);

    const limitsDd = spec
      .locator("dt")
      .filter({ hasText: /^\s*(Giới hạn|Limitations)\s*$/ })
      .locator("+ dd");
    await expect(limitsDd).toBeVisible();
    expect(await limitsDd.innerText()).toMatch(/\S+/);

    await context.close();
  });

  test("owner reads ready EN report with authoritative English locale", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerStorage });
    const page = await context.newPage();

    await page.goto(`/bao-cao/${readyEnId}`);
    await expect(page).toHaveURL(`/en/bao-cao/${readyEnId}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex.*nofollow/);

    await context.close();
  });

  test("owner reads pending report and observes automatic refresh to ready reader without losing route", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerStorage });
    const page = await context.newPage();

    await page.goto(`/bao-cao/${pendingId}`);
    await expect(page.locator('[role="status"]')).toBeVisible();

    // Assert only .report-reader-root, then compare exact final pathname with /bao-cao/${pendingId}
    await expect(page.locator(".report-reader-root")).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(`/bao-cao/${pendingId}`);

    await context.close();
  });

  test("owner reads failed report and observes safe error state with no refresh requests", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerStorage });
    const page = await context.newPage();

    let requestCount = 0;
    page.on("request", (req) => {
      if (req.url().includes(`/bao-cao/${failedId}`)) {
        requestCount++;
      }
    });

    await page.goto(`/bao-cao/${failedId}`);
    await expect(page.locator('.report-progress-failed[role="alert"]')).toBeVisible();
    await expect(page.locator("body")).not.toContainText("lastErrorCode");
    await expect(page.locator("body")).not.toContainText("AI_TIMEOUT");

    const initialRequests = requestCount;
    // Wait longer than REPORT_VIEW_REFRESH_MS (5000ms)
    await page.waitForTimeout(6000);
    expect(requestCount).toBe(initialRequests);

    await context.close();
  });

  test("mobile TOC dialog manages keyboard focus lifecycle on open, select, and close", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: ownerStorage,
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto(`/bao-cao/${readyViId}`);
    const opener = page.locator(".report-mobile-toc-btn");
    await expect(opener).toBeVisible();

    await opener.click();
    const dialog = page.locator('.report-mobile-toc-dialog[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify initial focus moves inside dialog
    const closeBtn = dialog.locator(".report-mobile-toc-close");
    await expect(closeBtn).toBeFocused();

    // Select an item in mobile TOC
    const secondItem = dialog.locator(".report-mobile-toc-item").nth(1);
    await secondItem.click();

    // Dialog closes
    await expect(dialog).toBeHidden();

    // Focus restored to opener
    await expect(opener).toBeFocused();

    await context.close();
  });
});
