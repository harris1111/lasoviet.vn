import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LunarCalendarPreview } from "./lunar-calendar-preview";
import { GoodDaysPreview } from "./good-days-preview";

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

describe("LunarCalendarPreview", () => {
  it("renders live interactive lunar calendar in Vietnamese", () => {
    const html = renderToStaticMarkup(
      createElement(LunarCalendarPreview, { locale: "vi" }),
    );

    // Title & live badge
    expect(html).toContain("Lịch Âm");
    expect(html).toContain("Đang hoạt động");
    expect(html).toContain("Can chi ngày");
    expect(html).toContain("Hoàng Đạo");
    expect(html).toContain("Giờ hoàng đạo");

    // Grid and controls
    expect(html).toContain("Tháng trước");
    expect(html).toContain("Tháng sau");
    expect(html).toContain("Chỉ hiện ngày hoàng đạo");
    expect(html).toContain("Hôm nay");
    expect(html).toContain("Lập lá số cho ngày này");
  });

  it("renders live interactive lunar calendar in English", () => {
    const html = renderToStaticMarkup(
      createElement(LunarCalendarPreview, { locale: "en" }),
    );

    expect(html).toContain("Lunar Calendar");
    expect(html).toContain("Active tool");
    expect(html).toContain("Daily Can Chi");
    expect(html).toContain("Auspicious hours today");
    expect(html).toContain("Build chart for this date");
  });
});

describe("GoodDaysPreview", () => {
  it("renders good days tool with milestone activities and candidate days in Vietnamese", () => {
    const html = renderToStaticMarkup(
      createElement(GoodDaysPreview, { locale: "vi" }),
    );

    // Title & live badge
    expect(html).toContain("Xem Ngày Tốt");
    expect(html).toContain("Đang hoạt động");

    // Activity choices
    expect(html).toContain("Cưới hỏi");
    expect(html).toContain("Khai trương");
    expect(html).toContain("Xuất hành");
    expect(html).toContain("Động thổ");
    expect(html).toContain("Ký kết");
    expect(html).toContain("Chuyển nhà");

    // Candidate table
    expect(html).toContain("Sao trực nhật");
    expect(html).toContain("Căn cứ phù hợp");
    expect(html).toContain("So sánh");
    expect(html).toContain("Xem ngày này trên lá số của bạn");
  });

  it("renders good days tool in English", () => {
    const html = renderToStaticMarkup(
      createElement(GoodDaysPreview, { locale: "en" }),
    );

    expect(html).toContain("Good Days Selection");
    expect(html).toContain("Active tool");
    expect(html).toContain("Wedding");
    expect(html).toContain("Grand Opening");
    expect(html).toContain("Check date against your chart");
  });
});
