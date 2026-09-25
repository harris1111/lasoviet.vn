import { chromium } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:63423";

async function run() {
  console.log("=== SMOKE TEST TASK #28: KNOWLEDGE HUB & ARTICLE UI (UI-10) ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    // 1. Test /kien-thuc (Knowledge Root Hub)
    console.log("\n[Test 1] Testing Knowledge Root Hub at /kien-thuc...");
    const page = await context.newPage();
    const resRoot = await page.goto(`${BASE_URL}/kien-thuc`, { waitUntil: "domcontentloaded" });
    console.log("HTTP Status /kien-thuc:", resRoot.status());
    if (resRoot.status() !== 200) {
      throw new Error(`Expected HTTP 200 for /kien-thuc, got ${resRoot.status()}`);
    }

    const rootTitle = await page.locator("h1").innerText();
    console.log("Hub H1 Title:", rootTitle);

    // Check breadcrumb
    const breadcrumb = await page.locator(".knowledge-breadcrumb");
    console.log("Breadcrumb visible:", await breadcrumb.isVisible());

    // Check spotlight section (featured card + compact items)
    const featuredCard = page.locator(".knowledge-featured-card");
    console.log("Featured spotlight card visible:", await featuredCard.isVisible());
    const featuredTitle = await featuredCard.locator(".knowledge-featured-title").innerText();
    console.log("Featured title:", featuredTitle);

    const compactItems = page.locator(".knowledge-compact-item");
    const compactCount = await compactItems.count();
    console.log("Compact list items count:", compactCount);

    // Check 5 thematic clusters
    const clusterTitles = await page.locator(".knowledge-cluster-title").allInnerTexts();
    console.log("Thematic clusters found:", clusterTitles);

    // 2. Test /kien-thuc/tu-vi (Pillar Hub)
    console.log("\n[Test 2] Testing Tu Vi Pillar Hub at /kien-thuc/tu-vi...");
    const resPillar = await page.goto(`${BASE_URL}/kien-thuc/tu-vi`, { waitUntil: "domcontentloaded" });
    console.log("HTTP Status /kien-thuc/tu-vi:", resPillar.status());
    if (resPillar.status() !== 200) {
      throw new Error(`Expected HTTP 200 for /kien-thuc/tu-vi, got ${resPillar.status()}`);
    }

    // 3. Test /kien-thuc/tu-vi/la-so-tu-vi-la-gi (Single Article Detail)
    console.log("\n[Test 3] Testing Knowledge Article Detail at /kien-thuc/tu-vi/la-so-tu-vi-la-gi...");
    const resArticle = await page.goto(`${BASE_URL}/kien-thuc/tu-vi/la-so-tu-vi-la-gi`, { waitUntil: "domcontentloaded" });
    console.log("HTTP Status Article:", resArticle.status());
    if (resArticle.status() !== 200) {
      throw new Error(`Expected HTTP 200 for article, got ${resArticle.status()}`);
    }

    const articleH1 = await page.locator("h1.knowledge-article-title").innerText();
    console.log("Article H1:", articleH1);

    const byline = await page.locator(".knowledge-article-meta-bar").innerText();
    console.log("Article metadata bar:", byline);
    if (!byline.includes("Lá Số Việt biên tập")) {
      throw new Error("Missing expected byline 'Lá Số Việt biên tập' in article header");
    }

    const figureVisible = await page.locator(".knowledge-article-figure").isVisible();
    console.log("16:9 featured figure visible:", figureVisible);

    const articleBody = await page.locator(".knowledge-article-body");
    console.log("Article body visible:", await articleBody.isVisible());

    const ctaHeading = await page.locator(".knowledge-article-cta h3").innerText();
    console.log("Bridge CTA heading:", ctaHeading);

    // 4. Test Viewports & Responsive behavior without horizontal overflow
    console.log("\n[Test 4] Testing responsive viewports for overflow...");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      console.log(`Viewport ${width}px overflow: ${overflow}`);
      if (overflow) {
        throw new Error(`Horizontal overflow detected at viewport ${width}px`);
      }
    }

    // 5. Test English locale /en/kien-thuc
    console.log("\n[Test 5] Testing English locale /en/kien-thuc...");
    const resEn = await page.goto(`${BASE_URL}/en/kien-thuc`, { waitUntil: "domcontentloaded" });
    console.log("HTTP Status /en/kien-thuc:", resEn.status());
    if (resEn.status() !== 200) {
      throw new Error(`Expected HTTP 200 for /en/kien-thuc, got ${resEn.status()}`);
    }

    console.log("\nALL SMOKE TESTS FOR TASK #28 PASSED CLEANLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
