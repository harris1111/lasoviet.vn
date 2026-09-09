import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import type { PaidTopicSelectionViewV1 } from "@lasoviet/contracts";

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        let val: unknown = viMessages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

import { PaidTopicSelector } from "./paid-topic-selector";

const mockTopics: PaidTopicSelectionViewV1 = {
  version: 1,
  chartId: "chart-123",
  chartVersionId: "version-456",
  offers: [
    {
      sku: "ZIWEI-IDENTITY-P0",
      method: "ziwei",
      price: 79000,
      currency: "VND",
      sections: ["core-identity", "transformations"],
    },
  ],
};

describe("PaidTopicSelector", () => {
  it("renders Layer 1 disciplines and Layer 2 Zi Wei topics in fixed order", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );

    // Layer 1: Disciplines
    expect(html).toContain("Bộ môn luận giải từ dữ liệu sinh");
    expect(html).toContain("Tử Vi Đẩu Số");
    expect(html).toContain("Bát Tự (Tứ Trụ)");
    expect(html).toContain("Bản đồ sao phương Tây");
    expect(html).toContain("Thần số học (Pitago)");
    expect(html).not.toContain("Kinh Dịch"); // Kinh Dịch is divinatory, not birth-data based

    // Layer 2: Topics in fixed research-backed order
    expect(html).toContain("Chủ đề luận giải Tử Vi");
    expect(html).toContain("Luận giải Tử Vi trọn đời");
    expect(html).toContain("Tình duyên &amp; Hôn nhân");
    expect(html).toContain("Công danh &amp; Tài lộc");
    expect(html).toContain("Vận trình năm &amp; Lưu niên");

    // Active card details
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("Thanh toán một lần");
    expect(html).toContain("Tiếp tục thanh toán");
    expect(html).toContain("/bao-cao-mau/tu-vi");

    // Disabled topics have no submit buttons
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(1); // Only the active offer has a submit button
  });

  it("personalizes heading when birthSummary has displayName", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        birthSummary={{
          displayName: "Minh An",
          normalizedCalendar: { kind: "solar", date: "1994-04-12" },
          normalizedTime: { precision: "exact_minute", localTime: "09:05" },
          timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        }}
        locale="vi"
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Chọn chủ đề luận giải cho Minh An");
  });

  it("renders generic heading when birthSummary is omitted or has no displayName", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );

    expect(html).toContain("Chọn chủ đề luận giải chuyên sâu");
    expect(html).not.toContain("cho Minh An");
  });
});
