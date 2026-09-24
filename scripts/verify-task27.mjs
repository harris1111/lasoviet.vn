import { chromium } from "@playwright/test";

async function verifyTask27() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const baseUrl = "http://127.0.0.1:63423";

  const tools = [
    { name: "good-days", path: "/ngay-tot", expectedFrom: "xem-ngay" },
    { name: "zodiac", path: "/12-con-giap", expectedFrom: "12-con-giap" },
    { name: "lunar-calendar", path: "/lich-am", expectedFrom: "lich-am" },
    { name: "dream-symbols", path: "/giai-ma-giac-mo", expectedFrom: "giai-mong" },
    { name: "tarot", path: "/boi-bai", expectedFrom: "tarot" },
    { name: "feng-shui", path: "/phong-thuy/huong-nha", expectedFrom: "phong-thuy" },
    { name: "palmistry", path: "/xem-chi-tay", expectedFrom: "xem-chi-tay" },
  ];

  for (const t of tools) {
    console.log(`\n--- Checking tool ${t.name} at ${t.path} ---`);
    await page.goto(`${baseUrl}${t.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const banner = await page.$('[data-testid="free-tool-cross-sell-banner"]');
    if (!banner) {
      throw new Error(`Banner not found on ${t.path}`);
    }

    const fromAttr = await banner.getAttribute("data-from");
    console.log(`Banner found with data-from: ${fromAttr} (expected: ${t.expectedFrom})`);
    if (fromAttr !== t.expectedFrom) {
      throw new Error(`Expected data-from to be ${t.expectedFrom}, got ${fromAttr}`);
    }

    const cta = await page.$('[data-testid="free-tool-cross-sell-cta"]');
    const href = await cta.getAttribute("href");
    console.log(`CTA href: ${href}`);
    const expectedHref = `/tao-la-so/tu-vi?from=${t.expectedFrom}`;
    if (href !== expectedHref) {
      throw new Error(`Expected CTA href ${expectedHref}, got ${href}`);
    }

    const headingText = await banner.$eval(".tool-cross-sell-title", (el) => el.innerText);
    const explanationText = await banner.$eval(".tool-cross-sell-explanation", (el) => el.innerText);
    const wordCount = explanationText.trim().split(/\s+/).length;
    console.log(`Heading: "${headingText}"`);
    console.log(`Explanation (${wordCount} words): "${explanationText}"`);
    if (wordCount > 25) {
      throw new Error(`Explanation exceeds 25 words: ${wordCount}`);
    }
  }

  // Check English route
  console.log("\n--- Checking English route /en/ngay-tot ---");
  await page.goto(`${baseUrl}/en/ngay-tot`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const enBanner = await page.$('[data-testid="free-tool-cross-sell-banner"]');
  const enCta = await page.$('[data-testid="free-tool-cross-sell-cta"]');
  const enHref = await enCta.getAttribute("href");
  console.log(`English CTA href: ${enHref}`);
  if (enHref !== "/en/tao-la-so/tu-vi?from=xem-ngay") {
    throw new Error(`Expected English CTA href /en/tao-la-so/tu-vi?from=xem-ngay, got ${enHref}`);
  }

  // Check mobile viewport
  console.log("\n--- Checking mobile viewport (390px) on /ngay-tot ---");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/ngay-tot`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const mobileBanner = await page.$('[data-testid="free-tool-cross-sell-banner"]');
  const isMobileVisible = await mobileBanner.isVisible();
  console.log(`Mobile banner visible: ${isMobileVisible}`);
  if (!isMobileVisible) {
    throw new Error("Mobile banner not visible");
  }

  // Check clicking CTA navigates to wizard with from param and pre-selected concern
  console.log("\n--- Clicking CTA and verifying navigation to wizard ---");
  await Promise.all([
    page.waitForURL(/tao-la-so\/tu-vi\?from=xem-ngay/),
    page.click('[data-testid="free-tool-cross-sell-cta"]'),
  ]);
  console.log(`Current URL after click: ${page.url()}`);

  await browser.close();
  console.log("\n=== ALL CROSS-SELL SMOKE CHECKS PASSED SUCCESSFULLY ===");
}

verifyTask27().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
