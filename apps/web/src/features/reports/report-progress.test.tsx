import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportFailedViewV1, ReportPendingViewV1 } from "@lasoviet/contracts";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../messages/en/reports.json")).default;

  return {
    useTranslations: (namespace: string) => {
      return (key: string) => {
        const messages = namespace === "reports" ? viMessages : viMessages;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        return typeof val === "string" ? val : key;
      };
    },
  };
});

import {
  ReportProgress,
  formatReportTimestamp,
  buildSupportMailto,
} from "./report-progress";

const mockPendingVi: ReportPendingViewV1 = {
  version: 1,
  state: "pending",
  reportId: "rep-pending-1",
  reportVersionId: "rep-ver-p-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "generating",
  refreshAfterMs: 5000,
};

const mockFailedVi: ReportFailedViewV1 = {
  version: 1,
  state: "failed",
  reportId: "rep-failed-1",
  reportVersionId: "rep-ver-f-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "terminal_failure",
  invoiceNumber: "LSV-INV-9999",
  paymentReceivedAt: "2026-09-08T10:00:00.000Z",
  reportStatusUpdatedAt: "2026-09-08T10:05:00.000Z",
  supportEmail: "support@lasoviet.vn",
  supportSubject: "Yêu cầu hỗ trợ báo cáo LSV-INV-9999",
  supportReference: "REF-SUP-9999",
};

const mockFailedEn: ReportFailedViewV1 = {
  ...mockFailedVi,
  locale: "en",
  supportSubject: "Support request for report LSV-INV-9999",
};

describe("ReportProgress component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatReportTimestamp", () => {
    it("formats ISO string into Asia/Ho_Chi_Minh in Vietnamese format", () => {
      const formatted = formatReportTimestamp("2026-09-08T10:00:00.000Z", "vi");
      expect(formatted).toBe("17:00 08/09/2026");
    });

    it("formats ISO string into Asia/Ho_Chi_Minh in English format", () => {
      const formatted = formatReportTimestamp("2026-09-08T10:00:00.000Z", "en");
      expect(formatted).toBe("2026-09-08 17:00");
    });

    it("handles invalid date strings gracefully", () => {
      expect(formatReportTimestamp("invalid-date", "vi")).toBe("invalid-date");
    });
  });

  describe("buildSupportMailto", () => {
    it("builds an encoded mailto URL with invoice, support ref, and displayed timestamps without internal IDs", () => {
      const url = buildSupportMailto(mockFailedVi, "vi");
      expect(url.startsWith("mailto:support@lasoviet.vn?")).toBe(true);
      expect(url).toContain(encodeURIComponent("Yêu cầu hỗ trợ báo cáo LSV-INV-9999"));
      expect(url).toContain(encodeURIComponent("LSV-INV-9999"));
      expect(url).toContain(encodeURIComponent("REF-SUP-9999"));
      expect(url).toContain(encodeURIComponent("17:00 08/09/2026"));
      expect(url).toContain(encodeURIComponent("17:05 08/09/2026"));
      // Must not leak internal report IDs
      expect(url).not.toContain("rep-failed-1");
      expect(url).not.toContain("rep-ver-f-1");
      expect(url).not.toContain("ZIWEI-IDENTITY-P0");
    });

    it("builds an English mailto URL with English body text without internal IDs", () => {
      const url = buildSupportMailto(mockFailedEn, "en");
      expect(url.startsWith("mailto:support@lasoviet.vn?")).toBe(true);
      expect(url).toContain(encodeURIComponent("Invoice: LSV-INV-9999"));
      expect(url).toContain(encodeURIComponent("Support reference: REF-SUP-9999"));
      expect(url).toContain(encodeURIComponent("2026-09-08 17:00"));
      expect(url).toContain(encodeURIComponent("2026-09-08 17:05"));
      expect(url).not.toContain("rep-failed-1");
      expect(url).not.toContain("rep-ver-f-1");
    });
  });

  describe("Pending generation state", () => {
    it("renders payment-received confirmation, preparation copy, spinner, and locale-correct library path", () => {
      const html = renderToStaticMarkup(<ReportProgress locale="vi" view={mockPendingVi} />);
      expect(html).toContain("Đã ghi nhận thanh toán thành công.");
      expect(html).toContain("Báo cáo đang được xử lý");
      expect(html).toContain("Đang tổng hợp nội dung luận giải...");
      expect(html).toContain("/tai-khoan/bao-cao");
      expect(html).toContain("report-progress-spinner");

      // No fake percentage, time promise, raw status, or unlock button
      expect(html).not.toContain("%");
      expect(html).not.toContain("phút còn lại");
      expect(html).not.toContain("remaining");
      expect(html).not.toContain("ZIWEI-IDENTITY-P0");
      expect(html).not.toContain("generating");
      expect(html).not.toContain("retry");
    });

    it("renders English library path when locale is en", () => {
      const html = renderToStaticMarkup(
        <ReportProgress locale="en" view={{ ...mockPendingVi, locale: "en" }} />,
      );
      expect(html).toContain("/en/tai-khoan/bao-cao");
    });
  });

  describe("Terminal failure state", () => {
    it("renders invoice, both localized timestamps, support reference, next step, and prefilled support URL", () => {
      const html = renderToStaticMarkup(<ReportProgress locale="vi" view={mockFailedVi} />);

      // Payment confirmation
      expect(html).toContain("Đã ghi nhận thanh toán thành công.");
      expect(html).toContain("Chưa thể hoàn tất báo cáo");

      // All BE-5 facts rendered
      expect(html).toContain("LSV-INV-9999");
      expect(html).toContain("17:00 08/09/2026");
      expect(html).toContain("17:05 08/09/2026");
      expect(html).toContain("REF-SUP-9999");

      // Next step
      expect(html).toContain("Bước xử lý tiếp theo");

      // Support mailto link
      expect(html).toContain("mailto:support@lasoviet.vn?");
      expect(html).toContain(encodeURIComponent("LSV-INV-9999"));
      expect(html).toContain(encodeURIComponent("REF-SUP-9999"));

      // Secondary order history link
      expect(html).toContain("/tai-khoan/don-hang");

      // No internal IDs or raw statuses
      expect(html).not.toContain("rep-failed-1");
      expect(html).not.toContain("rep-ver-f-1");
      expect(html).not.toContain("ZIWEI-IDENTITY-P0");
      expect(html).not.toContain("terminal_failure");
    });

    it("renders English order history link and timestamps when locale is en", () => {
      const html = renderToStaticMarkup(<ReportProgress locale="en" view={mockFailedEn} />);
      expect(html).toContain("2026-09-08 17:00");
      expect(html).toContain("2026-09-08 17:05");
      expect(html).toContain("/en/tai-khoan/don-hang");
    });
  });
});
