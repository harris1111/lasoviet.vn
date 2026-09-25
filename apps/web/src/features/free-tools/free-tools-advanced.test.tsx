import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NumerologyPreview } from "./numerology-preview";
import { LoveCompatibilityPreview } from "./love-compatibility-preview";
import { DailyHoroscopePreview } from "./daily-horoscope-preview";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) =>
    createElement("a", { href, ...props }, children),
}));

vi.mock("next-intl", () => {
  const viCommon = require("../../../messages/vi/common.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = ns === "common.freeToolsCrossSell" ? viCommon.freeToolsCrossSell : {};
      return (key: string, values?: Record<string, unknown>) => {
        let val = msgs?.[key] ?? key;
        if (values) {
          for (const [k, v] of Object.entries(values)) {
            val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return val;
      };
    },
  };
});

describe("NumerologyPreview", () => {
  it("renders live numerology tool in Vietnamese", () => {
    const html = renderToStaticMarkup(
      createElement(NumerologyPreview, { locale: "vi" }),
    );

    expect(html).toContain("Tra cứu Thần Số Học");
    expect(html).toContain("Đang hoạt động");
    expect(html).toContain("Con số chủ đạo");
    expect(html).toContain("Số sứ mệnh");
    expect(html).toContain("Số linh hồn");
    expect(html).toContain("Số nhân cách");
    expect(html).toContain("Biểu đồ ngày sinh");
    expect(html).toContain("Còn tùy lá số của bạn");
    expect(html).toContain("Lập lá số với ngày sinh này");
  });

  it("renders live numerology tool in English", () => {
    const html = renderToStaticMarkup(
      createElement(NumerologyPreview, { locale: "en" }),
    );

    expect(html).toContain("Pythagorean Numerology Lookup");
    expect(html).toContain("Active tool");
    expect(html).toContain("Life Path Number");
    expect(html).toContain("3×3 Birth Chart Grid");
    expect(html).toContain("Depends on your personal chart");
  });
});

describe("LoveCompatibilityPreview", () => {
  it("renders love compatibility tool in Vietnamese", () => {
    const html = renderToStaticMarkup(
      createElement(LoveCompatibilityPreview, { locale: "vi" }),
    );

    expect(html).toContain("Bói Tình Yêu Theo Tuổi");
    expect(html).toContain("Đang hoạt động");
    expect(html).toContain("Về Con Giáp");
    expect(html).toContain("Về Ngũ Hành");
    expect(html).toContain("Còn tùy lá số của bạn");
    expect(html).toContain("Xem cung Phu Thê của tôi");
  });

  it("renders love compatibility tool in English", () => {
    const html = renderToStaticMarkup(
      createElement(LoveCompatibilityPreview, { locale: "en" }),
    );

    expect(html).toContain("Love Compatibility by Zodiac Age");
    expect(html).toContain("Active tool");
    expect(html).toContain("Zodiac Branch");
    expect(html).toContain("Five Elements");
  });
});

describe("DailyHoroscopePreview", () => {
  it("renders daily horoscope shell with coming soon badge in Vietnamese", () => {
    const html = renderToStaticMarkup(
      createElement(DailyHoroscopePreview, { locale: "vi" }),
    );

    expect(html).toContain("Tử Vi Hôm Nay 12 Con Giáp");
    expect(html).toContain("Sắp ra mắt");
    expect(html).toContain("Chọn con giáp của bạn");
    expect(html).toContain("Hôm nay của bạn · Hội viên");
    expect(html).toContain("Lập lá số Tử Vi của bạn");
  });

  it("renders daily horoscope shell in English", () => {
    const html = renderToStaticMarkup(
      createElement(DailyHoroscopePreview, { locale: "en" }),
    );

    expect(html).toContain("Daily Horoscope 12 Zodiacs");
    expect(html).toContain("Coming Soon");
  });
});
