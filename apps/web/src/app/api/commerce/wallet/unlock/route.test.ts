import { beforeEach, describe, expect, it, vi } from "vitest";

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
        intent: { id: "intent-1", sku: "ZIWEI-IDENTITY-P0", amountLa: 960, locale: "vi", status: "completed", stateVersion: 2, createdAt: "2026-09-27T10:00:00.000Z" },
        balance: { version: 1, totalLa: 0, purchasedLa: 0, promotionalLa: 0, updatedAt: "2026-09-27T10:00:00.000Z" },
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
});
