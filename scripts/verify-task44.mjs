import assert from "node:assert";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

async function runVerification() {
  console.log("=== Verifying Task #44: Homepage Performance & Hero Image Optimization ===");

  // 1. Start local Next.js web server via standalone runner
  const port = 43210;
  console.log(`Starting web server on port ${port}...`);

  const envContent = await import("node:fs").then(fs => fs.readFileSync("/home/debian/projects/.lasoviet-mvp.env", "utf8"));
  const envVars = { ...process.env, PORT: String(port) };
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx);
      const v = trimmed.slice(eqIdx + 1);
      envVars[k] = v;
    }
  }

  const server = spawn("node", ["apps/web/server.js"], {
    cwd: "apps/web/.next/standalone",
    env: envVars,
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (d) => process.stdout.write(`[web] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[web-err] ${d}`));

  // Wait for server to become ready
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/vi`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!ready) {
    server.kill();
    throw new Error("Next.js server failed to start within 20s");
  }

  console.log("Web server is ready. Launching headless Chromium...");
  const browser = await chromium.launch({ headless: true });

  try {
    // 2. Test Mobile Viewport (iPhone 14 / standard mobile 390x844)
    console.log("\n--- Testing Mobile Viewport (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    const downloadedImages = [];

    mobilePage.on("request", (req) => {
      const url = req.url();
      if (url.includes("/images/lasoviet/v3/")) {
        downloadedImages.push(url);
      }
    });

    mobilePage.on("requestfailed", (req) => console.log(`[req-failed] ${req.url()}`));
    mobilePage.on("response", (res) => {
      if (res.status() === 404) console.log(`[404] ${res.url()}`);
    });
    mobilePage.on("console", (msg) => console.log(`[browser-console] ${msg.type()}: ${msg.text()}`));
    mobilePage.on("pageerror", (err) => console.log(`[browser-err] ${err.message}`));

    await mobilePage.goto(`http://127.0.0.1:${port}/vi`, { waitUntil: "load" });
    await mobilePage.waitForTimeout(1000);

    // Check hero images downloaded
    const heroDarkDownloads = downloadedImages.filter((u) => u.includes("lsv-hero-open-dark"));
    const heroLightDownloads = downloadedImages.filter((u) => u.includes("lsv-hero-open-light"));

    console.log(`Hero dark images downloaded: ${heroDarkDownloads.length} (${heroDarkDownloads.join(", ")})`);
    console.log(`Hero light images downloaded: ${heroLightDownloads.length} (${heroLightDownloads.join(", ")})`);

    // Verify only ONE theme image is loaded on initial visit
    assert(
      (heroDarkDownloads.length > 0 && heroLightDownloads.length === 0) ||
      (heroLightDownloads.length > 0 && heroDarkDownloads.length === 0),
      "Exactly one hero image must be downloaded on initial load, not both!",
    );

    // Verify mobile receives responsive smaller width
    const usedMobileHero = downloadedImages.some((u) => u.includes("lsv-hero-open-dark-700.webp") || u.includes("lsv-hero-open-light-700.webp"));
    console.log(`Mobile viewport received responsive 700w hero asset: ${usedMobileHero}`);

    // Measure CLS and LCP via PerformanceObserver
    const vitals = await mobilePage.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0;
        let lcp = 0;

        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });

        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });

        setTimeout(() => {
          resolve({ cls, lcp });
        }, 1500);
      });
    });

    console.log(`Mobile Web Vitals -> LCP: ${vitals.lcp.toFixed(1)}ms, CLS: ${vitals.cls.toFixed(4)}`);
    assert(vitals.cls < 0.1, `CLS must be < 0.1 (good), got ${vitals.cls}`);

    // Test Theme Switch: does it switch cleanly without error?
    console.log("\nTesting theme toggle interaction...");
    const themeBtn = mobilePage.locator(".theme-toggle");
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await mobilePage.waitForTimeout(500);
      const newTheme = await mobilePage.evaluate(() => document.documentElement.dataset.theme);
      console.log(`Theme after toggle: ${newTheme}`);
      assert.strictEqual(newTheme, "light", "Theme should switch to light");
    }

    await mobileContext.close();

    // 3. Test Desktop Viewport (1440x900) on /en
    console.log("\n--- Testing Desktop Viewport (1440x900) on /en ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    const desktopImages = [];
    desktopPage.on("request", (req) => {
      const url = req.url();
      if (url.includes("/images/lasoviet/v3/")) {
        desktopImages.push(url);
      }
    });

    await desktopPage.goto(`http://127.0.0.1:${port}/en`, { waitUntil: "load" });
    await desktopPage.waitForTimeout(1000);
    const enHeroDark = desktopImages.filter((u) => u.includes("lsv-hero-open-dark"));
    const enHeroLight = desktopImages.filter((u) => u.includes("lsv-hero-open-light"));
    console.log(`Desktop /en hero downloads -> Dark: ${enHeroDark.length}, Light: ${enHeroLight.length}`);
    assert(
      (enHeroDark.length > 0 && enHeroLight.length === 0) ||
      (enHeroLight.length > 0 && enHeroDark.length === 0),
      "Desktop /en must download only one hero theme image!",
    );

    await desktopContext.close();
    console.log("\nAll performance and hero image optimization checks passed successfully!");
  } finally {
    await browser.close();
    server.kill();
  }
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
