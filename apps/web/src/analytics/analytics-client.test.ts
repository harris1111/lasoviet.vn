vi.mock("server-only", () => ({}));
import { describe, expect, it, vi } from "vitest";
import type { PrivateAnalyticsIngestRequestV1 } from "@lasoviet/contracts";

import { sendAnalyticsIngestCommand } from "./analytics-client";

const sampleRequest: PrivateAnalyticsIngestRequestV1 = {
  version: 1,
  idempotencyKey: "synthetic-key-1",
  occurredAt: "2026-09-14T10:00:00.000Z",
  event: {
    name: "landing",
    properties: { landing_page: "/vi" },
  },
  visitorId: "123e4567-e89b-12d3-a456-426614174000",
  userId: null,
  requestId: "req-1",
  ip: "203.0.113.195",
  userAgent: "test-ua",
  referrer: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  deviceClass: "desktop",
  locale: "vi",
  pathname: "/vi",
};

describe("analytics-client", () => {
  it("forwards private API call with bearer token and returns success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, value: { replayed: false } }),
    });

    const result = await sendAnalyticsIngestCommand(sampleRequest, {
      privateApiUrl: "http://api.synthetic.test",
      internalActorSecret: "secret-123",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: true, value: { replayed: false } });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("http://api.synthetic.test/internal/analytics/events");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toMatch(/^Bearer ey/);
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers["x-request-id"]).toBe("req-1");
    expect(init.cache).toBe("no-store");
  });

  it("returns error on VISITOR_ACCOUNT_CONFLICT response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        error: {
          code: "VISITOR_ACCOUNT_CONFLICT",
          messageKey: "analytics.visitor_account_conflict",
        },
      }),
    });

    const result = await sendAnalyticsIngestCommand(sampleRequest, {
      privateApiUrl: "http://api.synthetic.test",
      internalActorSecret: "secret-123",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "VISITOR_ACCOUNT_CONFLICT" },
    });
  });

  it("handles network failure gracefully without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const result = await sendAnalyticsIngestCommand(sampleRequest, {
      privateApiUrl: "http://api.synthetic.test",
      internalActorSecret: "secret-123",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ANALYTICS_DELIVERY_FAILED");
    }
  });

  it("returns ANALYTICS_DELIVERY_FAILED on malformed success body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, value: {} }), // missing replayed
    });

    const result = await sendAnalyticsIngestCommand(sampleRequest, {
      privateApiUrl: "http://api.synthetic.test",
      internalActorSecret: "secret-123",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "ANALYTICS_DELIVERY_FAILED" },
    });
  });

  it("returns ANALYTICS_DELIVERY_FAILED on unrecognized error code", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        ok: false,
        error: { code: "NON_EXISTENT_CODE" },
      }),
    });

    const result = await sendAnalyticsIngestCommand(sampleRequest, {
      privateApiUrl: "http://api.synthetic.test",
      internalActorSecret: "secret-123",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "ANALYTICS_DELIVERY_FAILED" },
    });
  });
});
