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

const validBalance = {
  version: 1,
  totalLa: 240,
  purchasedLa: 180,
  promotionalLa: 60,
  updatedAt: "2026-09-27T10:00:00.000+07:00",
};

describe("GET /api/commerce/wallet/balance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { GET } = await import("./route.js");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("returns the parsed balance on success", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({ ok: true, value: validBalance }),
    });
    const { GET } = await import("./route.js");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(validBalance);
  });

  it("forwards the private API's error code and status", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(new PrivateApiClientError("WALLET_ACCOUNT_INELIGIBLE", 403)),
    });
    const { GET } = await import("./route.js");
    const response = await GET();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "WALLET_ACCOUNT_INELIGIBLE" });
  });

  it("returns 502 on a malformed upstream envelope", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({ ok: true, value: { totalLa: "not-a-number" } }),
    });
    const { GET } = await import("./route.js");
    const response = await GET();
    expect(response.status).toBe(502);
  });
});
