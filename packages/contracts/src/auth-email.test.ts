import { describe, expect, it } from "vitest";

import {
  NotificationPreferencesV1Schema,
  PersistedEmailDeliveryRequestSchema,
  UnsubscribeTokenClaimsSchema,
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

  it("accepts a safe nurture_verified_signin request with a real palace title and unsubscribe URL", () => {
    const nurtureRequest = {
      version: 1 as const,
      kind: "nurture_verified_signin" as const,
      idempotencyKey: "nurture-signin:user-123",
      recipient: "User@Example.Test",
      locale: "vi" as const,
      actionUrl: "https://lasoviet.net/la-so/chart-456?palace=ziwei.palace.career",
      unsubscribeUrl: "https://lasoviet.net/thong-bao/huy-dang-ky#token=unsub-token-789",
      requestId: "req-nurture-1",
      userId: "user-123",
      chartId: "chart-456",
      palaceId: "ziwei.palace.career",
      palaceTitle: "Cung Quan Lộc",
    };

    const parsed = PersistedEmailDeliveryRequestSchema.safeParse(nurtureRequest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recipient).toBe("user@example.test");
      const canonical = JSON.parse(canonicalizeEmailDeliveryRequest(parsed.data));
      expect(canonical).toMatchObject({
        kind: "nurture_verified_signin",
        userId: "user-123",
        chartId: "chart-456",
        palaceId: "ziwei.palace.career",
        palaceTitle: "Cung Quan Lộc",
        unsubscribeUrl: "https://lasoviet.net/thong-bao/huy-dang-ky#token=unsub-token-789",
      });
    }
  });

  it("rejects invalid nurture_verified_signin without palaceTitle or unsubscribeUrl", () => {
    const base = {
      version: 1,
      kind: "nurture_verified_signin",
      idempotencyKey: "nurture-signin:user-123",
      recipient: "user@example.test",
      locale: "vi",
      actionUrl: "https://lasoviet.net/la-so/chart-456",
      requestId: "req-1",
      userId: "user-123",
      chartId: "chart-456",
      palaceId: "ziwei.palace.career",
    };

    expect(PersistedEmailDeliveryRequestSchema.safeParse(base).success).toBe(false);
    expect(
      PersistedEmailDeliveryRequestSchema.safeParse({
        ...base,
        palaceTitle: "Cung Quan Lộc",
        unsubscribeUrl: "not-a-url",
      }).success,
    ).toBe(false);
  });

  it("accepts a safe han_month_reminder request and canonicalizes its lineage", () => {
    const hanRequest = {
      version: 1 as const,
      kind: "han_month_reminder" as const,
      idempotencyKey: "han-reminder:chart-123:2026:7",
      recipient: "reader@example.test",
      locale: "vi" as const,
      actionUrl: "https://lasoviet.net/la-so/chart-123?tab=nam-nay",
      unsubscribeUrl: "https://lasoviet.net/thong-bao/huy-dang-ky#token=unsub-456",
      requestId: "req-han-1",
      userId: "user-123",
      chartId: "chart-123",
      targetYear: 2026,
      monthIndex: 7,
      primaryFocus: "tiền bạc",
      prepText: "Tháng cần đặc biệt chú ý chi tiêu và bảo toàn tài chính.",
      marker: "warn" as const,
    };

    const parsed = PersistedEmailDeliveryRequestSchema.safeParse(hanRequest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const canonical = JSON.parse(canonicalizeEmailDeliveryRequest(parsed.data));
      expect(canonical).toMatchObject({
        kind: "han_month_reminder",
        targetYear: 2026,
        monthIndex: 7,
        primaryFocus: "tiền bạc",
        marker: "warn",
      });
    }
  });

  it("accepts a safe delayed_unlock_completed request and canonicalizes it", () => {
    const unlockRequest = {
      version: 1 as const,
      kind: "delayed_unlock_completed" as const,
      idempotencyKey: "delayed-unlock:order-123:entitlement-456",
      recipient: "reader@example.test",
      locale: "vi" as const,
      actionUrl: "https://lasoviet.net/la-so/chart-123?tab=cung-quan-loc",
      requestId: "req-unlock-1",
      userId: "user-123",
      orderId: "order-123",
      sku: "ZIWEI-PALACE-CAREER",
      itemName: "Cung Quan Lộc",
    };

    const parsed = PersistedEmailDeliveryRequestSchema.safeParse(unlockRequest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const canonical = JSON.parse(canonicalizeEmailDeliveryRequest(parsed.data));
      expect(canonical).toMatchObject({
        kind: "delayed_unlock_completed",
        orderId: "order-123",
        sku: "ZIWEI-PALACE-CAREER",
        itemName: "Cung Quan Lộc",
      });
    }
  });

  it("validates notification preferences and unsubscribe token claims", () => {
    expect(
      NotificationPreferencesV1Schema.safeParse({
        nurtureEmailsAllowed: true,
        hanRemindersAllowed: false,
        unsubscribedAll: false,
      }).success,
    ).toBe(true);

    expect(
      UnsubscribeTokenClaimsSchema.safeParse({
        userId: "user-1",
        email: "user@example.test",
        timestamp: 1727400000000,
      }).success,
    ).toBe(true);
  });
});
