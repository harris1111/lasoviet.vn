import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13",
);

const MANIFEST_PATH = path.join(ARTIFACTS_DIR, "fixture-manifest.json");

type Manifest = {
  user: { id: string; email: string; name: string };
  session: { cookieName: string; cookieValue: string };
  routes: {
    account: string;
    reports: string;
    orders: string;
    checkoutPending: string;
    checkoutPaid: string;
    checkoutExpired: string;
    checkoutFailed: string;
    checkoutRefunded: string;
    reportPending: string;
    reportTerminalFailure: string;
  };
  ids: {
    orderPendingId: string;
    orderPaidNoReportId: string;
    orderExpiredId: string;
    orderFailedId: string;
    orderRefundedId: string;
    reportPendingId: string;
    reportTerminalFailureId: string;
  };
};

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}. Run seed script first.`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
}

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
] as const;

type MetricRecord = {
  screen: string;
  viewport: { name: string; width: number; height: number };
  scrollWidth: number;
  clientWidth: number;
  overflowPass: boolean;
  minInteractiveWidth?: number;
  minInteractiveHeight?: number;
  minInteractiveDimension?: number;
  controlsPass?: boolean;
  details?: Record<string, unknown>;
  pass: boolean;
};

function recordMetric(metric: MetricRecord) {
  const metricsPath = path.join(ARTIFACTS_DIR, "metrics.json");
  let records: MetricRecord[] = [];
  if (fs.existsSync(metricsPath)) {
    try {
      records = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));
    } catch {}
  }
  const idx = records.findIndex((r) => r.screen === metric.screen);
  if (idx >= 0) {
    records[idx] = metric;
  } else {
    records.push(metric);
  }
  fs.writeFileSync(metricsPath, JSON.stringify(records, null, 2));
}

async function setAuthenticatedSession(page: Page, manifest: Manifest) {
  const baseURL = (test.info().project.use.baseURL as string) || "http://127.0.0.1:3011";
  const base = new URL(baseURL);
  await page.context().addCookies([
    {
      name: manifest.session.cookieName,
      value: manifest.session.cookieValue,
      url: new URL("/", base).toString(),
    },
    {
      name: "NEXT_LOCALE",
      value: "vi",
      url: new URL("/", base).toString(),
    },
  ]);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "vi-VN,vi;q=0.9",
  });
}

async function checkAllDocumentMobileTouchTargets(page: Page) {
  return page.evaluate(() => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>("button, a, input, select, summary"),
    );
    const visible = interactive.filter((el) => {
      const rect = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        s.visibility !== "hidden" &&
        s.display !== "none" &&
        s.opacity !== "0"
      );
    });
    const controls = visible.map((el) => {
      const rect = el.getBoundingClientRect();
      const meets = rect.width >= 44 && rect.height >= 44;
      return {
        tag: el.tagName,
        cls: el.className,
        text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        meets44: meets,
      };
    });
    const failed = controls.filter((c) => !c.meets44);
    const minWidth = controls.length > 0 ? Math.min(...controls.map((c) => c.width)) : 44;
    const minHeight = controls.length > 0 ? Math.min(...controls.map((c) => c.height)) : 44;
    return {
      controls,
      failed,
      minWidth,
      minHeight,
      minDimension: Math.min(minWidth, minHeight),
      pass: failed.length === 0,
    };
  });
}

async function assertCopyAndUrlSafety(page: Page, forbiddenInternalIds: string[] = []) {
  const currentUrl = page.url();
  expect(currentUrl).not.toContain("ZIWEI-");

  const pageText = await page.evaluate(() => document.body.innerText);
  expect(pageText).not.toContain("ZIWEI-");

  const rawCodes = ["terminal_failure", "retryable_failure", "html_ready", "pdf_pending"];
  for (const raw of rawCodes) {
    expect(pageText).not.toContain(raw);
  }

  const providers = ["openai", "open-router", "gpt-4o"];
  for (const p of providers) {
    const re = new RegExp(`\\b${p}\\b`, "i");
    expect(re.test(pageText)).toBe(false);
  }

  for (const id of forbiddenInternalIds) {
    if (id && id.length > 8) {
      expect(pageText).not.toContain(id);
      expect(currentUrl).not.toContain(id);
    }
  }
}

type TabAssertionStep = {
  label: string;
  match: (el: {
    tagName: string;
    cls: string;
    href: string | null;
    ariaLabel: string | null;
    textContent: string;
  }) => boolean;
};

async function verifyDeterministicTabSequence(
  page: Page,
  sequence: TabAssertionStep[],
) {
  const verifiedSteps: string[] = [];
  for (const step of sequence) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = window.getComputedStyle(el);
      const hasOutline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      const hasShadow = s.boxShadow !== "none" && !s.boxShadow.includes("0px 0px 0px 0px");
      return {
        tagName: el.tagName,
        cls: el.className,
        href: el.getAttribute("href"),
        ariaLabel: el.getAttribute("aria-label"),
        textContent: (el.textContent || "").trim(),
        hasOutline,
        hasShadow,
        outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth,
        boxShadow: s.boxShadow,
      };
    });
    expect(active, `Tab must reach non-null active control for ${step.label}`).not.toBeNull();
    expect(step.match(active!), `Focused control must match expected element for ${step.label}`).toBe(true);
    expect(
      active!.hasOutline || active!.hasShadow,
      `Visible focus indicator (outline or box-shadow) required on ${step.label}`,
    ).toBe(true);
    verifiedSteps.push(step.label);
  }
  return verifiedSteps;
}

async function verifyNoStickyOverlap(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);

  const overlapInfo = await page.evaluate(() => {
    const fixedSticky = Array.from(document.querySelectorAll<HTMLElement>("*")).filter((el) => {
      const s = window.getComputedStyle(el);
      return (
        (s.position === "fixed" || s.position === "sticky") &&
        el.clientHeight > 0 &&
        el.clientWidth > 0
      );
    });
    if (fixedSticky.length === 0) return { hasOverlap: false };

    const content = document.querySelector("main, .account-shell-content, .report-progress-card");
    if (!content) return { hasOverlap: false };
    const contentRect = content.getBoundingClientRect();

    for (const fsEl of fixedSticky) {
      const fsRect = fsEl.getBoundingClientRect();
      if (fsRect.top > 0 && fsRect.bottom >= window.innerHeight - 5) {
        if (contentRect.bottom > fsRect.top + 4) {
          return { hasOverlap: true, sticky: fsEl.className };
        }
      }
    }
    return { hasOverlap: false };
  });

  expect(overlapInfo.hasOverlap).toBe(false);

  // Safely restore scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
}

test.describe("WP-13 Authenticated Visual QA: Account & Commerce Flows", () => {
  let manifest: Manifest;

  test.beforeAll(() => {
    manifest = loadManifest();
  });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/commerce/orders/*/status", async (route) => {
      await route.continue();
    });
  });

  // 1. Account Overview (/tai-khoan)
  for (const vp of VIEWPORTS) {
    test(`account overview at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.account);
      await page.waitForLoadState("networkidle");

      // Semantic markers
      await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
      const latestSection = page.locator(".account-latest-section");
      await expect(latestSection).toBeVisible();
      await expect(latestSection.getByText("Báo cáo gần nhất")).toBeVisible();
      await expect(page.getByRole("link", { name: "Đọc tiếp" })).toBeVisible();
      await expect(page.getByText("Báo cáo gần đây")).toBeVisible();
      await expect(page.getByText("Đơn hàng gần đây")).toBeVisible();

      // No horizontal overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      // Strict all-document mobile touch targets
      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      // Copy safety
      await assertCopyAndUrlSafety(page, [
        "71000000-0000-4000-8000-000000000001",
        "71000000-0000-4000-8000-000000000002",
      ]);

      // Ensure scroll is at top for primary screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `account-overview-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Deterministic Tab focus sequence
      const tabSequence: TabAssertionStep[] = [
        { label: "Tab: Tổng quan", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan") === true },
        { label: "Tab: Báo cáo", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/bao-cao") === true },
        { label: "Tab: Đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/don-hang") === true },
        { label: "Action: Đọc tiếp", match: (el) => el.tagName === "A" && el.cls.includes("button-primary") && el.textContent.includes("Đọc tiếp") },
        { label: "Link: Xem tất cả", match: (el) => el.tagName === "A" && el.cls.includes("account-section-link") && el.textContent.includes("Xem tất cả") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      // Verify no sticky overlap at page bottom
      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `account-overview-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 2. Account Reports Library (/tai-khoan/bao-cao)
  for (const vp of VIEWPORTS) {
    test(`report library grouped by profile at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.reports);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
      const groups = page.locator(".account-library-group");
      await expect(groups).toHaveCount(2);

      await expect(page.getByRole("heading", { name: "Nguyễn Văn An" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Nguyễn Minh Châu" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Đọc báo cáo" }).first()).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `account-reports-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Tab: Tổng quan", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan") === true },
        { label: "Tab: Báo cáo", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/bao-cao") === true },
        { label: "Tab: Đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/don-hang") === true },
        { label: "Action: Đọc báo cáo", match: (el) => el.tagName === "A" && el.cls.includes("button-small") && el.textContent.includes("Đọc báo cáo") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `account-reports-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 3. Order History (/tai-khoan/don-hang)
  for (const vp of VIEWPORTS) {
    test(`order history with all states at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.orders);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Lịch sử đơn hàng" })).toBeVisible();

      await expect(page.getByText("Đã thanh toán").first()).toBeVisible();
      await expect(page.getByText("Đang chờ thanh toán")).toBeVisible();
      await expect(page.getByText("Hết hạn")).toBeVisible();
      await expect(page.getByText("Thất bại")).toBeVisible();
      await expect(page.getByText("Đã hoàn tiền").first()).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `account-orders-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Tab: Tổng quan", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan") === true },
        { label: "Tab: Báo cáo", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/bao-cao") === true },
        { label: "Tab: Đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("account-tab-link") && el.href?.endsWith("/tai-khoan/don-hang") === true },
        { label: "Action: Hỗ trợ", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Hỗ trợ") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `account-orders-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 4. Checkout Pending state (/thanh-toan/:orderId)
  for (const vp of VIEWPORTS) {
    test(`checkout pending with VietQR instructions at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.checkoutPending);
      await page.waitForLoadState("networkidle");

      const checkoutCard = page.locator("[data-checkout-status=\"pending\"]");
      await expect(checkoutCard).toBeVisible();
      await expect(page.locator(".vietqr-status")).toContainText("Đang chờ thanh toán");
      await expect(page.locator(".vietqr-instructions")).toBeVisible();
      await expect(page.locator("figure.vietqr-figure")).toBeVisible();
      await expect(page.locator(".payment-self-claim-section")).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `checkout-pending-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Copy: Số tài khoản", match: (el) => el.tagName === "BUTTON" && el.cls.includes("vietqr-copy-button") && el.ariaLabel === "Sao chép số tài khoản" },
        { label: "Copy: Số tiền", match: (el) => el.tagName === "BUTTON" && el.cls.includes("vietqr-copy-button") && el.ariaLabel === "Sao chép số tiền" },
        { label: "Copy: Nội dung", match: (el) => el.tagName === "BUTTON" && el.cls.includes("vietqr-copy-button") && el.ariaLabel === "Sao chép nội dung chuyển khoản" },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `checkout-pending-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 5. Checkout Paid state (/thanh-toan/:orderId)
  for (const vp of VIEWPORTS) {
    test(`checkout paid without reportId at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.checkoutPaid);
      await page.waitForLoadState("networkidle");

      const checkoutCard = page.locator("[data-checkout-status=\"paid\"]");
      await expect(checkoutCard).toBeVisible();
      await expect(page.locator(".vietqr-status")).toContainText("Đã thanh toán");
      await expect(page.getByRole("heading", { name: "Đã nhận thanh toán thành công" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `checkout-paid-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Xem lịch sử đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Xem lịch sử đơn hàng") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `checkout-paid-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 6. Checkout Expired state (/thanh-toan/:orderId)
  for (const vp of VIEWPORTS) {
    test(`checkout expired at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.checkoutExpired);
      await page.waitForLoadState("networkidle");

      const checkoutCard = page.locator("[data-checkout-status=\"expired\"]");
      await expect(checkoutCard).toBeVisible();
      await expect(page.locator(".vietqr-status")).toContainText("Đơn đã hết hạn");
      await expect(page.getByRole("heading", { name: "Đơn hàng đã hết hạn thanh toán" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `checkout-expired-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Lập lá số mới", match: (el) => el.tagName === "A" && el.cls.includes("button-primary") && el.textContent.includes("Lập lá số") },
        { label: "Action: Xem lịch sử đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Xem lịch sử đơn hàng") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `checkout-expired-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 7. Checkout Failed state (/thanh-toan/:orderId)
  for (const vp of VIEWPORTS) {
    test(`checkout failed at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.checkoutFailed);
      await page.waitForLoadState("networkidle");

      const checkoutCard = page.locator("[data-checkout-status=\"failed\"]");
      await expect(checkoutCard).toBeVisible();
      await expect(page.locator(".vietqr-status")).toContainText("Thanh toán chưa thành công");
      await expect(page.getByRole("heading", { name: "Thanh toán chưa thành công" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `checkout-failed-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Xem lịch sử đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("button-primary") && el.textContent.includes("Xem lịch sử đơn hàng") },
        { label: "Action: Liên hệ hỗ trợ", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Liên hệ hỗ trợ") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `checkout-failed-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 8. Checkout Refunded state (/thanh-toan/:orderId)
  for (const vp of VIEWPORTS) {
    test(`checkout refunded at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.checkoutRefunded);
      await page.waitForLoadState("networkidle");

      const checkoutCard = page.locator("[data-checkout-status=\"refunded\"]");
      await expect(checkoutCard).toBeVisible();
      await expect(page.locator(".vietqr-status")).toContainText("Đã hoàn tiền");
      await expect(page.getByRole("heading", { name: "Đơn hàng đã được hoàn tiền" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `checkout-refunded-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Xem lịch sử đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Xem lịch sử đơn hàng") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `checkout-refunded-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 9. Report Pending state (/bao-cao/:reportId)
  for (const vp of VIEWPORTS) {
    test(`report pending progress at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.reportPending);
      await page.waitForLoadState("networkidle");

      const statusRole = page.locator("[role=\"status\"].report-progress-pending");
      await expect(statusRole).toBeVisible();
      await expect(page.getByRole("heading", { name: "Báo cáo đang được xử lý" })).toBeVisible();
      await expect(page.locator(".report-progress-indicator")).toBeVisible();
      await expect(page.getByRole("link", { name: "Xem danh sách báo cáo" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page, ["71000000-0000-4000-8000-000000000008"]);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `report-pending-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Xem danh sách báo cáo", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Xem danh sách báo cáo") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `report-pending-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }

  // 10. Report Terminal Failure recovery state (/bao-cao/:reportId)
  for (const vp of VIEWPORTS) {
    test(`report terminal failure recovery at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setAuthenticatedSession(page, manifest);
      await page.goto(manifest.routes.reportTerminalFailure);
      await page.waitForLoadState("networkidle");

      const alertRole = page.locator("[role=\"alert\"].report-progress-failed");
      await expect(alertRole).toBeVisible();
      await expect(page.getByRole("heading", { name: "Chưa thể hoàn tất báo cáo" })).toBeVisible();

      await expect(page.locator(".report-failed-facts")).toBeVisible();
      await expect(page.getByText("LSV-20260909-009").first()).toBeVisible();

      await expect(page.getByRole("link", { name: "Liên hệ hỗ trợ" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Xem lịch sử đơn hàng" })).toBeVisible();

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      let touchCheck: Awaited<ReturnType<typeof checkAllDocumentMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkAllDocumentMobileTouchTargets(page);
        expect(touchCheck.failed).toEqual([]);
      }

      await assertCopyAndUrlSafety(page, ["71000000-0000-4000-8000-000000000009"]);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);

      const screenshotPath = path.join(ARTIFACTS_DIR, `report-terminal-failure-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const tabSequence: TabAssertionStep[] = [
        { label: "Action: Liên hệ hỗ trợ", match: (el) => el.tagName === "A" && el.cls.includes("button-primary") && el.textContent.includes("Liên hệ hỗ trợ") },
        { label: "Action: Xem lịch sử đơn hàng", match: (el) => el.tagName === "A" && el.cls.includes("button-secondary") && el.textContent.includes("Xem lịch sử đơn hàng") },
      ];
      const verifiedFocus = await verifyDeterministicTabSequence(page, tabSequence);

      await verifyNoStickyOverlap(page);

      recordMetric({
        screen: `report-terminal-failure-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: overflow.scrollWidth <= overflow.clientWidth,
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        details: { verifiedFocusSequence: verifiedFocus },
        pass: overflow.scrollWidth <= overflow.clientWidth && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }
});
