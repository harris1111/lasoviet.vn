import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client.js";
vi.mock("../../../../../auth/resolve-current-actor.js", () => ({ VerifiedAccountResolutionError: class extends Error {}, resolveVerifiedAccountActor: vi.fn() }));
vi.mock("../../../../../api/private-api-client.js", () => ({ PrivateApiClientError: class extends Error {}, privateApiClient: vi.fn() }));
import { GET } from "./route.js";
const actor = { kind: "account" as const, userId: "owner", sessionId: "session", requestId: "request" };
const hint = { version: 1, ownerId: "owner", intentId: "11111111-1111-4111-8111-111111111111", chartId: "chart", chartVersionId: "version", sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "vi", priceLa: 240, balanceLa: 60, gapLa: 180 };
const url = "https://lasoviet.net/api/commerce/wallet/pending-unlock?locale=vi";
describe("private recovery hint projection", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor); });
  it.each(["", "?locale=xx", "?locale=vi&locale=en", "?locale=vi&ownerId=victim"])("rejects unbounded query %s before authentication", async query => {
    expect((await GET(new Request(url.split("?")[0] + query))).status).toBe(400);
    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
  });
  it("requires verified authority before private API access", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    const result = await GET(new Request(url)); expect(result.status).toBe(401);
    expect(result.headers.get("cache-control")).toBe("no-store"); expect(privateApiClient).not.toHaveBeenCalled();
  });
  it.each([hint, null])("returns validated private projection or absence", async value => {
    const request = vi.fn().mockResolvedValue({ ok: true, value }); vi.mocked(privateApiClient).mockReturnValue({ request });
    const result = await GET(new Request(url)); expect(result.status).toBe(200); expect(await result.json()).toEqual(value);
    expect(result.headers.get("x-robots-tag")).toBe("noindex, nofollow"); expect(result.headers.get("cache-control")).toBe("no-store");
    expect(request).toHaveBeenCalledExactlyOnceWith("/commerce/wallet/pending-unlock?locale=vi");
  });
  it.each([{ownerId: "victim"}, {locale: "en"}, {gapLa: 179}, {priceLa: 0}, {birthDate: "private"}, {intentId: "not-an-intent"}])("fails closed on foreign or malformed hint", async changed => {
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockResolvedValue({ok: true, value: {...hint, ...changed}})});
    const result = await GET(new Request(url)); expect(result.status).toBe(502); expect(await result.text()).toBe("");
  });
  it("redacts upstream failures", async () => {
    vi.mocked(privateApiClient).mockReturnValue({request: vi.fn().mockRejectedValue(new PrivateApiClientError("secret"))});
    const result = await GET(new Request(url)); expect(result.status).toBe(502); expect(await result.text()).toBe("");
  });
});
