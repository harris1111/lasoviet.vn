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
  it("orchestrates the 10 primary data-home-block sections in page.tsx matching AITuvi §4.1 order", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const blockMatches = Array.from(
      pageSource.matchAll(/data-home-block="([^"]+)"/g),
      (match) => match[1],
    );

    expect(blockMatches).toEqual([
      "header",
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

  it("enforces canonical CTAs, required anchors, and forbids bare hash or forbidden script", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const requiredAnchors = [
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
    expect(viHomeCopy).not.toMatch(/\d[\d.,]*\s*(?:₫|đ\b|VND|Lá\b)/i);
    expect(enHomeCopy).not.toMatch(/\d[\d.,]*\s*(?:VND|USD|\$|Lá\b|La\b)/i);
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
});
