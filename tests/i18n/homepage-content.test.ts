import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

const rootDir = process.cwd();

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("homepage content and structure requirements", () => {
  it("orchestrates exactly 10 primary data-home-block sections inside <main> matching AITuvi §4.1 order", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const blockMatches = Array.from(
      pageSource.matchAll(/data-home-block="([^"]+)"/g),
      (match) => match[1],
    );

    expect(blockMatches).toEqual([
      "hero",
      "topic-chips",
      "comparison",
      "evidence",
      "capability-matrix",
      "process",
      "knowledge",
      "faq",
      "support",
      "final-cta",
    ]);
  });

  it("requires generateMetadata in page.tsx using public repository and brand.home route", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    expect(pageSource).toMatch(/export\s+(async\s+)?function\s+generateMetadata/);
    expect(pageSource).toContain("buildPublicMetadata");
    expect(pageSource).toContain("brand.home");
    expect(pageSource).toMatch(/loadPublicContentRepository|createPublicContentRepository/);

    const homeRoute = routeRegistry.find((route) => route.id === "brand.home");
    expect(homeRoute).toBeDefined();
    expect(homeRoute?.status).toBe("live_indexable");
  });

  it("verifies approved logo and favicon byte equality across source and destination", () => {
    const assetPairs = [
      {
        src: "brand/logo/svg/lasoviet-logo-ngang-vang-son.svg",
        dest: "apps/web/public/brand/lasoviet-logo-ngang-vang-son.svg",
      },
      {
        src: "brand/logo/favicon/favicon.ico",
        dest: "apps/web/src/app/favicon.ico",
      },
      {
        src: "brand/logo/favicon/favicon.svg",
        dest: "apps/web/src/app/icon.svg",
      },
      {
        src: "brand/logo/favicon/apple-touch-icon.png",
        dest: "apps/web/src/app/apple-icon.png",
      },
      {
        src: "brand/logo/favicon/site.webmanifest",
        dest: "apps/web/src/app/manifest.webmanifest",
      },
      {
        src: "brand/logo/favicon/android-chrome-192x192.png",
        dest: "apps/web/public/android-chrome-192x192.png",
      },
      {
        src: "brand/logo/favicon/android-chrome-512x512.png",
        dest: "apps/web/public/android-chrome-512x512.png",
      },
    ];

    for (const pair of assetPairs) {
      const srcPath = resolve(rootDir, pair.src);
      const destPath = resolve(rootDir, pair.dest);

      expect(existsSync(destPath), `Target asset ${pair.dest} must exist`).toBe(true);
      const srcBytes = readFileSync(srcPath);
      const destBytes = readFileSync(destPath);
      expect(
        Buffer.compare(srcBytes, destBytes),
        `${pair.dest} must have exact bytes of ${pair.src}`,
      ).toBe(0);
    }
  });

  it("enforces canonical CTAs, required anchors including restored #dich-vu, and forbids bare hash or forbidden script", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const requiredAnchors = [
      "#dich-vu",
      "#he-quy-chieu",
      "#luan-giai",
      "#kien-thuc",
      "#phuong-phap",
      "#can-cu",
      "#faq",
    ];

    for (const anchor of requiredAnchors) {
      expect(
        pageSource.includes(anchor) || pageSource.includes(anchor.slice(1)),
        `page.tsx must contain anchor ${anchor}`,
      ).toBe(true);
    }

    // Ensure only one id="faq" anchor across page and components
    const faqMatches = Array.from(pageSource.matchAll(/id="faq"/g));
    expect(faqMatches).toHaveLength(1);

    expect(pageSource).not.toContain('href="#"');
    expect(pageSource).not.toContain("support.js");
  });

  it("validates required homepage message blocks and keys for VI and EN", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const vi = JSON.parse(readFileSync(viPath, "utf8"));
    const en = JSON.parse(readFileSync(enPath, "utf8"));

    const requiredBlocks = [
      "hero",
      "topicChips",
      "comparison",
      "evidence",
      "capabilityMatrix",
      "process",
      "knowledge",
      "faq",
      "support",
      "finalCta",
    ];

    for (const block of requiredBlocks) {
      expect(vi.home, `VI common.json must contain home.${block}`).toHaveProperty(block);
      expect(en.home, `EN common.json must contain home.${block}`).toHaveProperty(block);
    }
  });

  it("enforces no price amounts (neither VND nor Lá) displayed on homepage", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const vi = JSON.parse(readFileSync(viPath, "utf8"));
    const en = JSON.parse(readFileSync(enPath, "utf8"));

    // Check complete home copy for VI and EN
    const viHomeCopy = collectStrings(vi.home).join("\n");
    const enHomeCopy = collectStrings(en.home).join("\n");

    // Must not contain numeric prices with currency or Lá amounts
    expect(viHomeCopy).not.toMatch(/\d[\d.,]*\s*(?:₫|đ(?!\p{L})|VND|(?:Lá|La)(?!\p{L}))/iu);
    expect(enHomeCopy).not.toMatch(/\d[\d.,]*\s*(?:VND|USD|\$|(?:Lá|La)(?!\p{L}))/iu);
  });

  it("enforces 8 numbered FAQ items with non-empty questions and answers", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const vi = JSON.parse(readFileSync(viPath, "utf8")).home.faq;
    const en = JSON.parse(readFileSync(enPath, "utf8")).home.faq;

    const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;
    expect(Object.keys(vi).filter((k) => k.startsWith("q"))).toHaveLength(8);
    expect(Object.keys(en).filter((k) => k.startsWith("q"))).toHaveLength(8);

    for (const k of faqKeys) {
      expect(vi[k]?.question?.length).toBeGreaterThan(10);
      expect(vi[k]?.answer?.length).toBeGreaterThan(15);
      expect(en[k]?.question?.length).toBeGreaterThan(10);
      expect(en[k]?.answer?.length).toBeGreaterThan(15);
    }
  });

  it("enforces process steps copy <= 20 words each (AITuvi §4.1 budget)", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const viProcess = JSON.parse(readFileSync(viPath, "utf8")).home.process;
    const enProcess = JSON.parse(readFileSync(enPath, "utf8")).home.process;

    for (const step of ["one", "two", "three"] as const) {
      const viWords = viProcess[step].copy.trim().split(/\s+/).length;
      const enWords = enProcess[step].copy.trim().split(/\s+/).length;
      expect(viWords, `VI process.${step}.copy word count`).toBeLessThanOrEqual(20);
      expect(enWords, `EN process.${step}.copy word count`).toBeLessThanOrEqual(20);
    }
  });

  it("enforces homepage word budget above FAQ <= 1400 words", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const vi = JSON.parse(readFileSync(viPath, "utf8")).home;
    const en = JSON.parse(readFileSync(enPath, "utf8")).home;

    const preFaqBlocks = [
      "hero",
      "topicChips",
      "comparison",
      "evidence",
      "capabilityMatrix",
      "process",
      "knowledge",
    ];

    const viPreFaqWords = preFaqBlocks
      .flatMap((b) => collectStrings(vi[b]))
      .join(" ")
      .trim()
      .split(/\s+/).length;

    const enPreFaqWords = preFaqBlocks
      .flatMap((b) => collectStrings(en[b]))
      .join(" ")
      .trim()
      .split(/\s+/).length;

    expect(viPreFaqWords, "VI words above FAQ").toBeLessThanOrEqual(1400);
    expect(enPreFaqWords, "EN words above FAQ").toBeLessThanOrEqual(1400);
  });

  it("rejects unsupported claims across the complete VI and EN home trees", () => {
    const bannedClaims = [
      /100\+/i,
      /500[,.]000\+/i,
      /100\s*%/i,
      /sub[- ]?second/i,
      /error margins?/i,
      /sai số.*(?:giây|phút)/i,
      /authoritative[- ]classics?/i,
      /kinh điển.*(?:thẩm quyền|chính thống)/i,
      /hallucinat/i,
      /frequent errors?/i,
      /thường xuyên sai/i,
      /zero data exposure/i,
      /never sell(?:s|ing)? (?:your )?data/i,
      /không bán dữ liệu/i,
      /permanent(?:ly)? delet/i,
      /xóa vĩnh viễn/i,
      /one[- ]click delet/i,
      /xóa (?:bằng )?một cú nhấp/i,
      /absolute privacy/i,
      /mọi (?:kết luận|nhận định)/i,
      /every (?:important )?(?:conclusion|insight)/i,
      /chuyên gia/i,
      /đội ngũ xem xét/i,
    ];

    for (const locale of ["vi", "en"]) {
      const messagesPath = resolve(rootDir, `apps/web/messages/${locale}/common.json`);
      const home = JSON.parse(readFileSync(messagesPath, "utf8")).home;
      const copy = collectStrings(home).join("\n");

      for (const claim of bannedClaims) {
        expect(copy, `${locale} home copy must not match ${claim}`).not.toMatch(claim);
      }
    }
  });

  it("verifies removed blocks are no longer imported in page.tsx", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const removedComponents = [
      "HomepageTrustStrip",
      "HomepageProblem",
      "HomepageLenses",
      "HomepageChatbotComparison",
      "HomepageCategoryComparison",
      "HomepageMethod",
      "HomepageFreeValue",
      "HomepageValueLadder",
      "HomepageTrustSpecs",
      "HomepageAboutExcerpt",
    ];

    for (const comp of removedComponents) {
      expect(pageSource).not.toContain(comp);
    }
  });

  it("enforces mobile order form-first and touch target constraints in CSS", () => {
    const foundationCss = readFileSync(
      resolve(rootDir, "apps/web/src/styles/homepage-foundation.css"),
      "utf8",
    );

    // Form first on mobile
    expect(foundationCss).toContain("order: 1; /* Form first on mobile */");
    expect(foundationCss).toContain("order: 2; /* H1 & intro below on mobile */");

    // Touch targets >= 44px
    expect(foundationCss).toMatch(/min-height:\s*44px/);
    expect(foundationCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("enforces all font sizes in homepage-foundation.css are >= 14px (no px size below 14)", () => {
    const foundationCss = readFileSync(
      resolve(rootDir, "apps/web/src/styles/homepage-foundation.css"),
      "utf8",
    );
    // Strip comments to ensure no false positives from comment strings
    const cleanCss = foundationCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const matches = [...cleanCss.matchAll(/font(?:-size)?:\s*([^;]+);/g)];
    const pxSizesBelow14: Array<{ declaration: string; pxValue: number }> = [];

    for (const match of matches) {
      const valueStr = match[1];
      const pxMatches = valueStr.match(/(\d+(?:\.\d+)?)\s*px/g);
      if (pxMatches) {
        for (const p of pxMatches) {
          const num = parseFloat(p);
          if (num < 14) {
            pxSizesBelow14.push({ declaration: match[0], pxValue: num });
          }
        }
      }
    }

    expect(pxSizesBelow14, "No px font-size declaration below 14px in homepage-foundation.css").toEqual([]);
  });
});

  it("enforces effective font-size >= 14px across all homepage stylesheets and scoped overrides", () => {
    const foundationCss = readFileSync(
      resolve(rootDir, "apps/web/src/styles/homepage-foundation.css"),
      "utf8",
    );

    // Assert that homepage typography scoped overrides exist for all potentially small selectors
    const required14pxSelectors = [
      ".home .eyebrow",
      ".home .hero-form-inputs label",
      ".home .hero-meta-route",
      ".home .hero-meta-detail",
      ".home .birth-note",
      ".home .process-meta",
      ".home .process-figure figcaption",
      ".home .featured-byline",
      ".home .comp-badge",
      ".home .also-have-chip",
      ".home .matrix-badge-label",
      ".home .knowledge-category-tag",
      ".home .knowledge-compact-tag",
      ".home .evidence-meta-pill",
      ".home .evidence-card-badge",
      ".home .cta-closing",
    ];

    for (const selector of required14pxSelectors) {
      expect(
        foundationCss.includes(`${selector} {\n  font-size: 14px;\n}`),
        `homepage-foundation.css must enforce font-size: 14px on ${selector}`,
      ).toBe(true);
    }
  });

  function parseCssRules(cssText: string): Array<{
  selectors: string[];
  declarations: Record<string, string>;
  raw: string;
}> {
  const clean = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
  const rules: Array<{ selectors: string[]; declarations: Record<string, string>; raw: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(clean)) !== null) {
    const rawSelectors = match[1]!.trim();
    const declarationsText = match[2]!.trim();
    const selectors = rawSelectors.split(",").map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
    const declarations: Record<string, string> = {};
    for (const decl of declarationsText.split(";")) {
      const idx = decl.indexOf(":");
      if (idx !== -1) {
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const val = decl.slice(idx + 1).trim();
        declarations[prop] = val;
      }
    }
    rules.push({ selectors, declarations, raw: match[0] });
  }
  return rules;
}

  it("enforces effective font-size >= 14px for hero reused wizard selectors under .home .hero-form-col with exact rule parsing", () => {
    const foundationCss = readFileSync(
      resolve(rootDir, "apps/web/src/styles/homepage-foundation.css"),
      "utf8",
    );

    const requiredHeroSelectors = [
      ".home .hero-form-col .wizard-field-label",
      ".home .hero-form-col .wizard-fieldset legend",
      ".home .hero-form-col .wizard-help",
      ".home .hero-form-col .wizard-mode-button",
      ".home .hero-form-col .wizard-check",
      ".home .hero-form-col .hero-cache-notice",
      ".home .hero-form-col .hero-cache-clear",
      ".home .hero-form-col .wizard-cache-notice",
      ".home .hero-form-col .wizard-cache-clear",
      ".home .hero-form-col .wizard-precision-help",
    ];

    const parsedRules = parseCssRules(foundationCss);
    const matchingRule = parsedRules.find((rule) =>
      rule.selectors.some((s) => s === ".home .hero-form-col .wizard-field-label"),
    );

    expect(matchingRule, "Expected dedicated .home .hero-form-col typography rule block").toBeDefined();
    expect(matchingRule?.declarations["font-size"]).toBe("14px");

    for (const selector of requiredHeroSelectors) {
      expect(
        matchingRule?.selectors,
        `Rule block must include selector: ${selector}`,
      ).toContain(selector);
    }
  });
