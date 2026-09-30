import { beforeEach, describe, expect, it, vi } from "vitest";

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

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

function jsonRequest(body: unknown): Request {
  return new Request("https://lasoviet.net/api/commerce/wallet/purchase-intents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/commerce/wallet/purchase-intents", () => {
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

  it("forwards the request body and returns the created (or reused) intent", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: { id: "intent-1", sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 960, status: "pending", stateVersion: 1, createdAt: "2026-09-27T10:00:00.000Z" },
    });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    const { POST } = await import("./route.js");
    const response = await POST(
      jsonRequest({ chartId: "chart-1", chartVersionId: "version-1", sku: "ZIWEI-IDENTITY-P0", locale: "vi" }),
    );
    expect(request).toHaveBeenCalledWith(
      "/commerce/wallet/purchase-intents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chartId: "chart-1", chartVersionId: "version-1", sku: "ZIWEI-IDENTITY-P0", locale: "vi" }),
      }),
    );
    expect(response.status).toBe(200);
    const value = await response.json();
    expect(value).toMatchObject({ id: "intent-1", amountLa: 960, stateVersion: 1 });
  });

  it("forwards a rejection code (e.g. missing evidence) with its HTTP status", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(new PrivateApiClientError("WALLET_CHART_NOT_FOUND", 400)),
    });
    const { POST } = await import("./route.js");
    const response = await POST(jsonRequest({ chartId: "chart-1", chartVersionId: "v1", sku: "ZIWEI-IDENTITY-P0", locale: "vi" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "WALLET_CHART_NOT_FOUND" });
  });

  it("rejects an unparsable request body without calling the private API", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const { POST } = await import("./route.js");
    const response = await POST(
      new Request("https://lasoviet.net/api/commerce/wallet/purchase-intents", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(privateApiClient).not.toHaveBeenCalled();
  });
});
