import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:63423";

async function run() {
  console.log("=== SMOKE TEST TASK #39: YEARLY, MONTHLY & DAILY HẠN RULES ===");
  console.log(`Target URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Step 1: Create a chart via wizard
  console.log("\n[Step 1] Navigating to /tao-la-so/tu-vi to generate a test chart...");
  await page.goto(`${BASE_URL}/tao-la-so/tu-vi`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  // Fill Step 1: Name and Gender
  const nameInput = page.locator('input[name="name"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill("Phạm Lan Hương");
  }
  const femaleRadio = page.locator('input[name="gender"][value="female"]');
  await femaleRadio.check();
  await page.waitForTimeout(200);

  const continueBtn = page.locator(".wizard-action-continue");
  await continueBtn.click();
  await page.waitForTimeout(500);

  // Fill Step 2: Date & Time
  await page.locator('.birth-date-select--day').selectOption("15");
  await page.locator('.birth-date-select--month').selectOption("06");
  await page.locator('.birth-date-select--year').selectOption("1994");

  const timeInputs = page.locator(".wizard-time-input");
  await timeInputs.nth(0).fill("09");
  await timeInputs.nth(1).fill("30");
  await page.waitForTimeout(200);

  await continueBtn.click();
  await page.waitForTimeout(500);

  // Step 3: Consent & Submit
  const consentCheckbox = page.locator('.wizard-processing-consent input[type="checkbox"]');
  if (await consentCheckbox.isVisible()) {
    await consentCheckbox.check();
  }
  await page.waitForTimeout(200);

  const submitBtn = page.locator(".wizard-action-submit");
  await submitBtn.click();

  console.log("Waiting for navigation to /la-so/*...");
  await page.waitForURL(/\/la-so\//, { timeout: 20000 });
  const chartUrl = page.url();
  console.log(`Chart generated successfully at: ${chartUrl}`);

  // Extract chartId
  const match = chartUrl.match(/\/la-so\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Could not extract chartId from URL: " + chartUrl);
  const chartId = match[1];

  // Step 2: Verify Web UI result tabs and "Năm nay" panel
  console.log("\n[Step 2] Verifying Web UI result tabs and Annual Panel...");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  // Check tab button and badge
  const annualTabBtn = page.locator("#tab-nam-nay");
  const isTabVisible = await annualTabBtn.isVisible();
  if (!isTabVisible) throw new Error("#tab-nam-nay button not found!");

  const tabBadgeText = await annualTabBtn.locator(".tab-count").textContent();
  console.log(`- Tab badge text: "${tabBadgeText?.trim()}"`);
  if (!tabBadgeText?.includes("tháng hạn")) {
    throw new Error(`Expected badge to contain 'tháng hạn', got '${tabBadgeText}'`);
  }

  // Click on "Năm nay" tab
  console.log("Clicking on 'Năm nay' tab...");
  await annualTabBtn.click();
  await page.waitForTimeout(500);

  // Verify panel
  const panel = page.locator("#panel-nam-nay");
  const yearNum = await panel.locator(".year-num").textContent();
  const title = await panel.locator(".panel-title").textContent();
  const sub = await panel.locator(".panel-sub").textContent();
  const summaryLine = await panel.locator(".year-summary-line").textContent();
  console.log(`- Panel Year: ${yearNum?.trim()}`);
  console.log(`- Panel Title: ${title?.trim()}`);
  console.log(`- Panel Subtitle: ${sub?.trim()}`);
  console.log(`- Panel Summary: "${summaryLine?.trim()}"`);

  const monthCards = panel.locator(".month");
  const countCards = await monthCards.count();
  console.log(`- Rendered month cards: ${countCards}`);
  if (countCards !== 12) {
    throw new Error(`Expected 12 month cards in DOM, got ${countCards}`);
  }

  const warnCards = panel.locator(".month.warn");
  const warnCount = await warnCards.count();
  console.log(`- Warn month cards: ${warnCount}`);
  if (warnCount < 1) {
    throw new Error(`Expected at least 1 warn month card, got ${warnCount}`);
  }

  // Verify caution cards display '?'
  for (let i = 0; i < warnCount; i++) {
    const text = await warnCards.nth(i).locator("b").textContent();
    const aria = await warnCards.nth(i).getAttribute("aria-label");
    console.log(`  * Caution card ${i + 1}: display='${text?.trim()}', aria-label='${aria}'`);
    if (text?.trim() !== "?") {
      throw new Error(`Expected warn month card to display '?', got '${text}'`);
    }
    if (!aria?.includes("Tháng hạn, mở để xem")) {
      throw new Error(`Expected caution month aria-label to be 'Tháng hạn, mở để xem', got '${aria}'`);
    }
  }
  console.log("✓ FD-059 DOM Security check: All caution month cards render with '?' and masked label.");

  // Verify offer CTA card
  const offerTitle = await panel.locator(".annual-offer-card h3").textContent();
  const offerCta = await panel.locator(".annual-offer-actions .btn-seal").textContent();
  console.log(`- Offer title: "${offerTitle?.trim()}"`);
  console.log(`- Offer CTA: "${offerCta?.trim()}"`);

  // Verify Today forecast card
  const todayText = await panel.locator(".today-forecast-card").textContent();
  console.log(`- Today Forecast Card: "${todayText?.trim().replace(/\s+/g, " ")}"`);
  if (!todayText?.includes("Hôm nay của bạn")) {
    throw new Error("Expected 'Hôm nay của bạn' card!");
  }

  // Step 3: Test mobile viewport responsiveness
  console.log("\n[Step 3] Testing mobile viewport (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);

  const isPanelVisibleMobile = await panel.isVisible();
  console.log(`- Panel visible on mobile: ${isPanelVisibleMobile}`);
  if (!isPanelVisibleMobile) {
    throw new Error("Annual tab panel not visible on mobile!");
  }

  // Step 4: Test English locale
  console.log("\n[Step 4] Testing English locale /en/la-so/:chartId?tab=nam-nay...");
  await page.goto(`${BASE_URL}/en/la-so/${chartId}?tab=nam-nay`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const enPanel = page.locator("#panel-nam-nay");
  const enTitle = await enPanel.locator(".panel-title").textContent();
  const enOfferCta = await enPanel.locator(".annual-offer-actions .btn-seal").textContent();
  console.log(`- EN Panel Title: ${enTitle?.trim()}`);
  console.log(`- EN Offer CTA: ${enOfferCta?.trim()}`);

  await browser.close();
  console.log("\n=== ALL SMOKE TEST CHECKS PASSED FOR TASK #39 ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
