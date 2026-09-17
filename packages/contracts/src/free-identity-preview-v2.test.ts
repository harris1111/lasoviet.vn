import { describe, expect, it } from "vitest";

import { FreeIdentityPreviewV2Schema, PaidTopicSelectionViewV2Schema } from "./free-identity-preview-v2.js";

describe("free identity preview V2 contracts", () => {
  it("is strict and Lá-only", () => {
    expect(FreeIdentityPreviewV2Schema.safeParse({
      version: 2, chartId: "chart", chartVersionId: "version", capabilityId: "ziwei.identity.p0",
      previews: [{ sectionId: "coreAxis", teaser: "Đã sẵn sàng.", locked: true }],
    }).success).toBe(true);
    expect(PaidTopicSelectionViewV2Schema.safeParse({
      version: 2, chartId: "chart", chartVersionId: "version",
      offers: [{ sku: "ZIWEI-NATAL-EXCERPT-P0", priceLa: 240, currency: "LA", vndAmount: 240000 }],
    }).success).toBe(false);
  });
});
