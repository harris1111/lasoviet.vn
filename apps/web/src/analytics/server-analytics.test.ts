import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendServerAnalyticsEvent } from "./server-analytics";

describe("sendServerAnalyticsEvent", () => {
  const validParams = {
    name: "checkout_created" as const,
    properties: {
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
    },
    userId: "user-123",
    idempotencyKey: "checkout-created:order-1",
    occurredAt: "2026-09-05T00:00:00.000Z",
    requestId: "req-123",
  };

  it("calls sendAnalyticsIngestCommand with exact parameters and no forbidden properties", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      ok: true,
      value: { replayed: false },
    });

    const result = await sendServerAnalyticsEvent(validParams, {
      getVisitorId: async () => "123e4567-e89b-12d3-a456-426614174000",
      sendIngestCommand: mockSend as any,
    });

    expect(result).toEqual({ ok: true, replayed: false });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0]![0];
    expect(callArg).toEqual({
      version: 1,
      idempotencyKey: "checkout-created:order-1",
      occurredAt: "2026-09-05T00:00:00.000Z",
      event: {
        name: "checkout_created",
        properties: {
          sku: "ZIWEI-IDENTITY-P0",
          amount: 79000,
          currency: "VND",
        },
      },
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-123",
      requestId: "req-123",
    });

    // Strict check: IDs are not exposed inside event.properties
    expect(callArg.event.properties).not.toHaveProperty("visitorId");
    expect(callArg.event.properties).not.toHaveProperty("userId");
    expect(callArg.event.properties).not.toHaveProperty("orderId");
    expect(callArg.event.properties).not.toHaveProperty("order_id");
  });

  it("returns typed failure when visitor cookie resolution fails without throwing", async () => {
    const mockSend = vi.fn();
    const result = await sendServerAnalyticsEvent(validParams, {
      getVisitorId: async () => {
        throw new Error("Cookie read failed");
      },
      sendIngestCommand: mockSend as any,
    });

    expect(result).toEqual({ ok: false, code: "VISITOR_ID_UNAVAILABLE" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns typed failure when ingest command returns an error", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "ANALYTICS_EVENT_INVALID" },
    });

    const result = await sendServerAnalyticsEvent(validParams, {
      getVisitorId: async () => "123e4567-e89b-12d3-a456-426614174000",
      sendIngestCommand: mockSend as any,
    });

    expect(result).toEqual({ ok: false, code: "ANALYTICS_EVENT_INVALID" });
  });

  it("returns typed delivery failure when ingest command throws unexpectedly", async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error("Network offline"));

    const result = await sendServerAnalyticsEvent(validParams, {
      getVisitorId: async () => "123e4567-e89b-12d3-a456-426614174000",
      sendIngestCommand: mockSend as any,
    });

    expect(result).toEqual({ ok: false, code: "ANALYTICS_DELIVERY_FAILED" });
  });
});
