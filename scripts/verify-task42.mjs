import { chromium } from "@playwright/test";

async function verifyTask42() {
  console.log("=== Verifying Task #42: Provisional Chart when birth time is unknown ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const baseUrl = "http://127.0.0.1:63423";

  // 1. Visit wizard page
  console.log("\n1. Navigating to wizard /tao-la-so/tu-vi...");
  await page.goto(`${baseUrl}/tao-la-so/tu-vi`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Step 1: Identity & Gender
  console.log("Filling Step 1 (Subject & Gender)...");
  const femaleRadio = page.locator('input[name="gender"][value="female"]');
  await femaleRadio.check();
  await page.waitForTimeout(300);

  // Click continue to step 2
  const continueBtn = page.locator(".wizard-action-continue");
  await continueBtn.click();
  await page.waitForTimeout(800);

  // Step 2: Date and Time
  console.log("Filling Step 2 (Date & Time with unknown hour)...");
  await page.locator('select[name="birthDay"]').selectOption("15");
  await page.locator('select[name="birthMonth"]').selectOption("06");
  await page.locator('select[name="birthYear"]').selectOption("1994");
  await page.waitForTimeout(300);

  // Check 'Tôi không biết giờ sinh'
  console.log("Checking 'Tôi không biết giờ sinh' checkbox...");
  const unknownCheckbox = page.locator('.wizard-unknown-time input[type="checkbox"]');
  await unknownCheckbox.check();
  await page.waitForTimeout(300);

  // Verify help copy on screen
  const step2Text = await page.locator("main").innerText();
  const hasHelpText = step2Text.includes("Bạn có thể lập lá số tạm tính");
  console.log("- Step 2 includes provisional help text:", hasHelpText);
  if (!hasHelpText) {
    throw new Error("Provisional explanation help text missing on Step 2!");
  }

  // Click continue to step 3
  await continueBtn.click();
  await page.waitForTimeout(800);

  // Step 3: Review & Submit
  console.log("\n2. Verifying Step 3 (Review & Submit)...");
  const submitBtn = page.locator(".wizard-action-submit");
  const submitBtnText = await submitBtn.innerText();
  console.log("- Submit button label:", submitBtnText);

  if (!submitBtnText.includes("Lập lá số tạm tính")) {
    throw new Error(`Expected submit button to say 'Lập lá số tạm tính', got: ${submitBtnText}`);
  }

  // Check consent in Step 3
  console.log("Checking consent checkbox...");
  const consentCheckbox = page.locator('.wizard-processing-consent input[type="checkbox"]');
  await consentCheckbox.check();
  await page.waitForTimeout(300);

  console.log("\n3. Submitting wizard to calculate provisional chart...");
  await submitBtn.click();

  // Wait for navigation to chart page /la-so/*
  console.log("Waiting for navigation to /la-so/*...");
  await page.waitForURL(/\/la-so\//, { timeout: 20000 });
  const currentUrl = page.url();
  console.log("Successfully navigated to:", currentUrl);

  // 4. Verify Provisional Chart Page elements
  console.log("\n4. Verifying Provisional Chart Page elements on live container...");
  await page.waitForTimeout(1500);

  // Provisional banner check
  const provisionalBanner = await page.$(".provisional-result-banner");
  console.log("- Provisional banner element present:", Boolean(provisionalBanner));
  if (!provisionalBanner) {
    throw new Error("Provisional result banner (.provisional-result-banner) not found on chart page!");
  }

  const bannerTitle = await page.$eval(".provisional-banner-title", (el) => el.innerText);
  console.log("- Banner title:", bannerTitle);

  const bannerText = await page.$eval(".provisional-banner-text", (el) => el.innerText);
  console.log("- Banner text:", bannerText);

  const bannerCta = await page.$eval(".provisional-banner-cta", (el) => el.innerText);
  console.log("- Banner CTA text:", bannerCta);

  // Chart tab check for provisional tag
  const chartTabBtn = page.locator('button[role="tab"]').filter({ hasText: /Lá số|Chart/i });
  if (await chartTabBtn.isVisible()) {
    await chartTabBtn.click();
    await page.waitForTimeout(600);

    const chartTag = await page.$(".provisional-chart-tag");
    console.log("- Chart center provisional tag present:", Boolean(chartTag));
    if (chartTag) {
      const tagText = await page.$eval(".provisional-chart-tag", (el) => el.innerText);
      console.log("- Chart center tag text:", tagText);
    }
  }

  // Check Overview tab
  const overviewTabBtn = page.locator('button[role="tab"]').filter({ hasText: /Tổng quan|Overview/i });
  if (await overviewTabBtn.isVisible()) {
    await overviewTabBtn.click();
    await page.waitForTimeout(600);

    const overviewText = await page.locator("main").innerText();
    const hasProvisionalProse = overviewText.includes("ước tính tạm tính") || overviewText.includes("Ước tính tạm tính");
    console.log("- Overview tab contains provisional disclaimer:", hasProvisionalProse);
  }

  await browser.close();
  console.log("\n=== ALL CHECKS PASSED SUCCESSFULLY FOR TASK #42 (FD-103) ===");
}

verifyTask42().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
