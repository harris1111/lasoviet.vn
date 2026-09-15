import { describe, expect, it, vi } from "vitest";

import { createAnalyticsService } from "../analytics/analytics.service.js";

describe("reading-context analytics privacy boundary", () => {
  it("rejects every prohibited reading-context property without calling the sink", async () => {
    const sink = { write: vi.fn().mockResolvedValue(undefined) };
    const service = createAnalyticsService({ sink });

    for (const propertyName of [
      "readingContext",
      "reading_context",
      "lifeStage",
      "life_stage",
      "topConcern",
      "top_concern",
    ]) {
      await expect(
        service.emit({
          name: "payment_completed",
          properties: {
            sku: "ZIWEI-IDENTITY-P0",
            price_vnd: 79000,
            payment_provider: "manual",
            [propertyName]: "redacted",
          },
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "ANALYTICS_EVENT_INVALID" },
      });
    }

    expect(sink.write).not.toHaveBeenCalled();
  });
});
