import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ZiweiHoroscopeResultV1 } from "@lasoviet/contracts";

import { ZiweiAnnualTab } from "./ziwei-annual-tab";

vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = ns === "ziwei" ? viZiwei : {};
      return (key: string, params?: Record<string, string | number>) => {
        const parts = key.split(".");
        let curr: any = msgs;
        for (const p of parts) {
          curr = curr?.[p];
        }
        let text = typeof curr === "string" ? curr : key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return text;
      };
    },
  };
});

describe("ZiweiAnnualTab", () => {
  const sampleHoroscope: ZiweiHoroscopeResultV1 = {
    version: 1,
    chartId: "chart-123",
    chartVersionId: "cv-456",
    asOfDate: "2026-09-22",
    isUnlocked: false,
    yearly: {
      targetYear: 2026,
      lunarYear: "Bính Ngọ",
      lunarAge: 35,
      annualPalaceId: "ziwei.palace.career",
      annualPalaceName: "Quan Lộc",
      annualBranch: "Ngọ",
      annualStem: "Bính",
      hanMonthCount: 2,
      favorableMonthCount: 3,
      neutralMonthCount: 7,
      focusAreas: ["tiền bạc", "giấy tờ"],
      summary: "Năm nay có 2 tháng cần chú ý và 3 tháng thuận. Tháng hạn rơi vào chuyện tiền bạc và giấy tờ.",
      months: Array.from({ length: 12 }, (_, i) => {
        const isWarn = i === 2 || i === 6;
        const isGood = i === 0 || i === 4;
        return {
          monthIndex: i + 1,
          marker: isWarn ? ("warn" as const) : isGood ? ("good" as const) : ("neutral" as const),
          isLocked: isWarn,
          monthNumberDisplay: isWarn ? "?" : String(i + 1),
          label: isWarn ? "Tháng hạn, mở để xem" : `Tháng ${i + 1}`,
          palaceId: "ziwei.palace.career" as const,
          palaceName: "Quan Lộc",
          earthlyBranch: "Ngọ",
          heavenlyStem: "Bính",
          primaryFocus: "công việc",
          preparationText: isWarn ? undefined : "Ổn định",
          evidenceKeys: [`annual.month.${i + 1}`],
        };
      }),
      evidenceKeys: ["annual.year.2026.palace.career"],
    },
    daily: {
      solarDate: "2026-09-22",
      solarDateFormatted: "Thứ Ba, 22/9/2026",
      lunarDateFormatted: "12/8 Bính Ngọ",
      dayStemBranch: "Kỷ Hợi",
      solarTerm: "Bạch Lộ",
      touchedPalaceId: "ziwei.palace.children",
      touchedPalaceName: "Tử Tức",
      headline: "Ngày Kỷ Hợi chạm cung Tử Tức của bạn. Mở mỗi sáng trong gói Hội viên.",
      evidenceKeys: ["daily.branch.pig", "daily.palace.children"],
    },
  };

  it("renders year head and summary line properly", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiAnnualTab, {
        chartId: "chart-123",
        horoscope: sampleHoroscope,
        locale: "vi",
      }),
    );

    expect(html).toContain("2026");
    expect(html).toContain("Năm Bính Ngọ của bạn");
    expect(html).toContain("35 tuổi âm · lưu niên tại cung Quan Lộc");
    expect(html).toContain(
      "Năm nay có 2 tháng cần chú ý và 3 tháng thuận. Tháng hạn rơi vào chuyện tiền bạc và giấy tờ.",
    );
  });

  it("renders 12 month items with masked '?' on caution months per FD-059", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiAnnualTab, {
        chartId: "chart-123",
        horoscope: sampleHoroscope,
        locale: "vi",
      }),
    );

    // Month numbers
    expect(html).toContain("<b>?</b>");
    expect(html).toContain("<b>1</b>");
    expect(html).toContain("<b>2</b>");
    expect(html).toContain("<b>4</b>");
    expect(html).toContain("aria-label=\"Tháng hạn, mở để xem\"");
    expect(html).toContain("class=\"month warn\"");
    expect(html).toContain("class=\"month good\"");
  });

  it("renders offer card and 'Hôm nay của bạn' card with real headline", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiAnnualTab, {
        chartId: "chart-123",
        horoscope: sampleHoroscope,
        locale: "vi",
      }),
    );

    expect(html).toContain("Tháng nào, chuyện gì, chuẩn bị ra sao");
    expect(html).toContain("Mở Toàn diện · 960 Lá");
    expect(html).toContain("Hôm nay của bạn");
    expect(html).toContain(
      "Ngày Kỷ Hợi chạm cung Tử Tức của bạn. Mở mỗi sáng trong gói Hội viên.",
    );
  });
});
