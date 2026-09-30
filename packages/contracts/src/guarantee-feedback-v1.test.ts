import { describe, expect, it } from "vitest";
import {
  GuaranteeClaimRequestV1Schema,
  GuaranteeClaimResultV1Schema,
  PartFeedbackCreateV1Schema,
  PartFeedbackRatingSchema,
  RelatedPalaceSuggestionV1Schema,
} from "./guarantee-feedback-v1.js";

describe("Part feedback and guarantee contracts", () => {
  it("validates feedback rating enum", () => {
    expect(PartFeedbackRatingSchema.safeParse("accurate").success).toBe(true);
    expect(PartFeedbackRatingSchema.safeParse("partially_accurate").success).toBe(true);
    expect(PartFeedbackRatingSchema.safeParse("inaccurate").success).toBe(true);
    expect(PartFeedbackRatingSchema.safeParse("unknown").success).toBe(false);
  });

  it("validates part feedback creation schema", () => {
    const valid = PartFeedbackCreateV1Schema.safeParse({
      chartId: "chart-123",
      partId: "section-overview",
      rating: "accurate",
      comment: "Rất đúng với tính cách của tôi",
    });
    expect(valid.success).toBe(true);

    const invalid = PartFeedbackCreateV1Schema.safeParse({
      chartId: "",
      partId: "section-overview",
      rating: "invalid_rating",
    });
    expect(invalid.success).toBe(false);
  });

  it("enforces rating must be inaccurate for guarantee claim request", () => {
    const valid = GuaranteeClaimRequestV1Schema.safeParse({
      chartId: "chart-123",
      partId: "ZIWEI-NATAL-EXCERPT-P0",
      rating: "inaccurate",
      comment: "Không đúng với tôi",
      idempotencyKey: "idem-key-123",
    });
    expect(valid.success).toBe(true);

    const invalidAccurate = GuaranteeClaimRequestV1Schema.safeParse({
      chartId: "chart-123",
      partId: "ZIWEI-NATAL-EXCERPT-P0",
      rating: "accurate",
      idempotencyKey: "idem-key-123",
    });
    expect(invalidAccurate.success).toBe(false);

    const invalidPartially = GuaranteeClaimRequestV1Schema.safeParse({
      chartId: "chart-123",
      partId: "ZIWEI-NATAL-EXCERPT-P0",
      rating: "partially_accurate",
      idempotencyKey: "idem-key-123",
    });
    expect(invalidPartially.success).toBe(false);
  });

  it("validates related palace suggestion schema", () => {
    const valid = RelatedPalaceSuggestionV1Schema.safeParse({
      palaceId: "ziwei.palace.travel",
      palaceName: "Cung Thiên Di",
      relationType: "opposite",
      reason: "Đối cung của Mệnh, phản ánh môi trường ngoại vi.",
    });
    expect(valid.success).toBe(true);
  });

  it("validates guarantee claim result schema", () => {
    const valid = GuaranteeClaimResultV1Schema.safeParse({
      claimId: "a0000000-0000-0000-0000-000000000001",
      claimNumber: "GC-ABC123XYZ",
      status: "approved",
      amountLaRestored: 240,
      partId: "ZIWEI-NATAL-EXCERPT-P0",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      balance: {
        version: 1,
        stateVersion: 2,
        purchasedLa: 240,
        promotionalLa: 0,
        totalLa: 240,
        updatedAt: "2026-09-27T10:00:00.000Z",
      },
      receipt: {
        version: 1,
        commandId: "cmd-1",
        transactionId: "tx-1",
        status: "completed",
        balance: {
          version: 1,
          stateVersion: 2,
          purchasedLa: 240,
          promotionalLa: 0,
          totalLa: 240,
          updatedAt: "2026-09-27T10:00:00.000Z",
        },
        completedAt: "2026-09-27T10:00:00.000Z",
      },
      relatedPalaceSuggestion: {
        palaceId: "ziwei.palace.travel",
        palaceName: "Cung Thiên Di",
        relationType: "opposite",
        reason: "Đối cung của Mệnh.",
      },
      createdAt: "2026-09-27T10:00:00.000Z",
    });
    expect(valid.success).toBe(true);
  });
});
