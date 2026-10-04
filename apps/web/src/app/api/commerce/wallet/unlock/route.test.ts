import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

vi.mock("../../../../../analytics/server-analytics.js", () => ({
  sendServerAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true, replayed: false }),
}));

import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client.js";

vi.mock("../../../../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));

vi.mock("../../../../../api/private-api-client.js", () => ({
  PrivateApiClientError: class PrivateApiClientError extends Error {
    readonly code: string;
    readonly status: number | undefined;
    constructor(code: string, status?: number) {
      super(code);
      this.code = code;
      this.status = status;
    }
  },
  privateApiClient: vi.fn(),
}));

import { sendServerAnalyticsEvent } from "../../../../../analytics/server-analytics.js";

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

function jsonRequest(body: unknown): Request {
  return new Request("https://lasoviet.net/api/commerce/wallet/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/commerce/wallet/unlock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sendServerAnalyticsEvent).mockResolvedValue({ok: true, replayed: false});
  });

  it("returns 401 when not signed in", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { POST } = await import("./route.js");
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(401);
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("spends and returns the report id on success, emitting one la_spent event", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        intent: { id: "intent-1", sku: "ZIWEI-IDENTITY-P0", productTitle: "Lifetime", amountLa: 960, locale: "vi", status: "completed", stateVersion: 2, createdAt: "2026-09-27T10:00:00.000Z" },
        balance: { version: 1, stateVersion: 2, totalLa: 0, purchasedLa: 0, promotionalLa: 0, updatedAt: "2026-09-27T10:00:00.000Z" },
        reportId: "report-1",
      },
    });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    const { POST } = await import("./route.js");
    const response = await POST(
      jsonRequest({
        purchaseIntentId: "intent-1",
        expectedIntentVersion: 1,
        expectedWalletVersion: 1,
        idempotencyKey: "key-1",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reportId).toBe("report-1");
    expect(sendServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "la_spent",
        properties: { sku: "ZIWEI-IDENTITY-P0", amount: 960, balance_after: 0, feature_id: "wallet_unlock_dialog" },
      }),
    );
    expect(sendServerAnalyticsEvent).toHaveBeenCalledTimes(1);
  });

  it("forwards WALLET_INSUFFICIENT_BALANCE with its HTTP status", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(new PrivateApiClientError("WALLET_INSUFFICIENT_BALANCE", 400)),
    });
    const { POST } = await import("./route.js");
    const response = await POST(
      jsonRequest({ purchaseIntentId: "intent-1", expectedIntentVersion: 1, expectedWalletVersion: 1, idempotencyKey: "key-1" }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "WALLET_INSUFFICIENT_BALANCE" });
    expect(sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects an unparsable request body without calling the private API", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const { POST } = await import("./route.js");
    const response = await POST(
      new Request("https://lasoviet.net/api/commerce/wallet/unlock", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  const command = {purchaseIntentId: "intent-1", expectedIntentVersion: 1, expectedWalletVersion: 3, idempotencyKey: "wallet-command-1"};
  const committed = {
    intent: {id: "intent-1", sku: "ZIWEI-IDENTITY-P0", productTitle: "Lifetime", amountLa: 720, locale: "vi", status: "completed", stateVersion: 2, createdAt: "2026-10-04T00:00:00Z"},
    balance: {version: 1, stateVersion: 4, totalLa: 1040, purchasedLa: 0, promotionalLa: 1040, updatedAt: "2026-10-04T00:00:00Z"},
    reportId: "report-1",
    upgradePurchase: {version: 1, eventKey: "upg_0123456789abcdef0123456789abcdef", occurredAt: "2026-10-04T00:00:00Z", targetSku: "ZIWEI-IDENTITY-P0",
      sourceSku: "ZIWEI-PALACE-LIFE-P0", sourceSkus: ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"], chargedLa: 720, creditLa: 240, currency: "LA"},
  };

  it("preserves committed upgrade projection without duplicating its durable producer", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value: committed})});
    const {POST} = await import("./route.js");
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await POST(jsonRequest(command));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(committed);
    }
    const events = vi.mocked(sendServerAnalyticsEvent).mock.calls.map(([value]) => value);
    expect(events).toHaveLength(2);
    expect(events.every(event => event.name === "la_spent")).toBe(true);
  });

  it.each([
    ["ZIWEI-TODAY-P0", 60, null], ["ZIWEI-TODAY-P0", 48, null],
    ["ZIWEI-MONTHLY-P0", 0, "report-1"],
    ["ZIWEI-PALACE-LIFE-P0", 96, "report-1"],
    ["ZIWEI-NATAL-EXCERPT-P0", 192, "report-1"],
    ["ZIWEI-COMBO-2026-P0", 1300, "report-1"],
    ["ZIWEI-COMBO-2026-P0", 1040, "report-1"],
  ] as const)("preserves non-rollover %s completion at %i La", async (sku, amountLa, reportId) => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const value = {...committed, intent: {...committed.intent, sku, amountLa}, reportId, upgradePurchase: null};
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value})});
    const {POST} = await import("./route.js");
    const response = await POST(jsonRequest(command));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(value);
    expect(sendServerAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendServerAnalyticsEvent).mock.calls[0]![0]).toMatchObject({name: "la_spent", properties: {sku, amount: amountLa}});
  });

  it("does not attribute member discounts to rollover credit", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value: {...committed,
      intent: {...committed.intent, amountLa: 768}, upgradePurchase: null}})});
    const {POST} = await import("./route.js");
    expect((await POST(jsonRequest(command))).status).toBe(200);
    expect(sendServerAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendServerAnalyticsEvent).mock.calls[0]![0].name).toBe("la_spent");
  });

  it.each([
    {...committed, intent: {...committed.intent, amountLa: 768}},
    {...committed, intent: {...committed.intent, status: "pending"}},
    {...committed, intent: {...committed.intent, id: "foreign-intent"}},
    {...committed, upgradePurchase: {...committed.upgradePurchase, chartId: "private"}},
    {...committed, balance: {...committed.balance, totalLa: 1041}},
  ])("rejects malformed or mismatched upstream completions without financial events", async value => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value})});
    const {POST} = await import("./route.js");
    expect((await POST(jsonRequest(command))).status).toBe(502);
    expect(sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied upgrade proof before spending", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const {POST} = await import("./route.js");
    expect((await POST(jsonRequest({...command, upgradePurchase: committed.upgradePurchase}))).status).toBe(400);
    expect(privateApiClient).not.toHaveBeenCalled();
    expect(sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("keeps a committed response successful when analytics delivery fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value: committed})});
    vi.mocked(sendServerAnalyticsEvent).mockRejectedValue(new Error("synthetic delivery failure"));
    const {POST} = await import("./route.js");
    const response = await POST(jsonRequest(command));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(committed);
    expect(sendServerAnalyticsEvent).toHaveBeenCalledTimes(1);
  });
});
