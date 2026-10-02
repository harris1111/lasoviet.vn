import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../api/private-api-client", () => ({ privateApiClient: vi.fn() }));
import { privateApiClient } from "../api/private-api-client";
import { ensureSessionWelcomeGrant } from "./ensure-session-welcome-grant";

describe("welcome grant on session creation", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses the persisted session identity at the private wallet boundary", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    await ensureSessionWelcomeGrant({ id: "session-1", userId: "owner-1" });
    expect(privateApiClient).toHaveBeenCalledWith(expect.objectContaining({ kind: "account", userId: "owner-1", sessionId: "session-1" }), expect.any(String));
    expect(request).toHaveBeenCalledWith("/commerce/wallet/balance", expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  });
  it("preserves sign-in when the wallet API is unavailable", async () => {
    vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockRejectedValue(new Error("unavailable")) });
    await expect(ensureSessionWelcomeGrant({ id: "session-1", userId: "owner-1" })).resolves.toBeUndefined();
  });
});
