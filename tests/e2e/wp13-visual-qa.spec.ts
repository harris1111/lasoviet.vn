import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13",
);

const VIETNAMESE_SAMPLE = "Lập lá số. Hiểu vận mệnh. Quyền riêng tư. Luận giải.";

const HOMEPAGE_VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800, isMobile: true },
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "mobile-414", width: 414, height: 896, isMobile: true },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
  { name: "desktop-200pct-equivalent", width: 720, height: 450, isMobile: false },
] as const;

const WIZARD_VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
] as const;

type MetricRecord = {
  screen: string;
  viewport: { name: string; width: number; height: number };
  scrollWidth: number;
  clientWidth: number;
  overflowPass: boolean;
  fontsPass?: boolean;
  fonts?: string[];
  minInteractiveWidth?: number;
  minInteractiveHeight?: number;
  minInteractiveDimension?: number;
  controlsPass?: boolean;
  details?: Record<string, unknown>;
  pass: boolean;
};

const metricsCollector: MetricRecord[] = [];

async function setVietnameseLocale(page: Page) {
  const baseURL = test.info().project.use.baseURL as string;
  const base = new URL(baseURL);
  await page.context().addCookies([
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

async function checkMobileTouchTargets(page: Page) {
  return page.evaluate(() => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>("button, a.button, input, select, summary"),
    );
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const initialVisible = interactive.filter((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < vh &&
        rect.bottom > 0 &&
        rect.left < vw &&
        rect.right > 0 &&
        window.getComputedStyle(el).visibility !== "hidden" &&
        window.getComputedStyle(el).display !== "none"
      );
    });
    const controls = initialVisible.map((el) => {
      const rect = el.getBoundingClientRect();
      const meets = rect.width >= 44 && rect.height >= 44;
      return {
        tag: el.tagName,
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

test.beforeAll(async () => {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
});

test.afterAll(async () => {
  const metricsPath = path.join(ARTIFACTS_DIR, "metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify(metricsCollector, null, 2));
});

test.describe("WP-13 Homepage Visual & Reflow QA", () => {
  for (const vp of HOMEPAGE_VIEWPORTS) {
    test(`homepage at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setVietnameseLocale(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // 1. Validate no horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth,
        };
      });
      expect(overflow.hasOverflow).toBe(false);

      // 2. Validate loaded font faces (UI, display, mono) with Vietnamese sample
      const fontCheck = await page.evaluate(async (sample) => {
        await document.fonts.ready;
        const loadedFamilies = Array.from(document.fonts)
          .filter((f) => f.status === "loaded")
          .map((f) => f.family.replaceAll('"', ""));

        return [
          ["ui", "body"],
          ["display", "h1"],
          ["mono", ".eyebrow"],
        ].map(([role, selector]) => {
          const el = document.querySelector(selector);
          const family = el ? getComputedStyle(el).fontFamily : "";
          const matched = loadedFamilies.find((c) => family.includes(c));
          return {
            role,
            family,
            loaded: matched !== undefined && document.fonts.check('16px "' + matched + '"', sample),
          };
        });
      }, VIETNAMESE_SAMPLE);

      const allFontsLoaded = fontCheck.every((f) => f.loaded);
      for (const f of fontCheck) {
        expect(f.loaded, `Font role ${f.role} (${f.family}) must be loaded with VN glyphs`).toBe(true);
      }

      // 3. Check visible interactive controls touch target size on mobile (both width and height >= 44px)
      let touchCheck: Awaited<ReturnType<typeof checkMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        touchCheck = await checkMobileTouchTargets(page);
        expect(
          touchCheck.failed,
          "All initial interactive controls on mobile must meet 44px touch target (both width and height >= 44px)",
        ).toEqual([]);
      }

      // 4. Save viewport screenshot (not full-page stitched)
      const screenshotPath = path.join(ARTIFACTS_DIR, `homepage-${vp.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      metricsCollector.push({
        screen: `homepage-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        overflowPass: !overflow.hasOverflow,
        fontsPass: allFontsLoaded,
        fonts: fontCheck.map((f) => f.family),
        minInteractiveWidth: vp.isMobile ? touchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? touchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? touchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? touchCheck?.pass : true,
        pass: !overflow.hasOverflow && allFontsLoaded && (vp.isMobile ? (touchCheck?.pass ?? false) : true),
      });
    });
  }
});

test.describe("WP-13 Birth Wizard Visual & Multi-Step QA", () => {
  for (const vp of WIZARD_VIEWPORTS) {
    test(`birth wizard full flow at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setVietnameseLocale(page);

      // Clear any previous cache before starting fresh
      await page.goto("/tao-la-so/tu-vi");
      await page.evaluate(() => localStorage.removeItem("lasoviet:birth-cache:v2"));
      await page.goto("/tao-la-so/tu-vi");
      await page.waitForLoadState("networkidle");

      // --- STEP 1: SUBJECT STEP ---
      await expect(page.getByRole("heading", { name: "Người được lập lá số" })).toBeVisible();

      // Validate no horizontal overflow on step 1
      const overflowStep1 = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflowStep1.scrollWidth).toBeLessThanOrEqual(overflowStep1.clientWidth);

      // Check visible interactive controls touch target size on mobile for Step 1
      let wizardTouchCheck: Awaited<ReturnType<typeof checkMobileTouchTargets>> | undefined;
      if (vp.isMobile) {
        wizardTouchCheck = await checkMobileTouchTargets(page);
        expect(
          wizardTouchCheck.failed,
          "All initial interactive controls on wizard step 1 must meet 44px touch target (both width and height >= 44px)",
        ).toEqual([]);
      }

      // Form labels remain associated with fields
      const maleRadio = page.getByLabel("Nam");
      const femaleRadio = page.getByLabel("Nữ");
      await expect(maleRadio).toBeVisible();
      await expect(femaleRadio).toBeVisible();

      // Keyboard Tab reaches controls in logical order with real visible focus indicator
      const expectedTabSequence = vp.isMobile
        ? [
            { label: "Help link", match: (a: any) => a.tagName === "A" && a.ariaLabel === "Trợ giúp lập lá số" },
            { label: "Name input", match: (a: any) => a.tagName === "INPUT" && a.name === "displayName" },
            { label: "Choice: Self", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Lập cho bản thân") },
            { label: "Choice: Other", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Lập cho người khác") },
            { label: "Gender: Male", match: (a: any) => a.tagName === "INPUT" && a.name === "gender" && a.value === "male" },
            { label: "Continue button", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Tiếp tục") },
          ]
        : [
            { label: "Logo link", match: (a: any) => a.tagName === "A" && a.cls.includes("wizard-logo") },
            { label: "Help link", match: (a: any) => a.tagName === "A" && a.ariaLabel === "Trợ giúp lập lá số" },
            { label: "Exit button", match: (a: any) => a.tagName === "BUTTON" && a.ariaLabel === "Thoát về trang chủ" },
            { label: "Name input", match: (a: any) => a.tagName === "INPUT" && a.name === "displayName" },
            { label: "Choice: Self", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Lập cho bản thân") },
            { label: "Choice: Other", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Lập cho người khác") },
            { label: "Gender: Male", match: (a: any) => a.tagName === "INPUT" && a.name === "gender" && a.value === "male" },
            { label: "Continue button", match: (a: any) => a.tagName === "BUTTON" && a.textContent.includes("Tiếp tục") },
          ];

      for (const step of expectedTabSequence) {
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
            name: el.getAttribute("name"),
            value: el.getAttribute("value"),
            ariaLabel: el.getAttribute("aria-label"),
            textContent: (el.textContent || "").trim(),
            hasOutline,
            hasShadow,
            outlineStyle: s.outlineStyle,
            outlineWidth: s.outlineWidth,
            boxShadow: s.boxShadow,
          };
        });
        expect(active, `Tab must reach a valid active element for ${step.label}`).not.toBeNull();
        expect(step.match(active), `Focused element must match expected control for ${step.label}`).toBe(true);
        expect(
          active?.hasOutline || active?.hasShadow,
          `Focus indicator (outline-style or non-none box-shadow) must be visible on ${step.label}`,
        ).toBe(true);
      }

      // Save viewport screenshot for Step 1
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `wizard-step1-${vp.name}.png`),
        fullPage: false,
      });

      // Select Gender and advance to Step 2
      await maleRadio.check();
      await page.getByRole("button", { name: "Tiếp tục" }).click();

      // --- STEP 2: EXACT-TIME BIRTH STEP ---
      await expect(page.getByRole("heading", { name: "Ngày, giờ sinh & nơi sinh" })).toBeVisible();

      // Validate no horizontal overflow on step 2
      const overflowStep2 = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflowStep2.scrollWidth).toBeLessThanOrEqual(overflowStep2.clientWidth);

      // Save viewport screenshot for Step 2
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `wizard-step2-${vp.name}.png`),
        fullPage: false,
      });

      // Form labels remain associated with fields
      const dayInput = page.getByRole("textbox", { name: "Ngày", exact: true });
      const monthInput = page.getByRole("textbox", { name: "Tháng", exact: true });
      const yearInput = page.getByRole("textbox", { name: "Năm", exact: true });
      await expect(dayInput).toBeVisible();
      await expect(monthInput).toBeVisible();
      await expect(yearInput).toBeVisible();

      // Check calendar button
      await expect(page.getByRole("button", { name: "Chọn ngày từ lịch" })).toBeVisible();

      // TEST: Invalid date error appears at the date field
      await dayInput.fill("32");
      await monthInput.fill("13");
      await yearInput.fill("1990");
      await page.getByRole("button", { name: "Tiếp tục" }).click();

      const dateError = page.locator(".birth-date-fields .form-error");
      await expect(dateError).toBeVisible();
      await expect(dateError).toContainText("Ngày sinh không hợp lệ");

      // Verify page bottom error is NOT shown (error is specifically localized at the date field)
      const pageBottomError = page.locator(".wizard-form > .form-error");
      await expect(pageBottomError).toHaveCount(0);

      // Screenshot invalid date error state
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `wizard-invalid-date-error-${vp.name}.png`),
        fullPage: false,
      });

      // Fix date to valid date
      await dayInput.fill("01");
      await monthInput.fill("01");
      await yearInput.fill("1990");

      // Verify hour/minute inputs when exact time is active
      const hourInput = page.getByLabel("Giờ", { exact: true });
      const minuteInput = page.getByLabel("Phút", { exact: true });
      await expect(hourInput).toBeVisible();
      await expect(minuteInput).toBeVisible();
      await hourInput.fill("09");
      await minuteInput.fill("30");

      // TEST: Reduced-height 390x500 viewport (soft-keyboard pressure)
      if (vp.isMobile) {
        await page.setViewportSize({ width: 390, height: 500 });
        await hourInput.focus();
        await hourInput.scrollIntoViewIfNeeded();
        const hourBox = await hourInput.boundingBox();
        expect(hourBox).not.toBeNull();
        if (hourBox) {
          expect(hourBox.y).toBeGreaterThanOrEqual(0);
          expect(hourBox.y + hourBox.height).toBeLessThanOrEqual(500);
        }

        await minuteInput.focus();
        await minuteInput.scrollIntoViewIfNeeded();
        const minBox = await minuteInput.boundingBox();
        expect(minBox).not.toBeNull();
        if (minBox) {
          expect(minBox.y).toBeGreaterThanOrEqual(0);
          expect(minBox.y + minBox.height).toBeLessThanOrEqual(500);
        }

        // Check sticky mobile actions do not permanently cover the focused field
        const actionsBox = await page.locator(".wizard-actions").boundingBox();
        if (actionsBox && minBox) {
          expect(minBox.y + minBox.height).toBeLessThanOrEqual(actionsBox.y + 4);
        }

        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, "wizard-soft-keyboard-focus-390x500.png"),
          fullPage: false,
        });

        // Restore viewport size
        await page.setViewportSize({ width: vp.width, height: vp.height });
      }

      // Advance to Step 3: Exact-time review
      await page.getByRole("button", { name: "Tiếp tục" }).click();

      // --- STEP 3: EXACT-TIME REVIEW ---
      await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư" })).toBeVisible();
      await expect(page.getByText("Nam", { exact: true })).toBeVisible();
      await expect(page.getByText("01/01/1990")).toBeVisible();
      await expect(page.getByText("09:30")).toBeVisible();

      // Validate submit button text for exact time
      const submitBtn = page.locator(".wizard-actions .wizard-action-submit");
      await expect(submitBtn).toHaveText("Lập lá số");

      // Validate sticky mobile actions do not permanently cover final consent content
      const consentSection = page.locator(".wizard-check").last();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(100);
      const consentBox = await consentSection.boundingBox();
      const actionsBox = await page.locator(".wizard-actions").boundingBox();
      expect(consentBox, "Exact-time consent box must exist").not.toBeNull();
      expect(actionsBox, "Exact-time actions box must exist").not.toBeNull();
      if (actionsBox && consentBox && vp.isMobile) {
        expect(consentBox.y + consentBox.height).toBeLessThanOrEqual(actionsBox.y + 4);
      }

      // Save viewport screenshot for Exact-time Review
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `wizard-review-${vp.name}.png`),
        fullPage: false,
      });

      // TEST: Direct unsubmitted browser refresh safely returns to initial wizard state
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".wizard-page")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Người được lập lá số" })).toBeVisible();

      // Return to step 2 to test unknown time review
      // Navigate to /tao-la-so/tu-vi fresh for unknown time flow
      await page.goto("/tao-la-so/tu-vi");
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Nam").check();
      await page.getByRole("button", { name: "Tiếp tục" }).click();

      // --- STEP 2 to 3: UNKNOWN-TIME FLOW ---
      await dayInput.fill("01");
      await monthInput.fill("01");
      await yearInput.fill("1990");

      // Select "Không rõ giờ sinh"
      await page.getByLabel("Không rõ giờ sinh").check();
      await expect(page.getByLabel("Không rõ giờ sinh")).toBeChecked();

      // Click Tiếp tục to reach Step 3 (Review step for unknown time)
      await page.getByRole("button", { name: "Tiếp tục" }).click();
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: "Kiểm tra & riêng tư" })).toBeVisible();
      await expect(page.getByText("Không rõ giờ sinh")).toBeVisible();

      // Validate submit button is "Lưu hồ sơ"
      await expect(page.locator(".wizard-actions .wizard-action-submit")).toHaveText("Lưu hồ sơ");

      // Validate NO paid text anywhere on the page
      const pageText = await page.evaluate(() => document.body.innerText);
      const paidTerms = [
        "19.000",
        "79.000",
        "19k",
        "79k",
        "thanh toán",
        "nâng cấp trả phí",
        "phí dịch vụ",
        "mua ngay",
        "bản trả phí",
      ];
      const matchedPaidTerms = paidTerms.filter((term) =>
        new RegExp(`\\b${term}\\b`, "i").test(pageText),
      );
      expect(matchedPaidTerms, "Unknown time review step must have no paid text").toEqual([]);

      // Scroll to final consent, require both bounding boxes to exist, assert non-overlap, then capture screenshot
      const unknownConsentSection = page.locator(".wizard-check").last();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(100);
      const unknownConsentBox = await unknownConsentSection.boundingBox();
      const unknownActionsBox = await page.locator(".wizard-actions").boundingBox();
      expect(unknownConsentBox, "Unknown-time review consent box must exist").not.toBeNull();
      expect(unknownActionsBox, "Unknown-time review actions box must exist").not.toBeNull();
      if (unknownActionsBox && unknownConsentBox && vp.isMobile) {
        expect(unknownConsentBox.y + unknownConsentBox.height).toBeLessThanOrEqual(unknownActionsBox.y + 4);
      }

      // Save viewport screenshot for Unknown-time Review (after scrolling to consent)
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `wizard-unknown-review-${vp.name}.png`),
        fullPage: false,
      });

      // TEST: Multi-tab cache reads do not mutate or clear stored birth data
      const sampleCache = {
        version: 2,
        date: "1990-01-01",
        time: { precision: "unknown" },
        gender: "male",
        createdAt: Date.now(),
      };
      await page.evaluate((val) => {
        localStorage.setItem("lasoviet:birth-cache:v2", JSON.stringify(val));
      }, sampleCache);

      const tab1Initial = await page.evaluate(() =>
        localStorage.getItem("lasoviet:birth-cache:v2"),
      );

      // Open second tab in the same context
      const page2 = await page.context().newPage();
      await setVietnameseLocale(page2);
      await page2.goto("/tao-la-so/tu-vi");
      await page2.waitForLoadState("networkidle");

      const tab2Read = await page2.evaluate(() =>
        localStorage.getItem("lasoviet:birth-cache:v2"),
      );
      const tab1After = await page.evaluate(() =>
        localStorage.getItem("lasoviet:birth-cache:v2"),
      );

      expect(tab1After).toBe(tab1Initial);
      expect(tab2Read).toBe(tab1Initial);
      await page2.close();

      metricsCollector.push({
        screen: `wizard-${vp.name}`,
        viewport: { name: vp.name, width: vp.width, height: vp.height },
        scrollWidth: overflowStep1.scrollWidth,
        clientWidth: overflowStep1.clientWidth,
        overflowPass: overflowStep1.scrollWidth <= overflowStep1.clientWidth,
        minInteractiveWidth: vp.isMobile ? wizardTouchCheck?.minWidth : undefined,
        minInteractiveHeight: vp.isMobile ? wizardTouchCheck?.minHeight : undefined,
        minInteractiveDimension: vp.isMobile ? wizardTouchCheck?.minDimension : undefined,
        controlsPass: vp.isMobile ? wizardTouchCheck?.pass : true,
        details: {
          step1Overflow: overflowStep1.scrollWidth <= overflowStep1.clientWidth,
          step2Overflow: overflowStep2.scrollWidth <= overflowStep2.clientWidth,
          dateErrorVisible: true,
          tabOrderVerified: true,
          refreshResetsToStep1: true,
          saveLabelText: "Lưu hồ sơ",
          paidTermsFound: matchedPaidTerms.length,
          exactConsentClearancePass: actionsBox && consentBox ? consentBox.y + consentBox.height <= actionsBox.y + 4 : true,
          unknownConsentClearancePass: unknownActionsBox && unknownConsentBox ? unknownConsentBox.y + unknownConsentBox.height <= unknownActionsBox.y + 4 : true,
        },
        pass: true,
      });
    });
  }
});
