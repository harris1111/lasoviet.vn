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

const value = { version: 1, chartId: "chart", chartVersionId: "cv", locale: "vi", quotedAt: "2026-10-04T00:00:00Z", quotes: [
  { sku: "ZIWEI-IDENTITY-P0", state: "available", basePriceLa: 960, priceLa: 720, creditLa: 240, discountLa: 0, creditExpiresAt: "2026-10-10T00:00:00Z", creditSourceSkus: ["ZIWEI-NATAL-EXCERPT-P0"], reportId: null, reportState: null },
] };
const url = "https://lasoviet.net/api/commerce/wallet/quotes?chartId=chart&chartVersionId=cv&locale=vi";
describe("read-only quote proxy", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor); });
  it("rejects duplicate, unknown and incomplete query before resolving authority", async () => {
    const { GET } = await import("./route.js");
    for (const query of [url + "&locale=en", url + "&priceLa=0", "https://lasoviet.net/api/commerce/wallet/quotes?chartId=chart"]) {
      expect((await GET(new Request(query))).status).toBe(400);
    }
    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("requires a verified account", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    const { GET } = await import("./route.js");
    expect((await GET(new Request(url))).status).toBe(401);
    expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("returns only validated matching quotes with private no-store headers", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, value });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    const { GET } = await import("./route.js");
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    await expect(response.json()).resolves.toEqual(value);
    expect(request).toHaveBeenCalledWith("/commerce/wallet/quotes?chartId=chart&chartVersionId=cv&locale=vi");
  });
  it("fails closed on foreign context, inconsistent arithmetic and extra output fields", async () => {
    const { GET } = await import("./route.js");
    for (const changed of [{ chartId: "foreign" }, { chartVersionId: "other" }, { locale: "en" }, { secret: "private" }, { quotes: [{ ...value.quotes[0], priceLa: 0 }] }]) {
      vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockResolvedValue({ ok: true, value: { ...value, ...changed } }) });
      const response = await GET(new Request(url));
      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({ code: "PRIVATE_API_RESPONSE_INVALID" });
    }
  });
  it("preserves redacted upstream error and status", async () => {
    vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockRejectedValue(new PrivateApiClientError("WALLET_CHART_NOT_FOUND", 404)) });
    const { GET } = await import("./route.js");
    const response = await GET(new Request(url));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ code: "WALLET_CHART_NOT_FOUND" });
  });
});
