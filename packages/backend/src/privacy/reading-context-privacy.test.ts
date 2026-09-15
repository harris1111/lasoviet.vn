import { describe, expect, it, vi } from "vitest";

import type { AnalyticsRepository } from "../analytics/analytics.repository.js";
import { createAnalyticsService } from "../analytics/analytics.service.js";

describe("reading-context analytics privacy boundary", () => {
  it("rejects every prohibited reading-context property without recording an event", async () => {
    const recordEvent = vi.fn().mockResolvedValue({
      ok: true,
      replayed: false,
      event: { id: "event-payment-confirmed" },
    });
    const repository = { recordEvent } as unknown as AnalyticsRepository;
    const service = createAnalyticsService({ repository });
    const properties = {
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      payment_method: "bank_transfer",
    };

    await expect(
      service.ingest({
        idempotencyKey: "reading-context-privacy-positive",
        visitorId: "visitor-reading-context-privacy",
        name: "payment_confirmed",
        properties,
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(recordEvent).toHaveBeenCalled();
    recordEvent.mockClear();

    for (const propertyName of [
      "readingContext",
      "reading_context",
      "lifeStage",
      "life_stage",
      "topConcern",
      "top_concern",
    ]) {
      await expect(
        service.ingest({
          idempotencyKey: `reading-context-privacy-${propertyName}`,
          visitorId: "visitor-reading-context-privacy",
          name: "payment_confirmed",
          properties: {
            ...properties,
            [propertyName]: "redacted",
          },
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "ANALYTICS_EVENT_INVALID" },
      });
    }

    expect(recordEvent).not.toHaveBeenCalled();
  });
});
