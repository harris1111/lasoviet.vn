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
  it("orchestrates the 17 ordered data-home-block sections in page.tsx", () => {
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
      "about-excerpt",
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
      "aboutExcerpt",
      "finalCta",
    ];

    for (const block of requiredBlocks) {
      expect(vi.home, `VI common.json must contain home.${block}`).toHaveProperty(block);
      expect(en.home, `EN common.json must contain home.${block}`).toHaveProperty(block);
    }
  });

  it("enforces planned non-link states for other disciplines, and no pricing shown on the homepage", () => {
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

    // Product decision (2026-09-09): the homepage no longer shows tier pricing at all —
    // pricing lives on the sample/commercial pages only. See docs/superpowers/specs/
    // 2026-09-09-content-ux-polish/vi/brand.home.md for the reconciliation with the
    // two-tier ladder (FD-036…FD-048).
    expect(vi.home?.valueLadder?.tier1).toBeUndefined();
    expect(en.home?.valueLadder?.tier1).toBeUndefined();
    expect(vi.home?.valueLadder).toMatchObject({
      eyebrow: expect.any(String),
      title: expect.any(String),
      bodyIntro: expect.any(String),
      bodyOffer: expect.any(String),
      methodNote: expect.any(String),
      cta: expect.any(String),
    });
    const viLadderCopy = collectStrings(vi.home.valueLadder).join("\n");
    const enLadderCopy = collectStrings(en.home.valueLadder).join("\n");
    expect(viLadderCopy).not.toMatch(/\d[\d.,]*\s*(?:₫|đ\b)/i);
    expect(enLadderCopy).not.toMatch(/\d[\d.,]*\s*(?:VND|USD|\$)/i);
  });

  it("matches exact prototype copy and metadata references for hero and trust strip", () => {
    const viPath = resolve(rootDir, "apps/web/messages/vi/common.json");
    const vi = JSON.parse(readFileSync(viPath, "utf8"));

    // Prototype baseline updated 2026-09-09: voice/positioning rewrite, see
    // docs/superpowers/specs/2026-09-09-content-ux-polish/voice-and-positioning.md.
    expect(vi.home.hero).toMatchObject({
      eyebrow: "Thư viện huyền học Việt · Mỗi câu hỏi, một cách tra cứu riêng",
      lead:
        "Đọc một lá số mà thấy toàn thuật ngữ lạ, vẫn không rõ nó đang nói gì về mình? Lá Số Việt dựng lá số Tử Vi miễn phí, rồi mở từng nhận định bằng đúng một câu hỏi: vì sao lại như vậy.",
      copy:
        "Không phán một câu rồi để bạn tự đoán. Không hứa biết trước tương lai. Những nhận định quan trọng đều có thể mở ra xem — dữ liệu nào, quy tắc nào, giới hạn ở đâu — để quyết định cuối cùng vẫn là của bạn.",
      microcopy:
        "Miễn phí ngay lập tức · Riêng tư theo mặc định · Không cần đăng ký tài khoản.",
      metaRoute: "Từ dữ liệu sinh đến bản đồ 12 cung",
      metaDetail: "Lá số đầy đủ được tính ở bước tiếp theo.",
      ctaPrimary: "Lập lá số miễn phí",
      ctaSecondary: "Xem bản luận giải mẫu",
    });

    expect(vi.home.trustStrip).toEqual({
      item1: {
        title: "Gốc rễ hơn nghìn năm",
        copy: "Tử Vi Đẩu Số là hệ thống cổ học được đúc kết qua nhiều thế kỷ, từ tri thức tinh túy của các bậc tiền nhân — Lá Số Việt kế thừa nền tảng đó bằng một cách tính nhất quán, minh bạch.",
      },
      item2: {
        title: "Tường minh căn cứ",
        copy: "Mỗi nhận định gắn với dữ liệu và quy tắc công bố.",
      },
      item3: {
        title: "Riêng tư theo mặc định",
        copy: "Lá số của bạn không hiển thị công khai. Dữ liệu khách chưa liên kết tài khoản được xóa trong 24 giờ.",
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
