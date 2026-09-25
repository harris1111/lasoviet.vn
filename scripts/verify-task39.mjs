import { chromium } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:63423";
const API_URL = process.env.TEST_API_URL || "http://127.0.0.1:3000";

async function run() {
  console.log("=== VERIFY TASK #39: YEARLY, MONTHLY AND DAILY HẠN RULES ===");
  console.log(`Web Base URL: ${BASE_URL}`);
  console.log(`API Base URL: ${API_URL}`);

  // Step 1: Create a chart via API
  console.log("\n[Step 1] Creating a test Zi Wei chart...");
  const chartPayload = {
    displayName: "Phạm Lan Hương",
    gender: "female",
    birthCalendar: "solar",
    solarDate: "1992-07-15",
    timePrecision: "exact_minute",
    birthTime: "08:15",
    utcOffset: 420,
  };

  const chartRes = await fetch(`${API_URL}/ziwei/charts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chartPayload),
  });

  if (!chartRes.ok) {
    throw new Error(`Failed to create chart: HTTP ${chartRes.status} ${await chartRes.text()}`);
  }

  const chartData = await chartRes.json();
  const chartId = chartData.chartId;
  console.log(`Created chart successfully. Chart ID: ${chartId}`);

  // Step 2: Fetch horoscope from API endpoint
  console.log("\n[Step 2] Fetching horoscope data from API...");
  const horoscopeRes = await fetch(`${API_URL}/ziwei/charts/${chartId}/horoscope`);
  if (!horoscopeRes.ok) {
    throw new Error(`Failed to fetch horoscope: HTTP ${horoscopeRes.status} ${await horoscopeRes.text()}`);
  }

  const horoscope = await horoscopeRes.json();
  console.log(`Horoscope Version: ${horoscope.version}`);
  console.log(`Yearly Target: ${horoscope.yearly.targetYear} (${horoscope.yearly.lunarYear})`);
  console.log(`Annual Palace: ${horoscope.yearly.annualPalaceName} (Stem: ${horoscope.yearly.annualStem}, Branch: ${horoscope.yearly.annualBranch})`);
  console.log(`Caution Months: ${horoscope.yearly.hanMonthCount}, Favorable: ${horoscope.yearly.favorableMonthCount}`);
  console.log(`Summary: ${horoscope.yearly.summary}`);

  if (horoscope.yearly.months.length !== 12) {
    throw new Error(`Expected 12 months, got ${horoscope.yearly.months.length}`);
  }

  // Verify FD-059 security: locked months must have masked display and no prep text
  for (const m of horoscope.yearly.months) {
    if (m.marker === "warn") {
      if (m.monthNumberDisplay !== "?") {
        throw new Error(`Security violation: Free tier caution month ${m.monthIndex} exposed monthNumberDisplay '${m.monthNumberDisplay}'`);
      }
      if (m.preparationText) {
        throw new Error(`Security violation: Free tier caution month ${m.monthIndex} exposed preparationText`);
      }
    }
  }
  console.log("FD-059 security check: All caution months properly masked ('?') in free tier.");

  console.log(`Daily Forecast: ${horoscope.daily.headline}`);
  console.log(`Daily Lunar Date: ${horoscope.daily.lunarDateFormatted}, Touched Palace: ${horoscope.daily.touchedPalaceName}`);

  // Step 3: Verify Web UI rendering with Playwright
  console.log("\n[Step 3] Verifying Web UI rendering on /la-so/:chartId?tab=nam-nay...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const chartUrl = `${BASE_URL}/la-so/${chartId}?tab=nam-nay`;
  const resWeb = await page.goto(chartUrl, { waitUntil: "domcontentloaded" });
  if (resWeb.status() !== 200) {
    throw new Error(`Expected HTTP 200 for chart page, got ${resWeb.status()}`);
  }

  // Check tab count badge
  const tabButton = page.locator("#tab-nam-nay");
  const tabCountText = await tabButton.locator(".tab-count").textContent();
  console.log(`Tab badge text: "${tabCountText?.trim()}"`);
  if (!tabCountText?.includes("tháng hạn")) {
    throw new Error(`Expected tab badge to contain 'tháng hạn', got '${tabCountText}'`);
  }

  // Check annual tab panel
  const panel = page.locator("#panel-nam-nay");
  const yearNum = await panel.locator(".year-num").textContent();
  const title = await panel.locator(".panel-title").textContent();
  console.log(`Annual Panel Year: ${yearNum?.trim()}, Title: ${title?.trim()}`);

  const monthCards = panel.locator(".month");
  const monthCardCount = await monthCards.count();
  console.log(`Rendered Month Cards Count: ${monthCardCount}`);
  if (monthCardCount !== 12) {
    throw new Error(`Expected 12 month cards in DOM, got ${monthCardCount}`);
  }

  // Check caution cards
  const warnCards = panel.locator(".month.warn");
  const warnCount = await warnCards.count();
  console.log(`Caution Month Cards Count: ${warnCount}`);
  if (warnCount !== horoscope.yearly.hanMonthCount) {
    throw new Error(`Mismatch caution count in DOM: expected ${horoscope.yearly.hanMonthCount}, got ${warnCount}`);
  }

  // Check Today's forecast card
  const todayCard = panel.locator(".today-forecast-card");
  const todayText = await todayCard.textContent();
  console.log(`Today Forecast Card: ${todayText?.trim().replace(/\s+/g, " ")}`);

  // Step 4: Verify English locale /en/la-so/:chartId?tab=nam-nay
  console.log("\n[Step 4] Verifying English locale...");
  const enUrl = `${BASE_URL}/en/la-so/${chartId}?tab=nam-nay`;
  const resEn = await page.goto(enUrl, { waitUntil: "domcontentloaded" });
  if (resEn.status() !== 200) {
    throw new Error(`Expected HTTP 200 for EN chart page, got ${resEn.status()}`);
  }

  const enTabButton = page.locator("#tab-nam-nay");
  const enTabBadge = await enTabButton.locator(".tab-count").textContent();
  console.log(`EN Tab badge: "${enTabBadge?.trim()}"`);

  await browser.close();
  console.log("\n=== ALL VERIFICATION CHECKS PASSED FOR TASK #39 ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
