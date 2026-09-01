import { describe, expect, it, vi } from "vitest";

import { createAnalyticsService } from "./analytics.service.js";

describe("analytics service", () => {
  it("rejects forbidden, unknown, and nested properties without calling the sink", async () => {
    const sink = { write: vi.fn().mockResolvedValue(undefined) };
    const service = createAnalyticsService({ sink });

    for (const properties of [
      { email: "person@example.com" },
      { chart_id: "chart-1" },
      { unsupported: "value" },
      { method: { nested: true } },
    ]) {
      await expect(service.emit({ name: "free_summary_viewed", properties }))
        .resolves.toMatchObject({ ok: false, error: { code: "ANALYTICS_EVENT_INVALID" } });
    }
    expect(sink.write).not.toHaveBeenCalled();
  });

  it("accepts configured report and payment metadata when the event permits it", async () => {
    const sink = { write: vi.fn().mockResolvedValue(undefined) };
    const service = createAnalyticsService({ sink });

    await expect(service.emit({
      name: "report_generation_completed",
      properties: { sku: "ZIWEI-IDENTITY-P0", method: "ziwei", duration_bucket: "fast", report_version: "v1" },
    })).resolves.toMatchObject({ ok: true });
    await expect(service.emit({
      name: "payment_completed",
      properties: { sku: "ZIWEI-IDENTITY-P0", price_vnd: 79000, payment_provider: "manual" },
    })).resolves.toMatchObject({ ok: true });
    expect(sink.write).toHaveBeenCalledTimes(2);
  });
});
