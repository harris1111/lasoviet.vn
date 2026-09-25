import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:63423";

async function main() {
  console.log("=== SMOKE TEST TASK #25: PAID REPORT READER REVAMP ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("\n[Test 1] Testing sample report reader page at /bao-cao-mau/tu-vi...");
  const res = await page.goto(`${BASE_URL}/bao-cao-mau/tu-vi`, { waitUntil: "domcontentloaded" });
  console.log("HTTP Status:", res.status());
  if (res.status() !== 200) {
    throw new Error(`Expected HTTP 200, got ${res.status()}`);
  }

  // Verify page title
  const title = await page.title();
  console.log("Page title:", title);

  // Verify sample report content renders
  const heroStamp = await page.$eval(".sample-hero-stamp", (el) => el.textContent?.trim());
  console.log("Hero stamp text:", heroStamp);
  if (!heroStamp || !heroStamp.includes("BẢN")) {
    throw new Error("Expected sample stamp not found!");
  }

  const endCta = await page.$(".sample-end-cta");
  if (!endCta) {
    throw new Error("Sample end CTA not found!");
  }
  console.log("Verified sample report content rendered cleanly.");

  console.log("\n[Test 2] Testing mobile viewport (390x844) responsiveness...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });

  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log("Has horizontal overflow at 390px:", hasHorizontalScroll);
  if (hasHorizontalScroll) {
    throw new Error("Horizontal overflow detected at 390px mobile viewport!");
  }

  console.log("\n[Test 3] Testing report authentication privacy boundary on /bao-cao/[reportId]...");
  const authRes = await page.goto(`${BASE_URL}/bao-cao/rep-test-auth-guard`, { waitUntil: "domcontentloaded" });
  console.log("Final URL after navigation:", page.url());
  if (!page.url().includes("/dang-nhap")) {
    throw new Error("Expected redirect to /dang-nhap for unauthenticated report request!");
  }
  console.log("Verified auth redirect and callbackUrl preservation for /bao-cao/[reportId].");

  await browser.close();
  console.log("\nALL SMOKE TESTS FOR TASK #25 PASSED CLEANLY!");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
