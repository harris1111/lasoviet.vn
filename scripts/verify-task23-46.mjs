import { chromium } from "@playwright/test";

async function main() {
  console.log("=== SMOKE TEST TASK #23 & #46: PRICING, TOPUP, MEMBERSHIP PREVIEW ===");
  const browser = await chromium.launch({ headless: true });
  const baseUrl = "http://127.0.0.1:63423";
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // 1. Standalone Top-up page /nap-la
  console.log("\n[Test 1] Testing /nap-la standalone page...");
  const res1 = await page.goto(`${baseUrl}/nap-la`, { waitUntil: "domcontentloaded" });
  console.log(`HTTP Status: ${res1?.status()}`);
  if (res1?.status() !== 200) throw new Error("Expected 200 on /nap-la");

  const title1 = await page.title();
  console.log(`Page title: ${title1}`);

  const packs = await page.$$eval(".pack-card", (cards) =>
    cards.map((c) => ({
      name: c.querySelector(".pack-name")?.textContent?.trim(),
      vnd: c.querySelector(".pack-vnd")?.textContent?.trim(),
      la: c.querySelector(".pack-la")?.textContent?.trim(),
      bonus: c.querySelector(".pack-bonus")?.textContent?.trim() || null,
    }))
  );
  console.log("Rendered Top-Up Packs:", JSON.stringify(packs, null, 2));

  // Verify approved 4 packs
  if (packs.length !== 4) throw new Error(`Expected 4 packs, got ${packs.length}`);
  if (packs[0].vnd !== "29.000đ" || !packs[0].la.includes("300")) throw new Error("Pack 1 mismatch");
  if (packs[1].vnd !== "99.000đ" || !packs[1].la.includes("1.100") || !packs[1].bonus.includes("+100")) throw new Error("Pack 2 mismatch");
  if (packs[2].vnd !== "249.000đ" || !packs[2].la.includes("3.000") || !packs[2].bonus.includes("+500")) throw new Error("Pack 3 mismatch");
  if (packs[3].vnd !== "599.000đ" || !packs[3].la.includes("8.000") || !packs[3].bonus.includes("+2.000")) throw new Error("Pack 4 mismatch");

  // Verify zero fake crossed-out prices
  const strikeCount = await page.$$eval("s, del, [style*='line-through']", (els) => els.length);
  console.log(`Strike-through / del elements count: ${strikeCount}`);
  if (strikeCount > 0) throw new Error("Found strike-through elements violating FD-064");

  // 2. Test Tab switching to Luận giải and Hội viên
  console.log("\n[Test 2] Testing tab switching...");
  const tabs = await page.$$eval(".seg3 button", (btns) => btns.map((b) => b.textContent?.trim()));
  console.log("Segmented Tabs:", tabs);

  // 3. Test benefits panel
  const benefits = await page.$$eval(".benefit-item", (items) =>
    items.map((i) => ({
      title: i.querySelector("b")?.textContent?.trim(),
      desc: i.textContent?.replace(i.querySelector("b")?.textContent || "", "").trim(),
    }))
  );
  console.log("Benefits Items (4 required):", JSON.stringify(benefits, null, 2));
  if (benefits.length !== 4) throw new Error(`Expected 4 benefits items, got ${benefits.length}`);

  // 4. Test topic selection on a calculated chart
  console.log("\n[Test 3] Calculating a new chart to test /la-so/[chartId]/chon-luan-giai...");
  await page.goto(`${baseUrl}/tao-la-so/tu-vi`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  // Step 1: Gender and name
  await page.locator('input[name="gender"][value="female"]').check();
  const nameInput = page.locator('input[name="displayName"]');
  if (await nameInput.count()) {
    await nameInput.fill("Phương Linh");
  }
  await page.locator(".wizard-action-continue").click();
  await page.waitForTimeout(600);

  // Step 2: Date
  await page.locator('select[name="birthDay"]').selectOption("15");
  await page.locator('select[name="birthMonth"]').selectOption("06");
  await page.locator('select[name="birthYear"]').selectOption("1994");
  await page.locator('.wizard-unknown-time input[type="checkbox"]').check();
  await page.waitForTimeout(300);
  await page.locator(".wizard-action-continue").click();
  await page.waitForTimeout(600);

  // Step 3: Consent and Submit
  const consentCheckbox = page.locator('.wizard-processing-consent input[type="checkbox"]');
  await consentCheckbox.check();
  await page.waitForTimeout(300);
  await page.locator(".wizard-action-submit").click();
  await page.waitForURL(/\/la-so\/[a-zA-Z0-9_-]+$/, { timeout: 20000 });

  const chartUrl = page.url();
  const chartId = chartUrl.split("/la-so/")[1]?.split("?")[0];
  console.log(`Created chart: ${chartId} (${chartUrl})`);

  // Navigate to chon-luan-giai
  console.log(`Navigating to /la-so/${chartId}/chon-luan-giai...`);
  await page.goto(`${baseUrl}/la-so/${chartId}/chon-luan-giai`, { waitUntil: "domcontentloaded" });

  // Verify Luận giải tab pricing: Lá only!
  const readingPrices = await page.$$eval("#luan-giai .offer-card", (cards) =>
    cards.map((c) => ({
      title: c.querySelector("h2")?.textContent?.trim(),
      price: c.querySelector(".offer-price")?.textContent?.trim(),
    }))
  );
  console.log("Reading Offer Cards:", JSON.stringify(readingPrices, null, 2));

  // Check no VND in #luan-giai
  const luanGiaiText = await page.$eval("#luan-giai", (el) => el.textContent || "");
  console.log("Debugging luanGiaiText lines with VND/đ:");
  for (const line of luanGiaiText.split("\n")) {
    if (line.includes("₫") || line.includes("VND") || line.includes(".000đ")) {
      console.log("Found line:", line.trim());
    }
  }
  if (luanGiaiText.includes("₫") || luanGiaiText.includes("VND") || luanGiaiText.includes(".000đ")) {
    throw new Error("Found VND on Luận giải tab violating FD-065!");
  }
  console.log("Verified FD-065: Luận giải tab contains NO VND (pure Lá pricing).");

  // Sticky Paybar verification
  const paybarText = await page.$eval(".paybar", (el) => el.textContent?.trim());
  console.log(`Sticky Paybar Summary: ${paybarText}`);
  if (!paybarText.includes("960 Lá") || !paybarText.includes("Thiếu 960 Lá")) {
    throw new Error("Sticky paybar missing expected gap calculation");
  }
  if (!paybarText.includes("Khởi Đọc") || !paybarText.includes("99.000đ")) {
    throw new Error("Sticky paybar did not pre-select smallest covering pack (Khởi Đọc 99k)");
  }
  console.log("Verified FD-066: Pre-selected smallest covering pack (Khởi Đọc 1.100 Lá / 99.000đ).");

  // Footer Link check
  console.log("\n[Test 4] Verifying footer link to /nap-la on homepage...");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const footerTopupLink = await page.$("footer a[href='/nap-la']");
  if (!footerTopupLink) throw new Error("Missing /nap-la link in site footer");
  console.log("Verified: /nap-la link present in site footer.");

  await browser.close();
  console.log("\nALL SMOKE TESTS PASSED CLEANLY!");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
