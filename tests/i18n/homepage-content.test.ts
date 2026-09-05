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
  it("orchestrates the 16 ordered data-home-block sections in page.tsx", () => {
    const pagePath = resolve(rootDir, "apps/web/src/app/[locale]/page.tsx");
    const pageSource = readFileSync(pagePath, "utf8");

    const blockMatches = Array.from(
      pageSource.matchAll(/data-home-block="([^"]+)"/g),
      (match) => match[1],
    );

    expect(blockMatches).toEqual([
      "header",
      "hero",
      "trust-strip",
      "problem",
      "lenses",
      "chatbot-comparison",
      "category-comparison",
      "about-method",
      "process",
      "free-value",
      "evidence",
      "value-ladder",
      "trust-specs",
      "knowledge",
      "faq",
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
      "trustStrip",
      "problem",
      "lenses",
      "chatbotComparison",
      "categoryComparison",
      "aboutMethod",
      "process",
      "freeValue",
      "evidence",
      "valueLadder",
      "trustSpecs",
      "knowledge",
      "faq",
      "finalCta",
    ];

    for (const block of requiredBlocks) {
      expect(vi.home, `VI common.json must contain home.${block}`).toHaveProperty(block);
      expect(en.home, `EN common.json must contain home.${block}`).toHaveProperty(block);
    }
  });

  it("enforces planned non-link states: only Tu Vi clickable, other disciplines inert, and only tier 1 priced", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const enPath = resolve(rootDir, "apps/web/messages/en/common.json");

    const vi = JSON.parse(readFileSync(viPath, "utf8"));
    const en = JSON.parse(readFileSync(enPath, "utf8"));

    expect(vi.home?.lenses?.batTu?.status).toBe("Sắp ra mắt");
    expect(vi.home?.lenses?.astrology?.status).toBe("Sắp ra mắt");
    expect(vi.home?.lenses?.numerology?.status).toBe("Sắp ra mắt");
    expect(en.home?.lenses?.batTu?.status).toBe("Planned");
    expect(en.home?.lenses?.astrology?.status).toBe("Planned");
    expect(en.home?.lenses?.numerology?.status).toBe("Planned");

    expect(vi.home?.valueLadder?.tier1?.price).toBe("79.000 ₫");
    expect(en.home?.valueLadder?.tier1?.price).toBe("79,000 VND");
    expect(vi.home?.valueLadder?.tier2?.price).toBeUndefined();
    expect(vi.home?.valueLadder?.tier3?.price).toBeUndefined();
    expect(en.home?.valueLadder?.tier2?.price).toBeUndefined();
    expect(en.home?.valueLadder?.tier3?.price).toBeUndefined();
  });

  it("matches exact prototype copy and metadata references for hero and trust strip", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const vi = JSON.parse(readFileSync(viPath, "utf8"));

    expect(vi.home.hero).toMatchObject({
      eyebrow: "Một hồ sơ sinh · Đa tầng soi chiếu Đông – Tây",
      lead:
        "Nhập thời khắc sinh một lần — soi tỏ căn tính và đường đời qua Tử Vi, Bát Tự, Bản đồ sao và Thần Số Học.",
      copy:
        "Không thần bí hóa, không phán xét tương lai. Lá Số Việt chuyển hóa đồ hình cổ xưa thành lời giải thích tiếng Việt sáng rõ, minh bạch từng căn cứ — để bạn thấu hiểu chính mình và vững vàng trong mọi lựa chọn.",
      microcopy:
        "Miễn phí ngay lập tức · Riêng tư tuyệt đối · Không cần đăng ký tài khoản.",
      metaRoute: "Từ dữ liệu sinh đến bản đồ 12 cung",
      metaDetail: "Lá số đầy đủ được tính ở bước tiếp theo.",
      ctaPrimary: "Lập lá số miễn phí",
      ctaSecondary: "Xem bản luận giải mẫu",
    });

    expect(vi.home.trustStrip).toEqual({
      item1: {
        title: "Miễn phí khởi đầu",
        copy: "Xem tổng quan lá số trước khi cần trả phí.",
      },
      item2: {
        title: "Tường minh căn cứ",
        copy: "Mỗi nhận định gắn với dữ liệu và quy tắc công bố.",
      },
      item3: {
        title: "Riêng tư tuyệt đối",
        copy: "Lá số của bạn không hiển thị công khai.",
      },
      item4: {
        title: "Không ép gia hạn",
        copy: "Báo cáo là thanh toán một lần.",
      },
    });

    const heroSourcePath = resolve(rootDir, "apps/web/src/features/homepage/homepage-hero.tsx");
    const heroSource = readFileSync(heroSourcePath, "utf8");
    expect(heroSource).toContain("home.hero.metaRoute");
    expect(heroSource).toContain("home.hero.metaDetail");
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
});
