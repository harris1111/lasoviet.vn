import { chromium } from "@playwright/test";

async function verifyTask24() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("--- 1. Navigating to /bao-cao-mau/tu-vi ---");
  await page.goto("http://127.0.0.1:63423/bao-cao-mau/tu-vi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const pageText = await page.innerText("body");

  // Check Hero elements
  const hasEyebrow = pageText.includes("Bản luận giải mẫu");
  const hasStamp = pageText.includes("BẢN\nMẪU") || pageText.includes("BẢN MẪU");
  const hasByline = pageText.includes("Lá Số Việt biên tập");
  const hasBirthInfo = pageText.includes("15/06/1992") && pageText.includes("Hà Nội");

  console.log("Hero checks:", { hasEyebrow, hasStamp, hasByline, hasBirthInfo });
  if (!hasEyebrow || !hasByline || !hasBirthInfo) {
    throw new Error("Hero validation failed!");
  }

  // Check absolute absence of 79.000 and VND
  const has79k = pageText.includes("79.000") || pageText.includes("79,000") || pageText.includes("79000");
  const hasVnd = pageText.includes("₫") || pageText.includes("VND");
  console.log("Pricing checks (must be false):", { has79k, hasVnd });
  if (has79k || hasVnd) {
    throw new Error("Page still contains 79.000 or VND pricing!");
  }

  // Check Tabs
  const tabChart = await page.$("#tab-chart");
  const tabOverview = await page.$("#tab-overview");
  const tabPalaces = await page.$("#tab-palaces");
  const tabTopics = await page.$("#tab-topics");
  const tabEvidence = await page.$("#tab-evidence");
  console.log("Tabs present:", {
    tabChart: !!tabChart,
    tabOverview: !!tabOverview,
    tabPalaces: !!tabPalaces,
    tabTopics: !!tabTopics,
    tabEvidence: !!tabEvidence,
  });

  // Check Chart tab is initially active
  const chartGrid = await page.$(".ziwei-traditional-board");
  console.log("Traditional board rendered:", !!chartGrid);

  // Switch to Overview tab
  console.log("--- 2. Switching to Overview tab ---");
  await tabOverview.click();
  await page.waitForTimeout(300);
  const overviewText = await page.innerText("#panel-overview");
  console.log("Overview panel contains highlights:", overviewText.includes("nhận định"));

  // Switch to Topics tab
  console.log("--- 3. Switching to Topics tab ---");
  await tabTopics.click();
  await page.waitForTimeout(300);
  const topicsText = await page.innerText("#panel-topics");
  const hasCareerTopic = topicsText.includes("Cung Quan Lộc");
  const hasWealthTopic = topicsText.includes("Cung Tài Bạch");
  const hasOpenTag = topicsText.includes("Mở");
  const hasLockedTag = topicsText.includes("Đoạn đầu");
  console.log("Topics tab checks:", { hasCareerTopic, hasWealthTopic, hasOpenTag, hasLockedTag });

  // Open Career Topic
  console.log("--- 4. Inspecting Career Topic ---");
  const careerBtn = await page.$('[data-topic-trigger="career"]');
  await careerBtn.click();
  await page.waitForTimeout(300);
  const careerProse = await page.innerText(".topic-sample-full-reading");
  const hasThatSat = careerProse.includes("Thất Sát vượng ở Quan Lộc");
  const hasActions = careerProse.includes("Việc nên làm");
  const hasWhy = careerProse.includes("Vì sao có nhận định này?");
  console.log("Career full reading checks:", { hasThatSat, hasActions, hasWhy });

  // Check End CTA
  console.log("--- 5. Checking End CTA ---");
  const endCta = await page.$(".sample-end-cta-card a");
  const endCtaText = await endCta.innerText();
  const endCtaHref = await endCta.getAttribute("href");
  console.log("End CTA:", { text: endCtaText, href: endCtaHref });
  if (endCtaHref !== "/tao-la-so/tu-vi") {
    throw new Error(`End CTA href expected /tao-la-so/tu-vi, got ${endCtaHref}`);
  }

  // Check Mobile Viewport & Sticky Bottom Bar
  console.log("--- 6. Checking Mobile Viewport (390px) ---");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mobileBar = await page.$(".sample-mobile-bottom-bar");
  const isMobileBarVisible = await mobileBar.isVisible();
  const mobileCta = await page.$(".sample-mobile-bottom-bar a");
  const mobileCtaHref = await mobileCta.getAttribute("href");
  console.log("Mobile bar checks:", { isMobileBarVisible, mobileCtaHref });

  // Check English Route
  console.log("--- 7. Checking English route /en/bao-cao-mau/tu-vi ---");
  await page.goto("http://127.0.0.1:63423/en/bao-cao-mau/tu-vi", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const enText = await page.innerText("body");
  const hasEnEyebrow = enText.includes("Sample Report");
  const hasEnSampleStamp = enText.includes("SAMPLE");
  const hasEnByline = enText.includes("Edited by Lá Số Việt");
  const hasEnCta = enText.includes("Create your chart");
  console.log("English route checks:", { hasEnEyebrow, hasEnSampleStamp, hasEnByline, hasEnCta });

  await browser.close();
  console.log("=== ALL SMOKE CHECKS PASSED SUCCESSFULLY ===");
}

verifyTask24().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
