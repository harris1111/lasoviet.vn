import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:63423";

async function verify() {
  console.log(`Starting Task #47 verification on ${baseUrl}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const routesToTest = [
    {
      path: "/lich-am",
      expectedText: "Lịch Âm",
      secondaryText: "Can chi ngày",
    },
    {
      path: "/ngay-tot",
      expectedText: "Xem Ngày Tốt",
      secondaryText: "Cưới hỏi",
    },
    {
      path: "/tra-cuu-than-so-hoc",
      expectedText: "Tra cứu Thần Số Học",
      secondaryText: "Biểu đồ ngày sinh",
    },
    {
      path: "/boi-tinh-yeu",
      expectedText: "Bói Tình Yêu Theo Tuổi",
      secondaryText: "Về Con Giáp",
    },
    {
      path: "/tu-vi-hom-nay",
      expectedText: "Tử Vi Hôm Nay 12 Con Giáp",
      secondaryText: "Sắp ra mắt",
    },
  ];

  for (const { path, expectedText, secondaryText } of routesToTest) {
    const targetUrl = `${baseUrl}${path}`;
    console.log(`Testing route: ${targetUrl}`);
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    if (!response || response.status() !== 200) {
      throw new Error(`Failed to load ${targetUrl}: HTTP ${response ? response.status() : "none"}`);
    }

    const content = await page.content();
    if (!content.includes(expectedText)) {
      throw new Error(`Missing expected text "${expectedText}" on ${path}`);
    }
    if (!content.includes(secondaryText)) {
      throw new Error(`Missing secondary text "${secondaryText}" on ${path}`);
    }
    console.log(`✓ ${path} verified (HTTP 200, "${expectedText}", "${secondaryText}")`);
  }

  await browser.close();
  console.log("All routes for Task #47 verified successfully!");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
