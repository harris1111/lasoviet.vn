import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  return {
    useTranslations: () => {
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

import type { ReportLegacyReadyViewV1 } from "@lasoviet/contracts";
import { ReportReader } from "./report-reader";

const legacyReport: ReportLegacyReadyViewV1 = {
  version: 1,
  state: "ready",
  contentVersion: "identity.v1",
  reportId: "rep-legacy-1",
  reportVersionId: "rep-ver-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  provenance: {
    method: "ziwei",
    ruleVersion: "1.0",
    evidenceVersion: 1,
    knowledgeVersion: "1.0",
    templateVersion: "1.0",
    createdAt: "2026-09-14T00:00:00Z",
  },
  evidence: [],
  content: {
    sections: [
      { id: "personal_summary", title: "Cung Mệnh", narrative: "Bản mệnh vững vàng", claims: [] },
      { id: "identity_analysis", title: "Cung Thân", narrative: "Hậu vận hanh thông", claims: [] },
    ],
    professionalAdviceDisclaimer: "Bản luận giải này mang tính tham khảo, chiêm nghiệm, không thay thế cho các quyết định hay tư vấn chuyên môn về y tế, pháp lý, đầu tư tài chính.",
    reflectionQuestions: [],
    summaryActions: [],
  },
};

describe("ReportReader", () => {
  it("renders legacy reader and produces valid HTML markup without throwing", () => {
    const html = renderToStaticMarkup(
      <ReportReader locale="vi" report={legacyReport} />,
    );
    expect(html).toContain("Cung Mệnh");
    expect(html).toContain("Bản mệnh vững vàng");
    expect(html).toContain("Cung Thân");
  });
});
