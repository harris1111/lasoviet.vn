import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAnonymousDataDeletion } from "./delete-anonymous-data";

describe("anonymous data deletion", () => {
  it("deletes through the authorized private API before clearing the session", async () => {
    const events: string[] = [];
    const request = vi.fn(async () => {
      events.push("delete");
      return {
        ok: true,
        value: { actorId: "anonymous-1" },
      };
    });
    const deleteData = createAnonymousDataDeletion({
      resolveCurrentActor: vi.fn().mockResolvedValue({
        kind: "anonymous",
        anonymousActorId: "anonymous-1",
        sessionId: "session-1",
        requestId: "request-1",
        expiresAt: "2026-09-03T00:00:00+00:00",
      }),
      privateApiClient: vi.fn().mockReturnValue({ request }),
      signOut: vi.fn(async () => {
        events.push("sign-out");
      }),
    });

    await expect(deleteData()).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith("/privacy/anonymous", {
      method: "DELETE",
    });
    expect(events).toEqual(["delete", "sign-out"]);
  });

  it("does not widen deletion to account actors", async () => {
    const request = vi.fn();
    const signOut = vi.fn();
    const deleteData = createAnonymousDataDeletion({
      resolveCurrentActor: vi.fn().mockResolvedValue({
        kind: "account",
        userId: "account-1",
        sessionId: "session-1",
        requestId: "request-1",
      }),
      privateApiClient: vi.fn().mockReturnValue({ request }),
      signOut,
    });

    await expect(deleteData()).resolves.toEqual({
      ok: false,
      error: { code: "ANONYMOUS_REQUIRED" },
    });
    expect(request).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
