vi.mock("server-only", () => ({}));

import { describe, expect, it, vi } from "vitest";

import {
  sendServerWelcomeGrantEvent,
  sendServerUpgradePurchasedEvent,
  sendServerGuaranteeClaimedEvent,
} from "./server-funnel-analytics";

describe("server-funnel-analytics", () => {
  const sampleVisitorId = "123e4567-e89b-12d3-a456-426614174000";

  it("sends welcome_grant event with correct properties and idempotency key", async () => {
    const mockSend = vi.fn().mockResolvedValue({ ok: true, value: { replayed: false } });

    const result = await sendServerWelcomeGrantEvent(
      {
        userId: "usr_welcome_1",
        amount: 60,
        balanceAfter: 60,
        grantType: "welcome_verified_account",
      },
      {
        getVisitorId: async () => sampleVisitorId,
        sendIngestCommand: mockSend,
      },
    );

    expect(result).toEqual({ ok: true, replayed: false });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0]![0];
    expect(payload.event).toEqual({
      name: "welcome_grant",
      properties: {
        amount: 60,
        balance_after: 60,
        grant_type: "welcome_verified_account",
      },
    });
    expect(payload.idempotencyKey).toBe("welcome-grant:usr_welcome_1");
    expect(payload.userId).toBe("usr_welcome_1");
    // Ensure no forbidden data in event properties
    expect(payload.event.properties).not.toHaveProperty("chart_id");
    expect(payload.event.properties).not.toHaveProperty("birth_date");
  });

  it("sends upgrade_purchased event with correct properties and idempotency key", async () => {
    const mockSend = vi.fn().mockResolvedValue({ ok: true, value: { replayed: false } });

    const result = await sendServerUpgradePurchasedEvent(
      {
        userId: "usr_upgrade_1",
        sourceSku: "ZIWEI-NATAL-EXCERPT-P0",
        targetSku: "ZIWEI-IDENTITY-P0",
        amount: 720,
        currency: "LA",
        idempotencyKey: "upgrade:usr_upgrade_1:order_123",
      },
      {
        getVisitorId: async () => sampleVisitorId,
        sendIngestCommand: mockSend,
      },
    );

    expect(result).toEqual({ ok: true, replayed: false });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0]![0];
    expect(payload.event).toEqual({
      name: "upgrade_purchased",
      properties: {
        source_sku: "ZIWEI-NATAL-EXCERPT-P0",
        target_sku: "ZIWEI-IDENTITY-P0",
        amount: 720,
        currency: "LA",
      },
    });
    expect(payload.idempotencyKey).toBe("upgrade:usr_upgrade_1:order_123");
  });

  it("sends guarantee_claimed event with correct properties and idempotency key", async () => {
    const mockSend = vi.fn().mockResolvedValue({ ok: true, value: { replayed: false } });

    const result = await sendServerGuaranteeClaimedEvent(
      {
        userId: "usr_claim_1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        amountRestored: 240,
        reason: "inaccurate",
        sectionId: "palace_1",
        idempotencyKey: "guarantee:usr_claim_1:claim_123",
      },
      {
        getVisitorId: async () => sampleVisitorId,
        sendIngestCommand: mockSend,
      },
    );

    expect(result).toEqual({ ok: true, replayed: false });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0]![0];
    expect(payload.event).toEqual({
      name: "guarantee_claimed",
      properties: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        amount: 240,
        amount_restored: 240,
        reason: "inaccurate",
        section_id: "palace_1",
      },
    });
  });
});
