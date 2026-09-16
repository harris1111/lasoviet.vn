import { describe, expect, it } from "vitest";

import {
  PersistedEmailDeliveryRequestSchema,
  canonicalizeEmailDeliveryRequest,
} from "./auth-email.js";

const reportFailedRequest = {
  version: 1 as const,
  kind: "report_failed" as const,
  idempotencyKey: "report-failed-email:report-version-1:account-1:pdf",
  recipient: "reader@example.test",
  locale: "vi" as const,
  actionUrl: "https://lasoviet.net/ho-tro/report-case-1",
  requestId: "trace-1",
  reportId: "report-1",
  reportVersionId: "report-version-1",
  failureStage: "pdf" as const,
  supportCaseId: "support-case-1",
};

describe("persisted email delivery contracts", () => {
  it("accepts a safe report_failed request and canonicalizes its stable lineage", () => {
    const parsed = PersistedEmailDeliveryRequestSchema.safeParse(reportFailedRequest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(JSON.parse(canonicalizeEmailDeliveryRequest(parsed.data))).toMatchObject({
        kind: "report_failed",
        reportId: "report-1",
        reportVersionId: "report-version-1",
        failureStage: "pdf",
        supportCaseId: "support-case-1",
      });
    }
  });

  it("rejects missing support case and internal error details", () => {
    expect(
      PersistedEmailDeliveryRequestSchema.safeParse({
        ...reportFailedRequest,
        supportCaseId: "   ",
      }).success,
    ).toBe(false);
    expect(
      PersistedEmailDeliveryRequestSchema.safeParse({
        ...reportFailedRequest,
        errorDetail: "internal storage response",
      }).success,
    ).toBe(false);
  });
});
