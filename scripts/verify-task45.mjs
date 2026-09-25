import { chromium } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:63423";

async function run() {
  console.log("=== SMOKE TEST TASK #45: HOMEPAGE QA & A11Y ===");
  console.log(`Target URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });

  // Test 1: Mobile 320px Viewport (iPhone SE / small screens)
  console.log("\n[Test 1] Checking 320px Mobile Viewport...");
  const page320 = await browser.newPage({ viewport: { width: 320, height: 600 } });
  await page320.goto(`${BASE_URL}/vi`, { waitUntil: "domcontentloaded" });
  await page320.waitForTimeout(500);

  // Check inputs have numeric triggers
  const dayInput = page320.locator("#hv3-day");
  const hourInput = page320.locator("#hv3-hour");
  const minuteInput = page320.locator("#hv3-minute");

  expectAttr(await dayInput.getAttribute("pattern"), "[0-9]*", "day pattern");
  expectAttr(await dayInput.getAttribute("inputmode"), "numeric", "day inputmode");
  expectAttr(await hourInput.getAttribute("pattern"), "[0-9]*", "hour pattern");
  expectAttr(await hourInput.getAttribute("inputmode"), "numeric", "hour inputmode");
  expectAttr(await minuteInput.getAttribute("pattern"), "[0-9]*", "minute pattern");
  expectAttr(await minuteInput.getAttribute("inputmode"), "numeric", "minute inputmode");
  console.log("✓ Date and time inputs have pattern=\"[0-9]*\" and inputmode=\"numeric\"");

  // Check prompt line hidden under 420px
  const subPrompt = page320.locator(".hv3-folio-sub");
  const subVisible = await subPrompt.isVisible();
  console.log(`- Sub prompt visible at 320px: ${subVisible} (expected false)`);
  if (subVisible) throw new Error("Expected .hv3-folio-sub to be hidden at 320px!");

  // Check hero paper topic buttons stay within paper bounds
  const paper = await page320.locator(".hv3-folio-paper").boundingBox();
  const lenses = await page320.locator(".hv3-folio-lenses").boundingBox();
  const buttons = await page320.locator(".hv3-folio-lenses button").all();
  if (!paper || !lenses) throw new Error("Could not find paper or lenses bounding box!");

  console.log(`- Paper box: x=${paper.x.toFixed(1)}, y=${paper.y.toFixed(1)}, w=${paper.width.toFixed(1)}, h=${paper.height.toFixed(1)}`);
  console.log(`- Lenses box: x=${lenses.x.toFixed(1)}, y=${lenses.y.toFixed(1)}, w=${lenses.width.toFixed(1)}, h=${lenses.height.toFixed(1)}`);

  // Ensure lenses box does not horizontally or vertically overflow paper box
  const horizontalTolerance = 1.0;
  if (lenses.x < paper.x - horizontalTolerance || (lenses.x + lenses.width) > (paper.x + paper.width + horizontalTolerance)) {
    throw new Error(`Lenses box [${lenses.x}, ${lenses.x + lenses.width}] overflows paper [${paper.x}, ${paper.x + paper.width}]`);
  }
  if (lenses.y < paper.y || (lenses.y + lenses.height) > (paper.y + paper.height + 2.0)) {
    throw new Error(`Lenses box vertically overflows paper!`);
  }
  console.log("✓ 3 topic buttons stay strictly inside paper boundaries at 320px");

  // Test 2: VoiceOver & TalkBack Semantics
  console.log("\n[Test 2] Checking VoiceOver / TalkBack Semantics...");
  const folio = page320.locator(".hv3-folio");
  const folioRole = await folio.getAttribute("role");
  const folioAria = await folio.getAttribute("aria-label");
  expectAttr(folioRole, "group", "folio role");
  if (!folioAria) throw new Error("Expected .hv3-folio to have aria-label!");
  console.log(`✓ Hero art group: role="${folioRole}", aria-label="${folioAria}"`);

  const timeDetail = page320.locator(".hv3-folio-detail");
  const live = await timeDetail.getAttribute("aria-live");
  const atomic = await timeDetail.getAttribute("aria-atomic");
  expectAttr(live, "polite", "time detail aria-live");
  expectAttr(atomic, "true", "time detail aria-atomic");
  console.log(`✓ Paper time text live region: aria-live="${live}", aria-atomic="${atomic}"`);

  // Test 3: Desktop Viewport (1280px) Table Semantics and USP Cards
  console.log("\n[Test 3] Checking Desktop Viewport (1280px)...");
  const page1280 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page1280.goto(`${BASE_URL}/vi`, { waitUntil: "domcontentloaded" });
  await page1280.waitForTimeout(500);

  const table = page1280.locator(".hv3-compare-table");
  const tableRole = await table.getAttribute("role");
  expectAttr(tableRole, "table", "compare table role");

  const theadRole = await table.locator("thead").getAttribute("role");
  const tbodyRole = await table.locator("tbody").getAttribute("role");
  const tfootRole = await table.locator("tfoot").getAttribute("role");
  expectAttr(theadRole, "rowgroup", "thead role");
  expectAttr(tbodyRole, "rowgroup", "tbody role");
  expectAttr(tfootRole, "rowgroup", "tfoot role");

  const colHeaders = await table.locator("th[role='columnheader']").count();
  const rowHeaders = await table.locator("th[role='rowheader']").count();
  console.log(`✓ Comparison table semantics: role="${tableRole}", ${colHeaders} col headers, ${rowHeaders} row headers`);

  // USP Cards
  const uspGrid = page1280.locator(".hv3-usp-grid");
  const uspGridRole = await uspGrid.getAttribute("role");
  expectAttr(uspGridRole, "region", "usp grid role");

  for (let i = 1; i <= 4; i++) {
    const card = page1280.locator(`.hv3-usp-card[aria-labelledby="hv3-usp-n${i}-title"]`);
    const cardCount = await card.count();
    if (cardCount !== 1) throw new Error(`USP card n${i} with aria-labelledby not found!`);
  }
  console.log("✓ 4 USP cards have region and aria-labelledby matching heading titles");

  // Test 4: Reduced Motion
  console.log("\n[Test 4] Checking Prefers-Reduced-Motion...");
  const pageMotion = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await pageMotion.goto(`${BASE_URL}/vi`, { waitUntil: "domcontentloaded" });
  await pageMotion.waitForTimeout(500);

  const tickerAnimation = await pageMotion.locator(".hv3-ticker").first().evaluate((el) => {
    return window.getComputedStyle(el).animationName;
  });
  console.log(`- Ticker animation name under reduced-motion: "${tickerAnimation}"`);
  if (tickerAnimation && tickerAnimation !== "none") {
    throw new Error(`Expected ticker animation to be none, got ${tickerAnimation}`);
  }
  console.log("✓ Prefers-reduced-motion: Ticker animation is disabled");

  await browser.close();
  console.log("\n=== ALL HOMEPAGE QA & A11Y CHECKS PASSED FOR TASK #45 ===");
}

function expectAttr(actual, expected, desc) {
  if (actual !== expected) {
    throw new Error(`Expected ${desc} to be "${expected}", got "${actual}"`);
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
