import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRedirect = vi.fn((url: string) => {
  const error: Error & { digest?: string } = new Error(`NEXT_REDIRECT:${url}`);
  error.digest = `NEXT_REDIRECT;${url}`;
  throw error;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockSignOut = vi.fn();
vi.mock("../../auth/auth", () => ({
  getAuth: () => ({
    api: {
      signOut: mockSignOut,
    },
  }),
}));

const mockResolveVerifiedAccountActor = vi.fn();
vi.mock("../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: () => mockResolveVerifiedAccountActor(),
}));

const mockRequest = vi.fn();
vi.mock("../../api/private-api-client", () => ({
  privateApiClient: () => ({
    request: (path: string, init?: RequestInit) => mockRequest(path, init),
  }),
}));

import {
  cancelAccountDeletionAction,
  deleteProfile,
  requestAccountDeletionAction,
  signOutAction,
} from "./account-center-actions.js";

const mockActor = {
  kind: "account" as const,
  userId: "user-1",
  sessionId: "session-1",
  requestId: "req-1",
};

describe("account-center server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveVerifiedAccountActor.mockResolvedValue(mockActor);
  });

  it("deleteProfile calls DELETE on birth-profiles and returns ok on success", async () => {
    mockRequest.mockResolvedValueOnce({ ok: true });

    const result = await deleteProfile("prof-1");
    expect(result).toEqual({ ok: true });
    expect(mockRequest).toHaveBeenCalledWith("/birth-profiles/prof-1", {
      method: "DELETE",
    });
  });

  it("deleteProfile returns visible failure without throwing on error", async () => {
    mockRequest.mockRejectedValueOnce(new Error("NETWORK_ERROR"));

    const result = await deleteProfile("prof-1");
    expect(result).toEqual({ ok: false, error: "DELETE_FAILED" });
  });

  it("deleteProfile strictly rejects non-ok or invalid contract responses with visible failure", async () => {
    // Empty object
    mockRequest.mockResolvedValueOnce({});
    let res = await deleteProfile("prof-1");
    expect(res).toEqual({ ok: false, error: "DELETE_FAILED" });

    // Null response
    mockRequest.mockResolvedValueOnce(null);
    res = await deleteProfile("prof-1");
    expect(res).toEqual({ ok: false, error: "DELETE_FAILED" });

    // Explicit ok: false with error code
    mockRequest.mockResolvedValueOnce({ ok: false, error: { code: "PROFILE_NOT_FOUND" } });
    res = await deleteProfile("prof-1");
    expect(res).toEqual({ ok: false, error: "PROFILE_NOT_FOUND" });

    // Invalid payload without ok
    mockRequest.mockResolvedValueOnce({ success: true });
    res = await deleteProfile("prof-1");
    expect(res).toEqual({ ok: false, error: "DELETE_FAILED" });
  });

  it("requestAccountDeletionAction does NOT sign out or redirect on API Result failure", async () => {
    mockRequest.mockResolvedValueOnce({
      ok: false,
      error: { code: "DELETION_ALREADY_REQUESTED" },
    });

    const result = await requestAccountDeletionAction("vi");

    expect(result).toEqual({ ok: false, error: "DELETION_FAILED" });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("requestAccountDeletionAction signs out then redirects after ok: true", async () => {
    mockRequest.mockResolvedValueOnce({
      ok: true,
      value: { requestId: "req-del-1", recoverUntil: "2026-10-01T00:00:00Z" },
    });
    mockSignOut.mockResolvedValueOnce(undefined);

    await expect(requestAccountDeletionAction("vi")).rejects.toThrow(
      "NEXT_REDIRECT:/dang-nhap",
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/dang-nhap");
  });

  it("requestAccountDeletionAction signs out then redirects to English sign-in for en locale", async () => {
    mockRequest.mockResolvedValueOnce({
      ok: true,
      value: { requestId: "req-del-1", recoverUntil: "2026-10-01T00:00:00Z" },
    });
    mockSignOut.mockResolvedValueOnce(undefined);

    await expect(requestAccountDeletionAction("en")).rejects.toThrow(
      "NEXT_REDIRECT:/en/dang-nhap",
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/en/dang-nhap");
  });

  it("cancelAccountDeletionAction returns failure state on API non-success", async () => {
    mockRequest.mockResolvedValueOnce({
      ok: false,
      error: { code: "DELETION_NOT_FOUND" },
    });

    const result = await cancelAccountDeletionAction("vi");
    expect(result).toEqual({ ok: false, error: "CANCEL_FAILED" });
  });

  it("cancelAccountDeletionAction returns ok on success", async () => {
    mockRequest.mockResolvedValueOnce({
      ok: true,
      value: { requestId: "req-1" },
    });

    const result = await cancelAccountDeletionAction("vi");
    expect(result).toEqual({ ok: true });
  });

  it("signOutAction signs out and redirects to home", async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    await expect(signOutAction("vi")).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("signOutAction returns visible error state if sign-out fails", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("SESSION_ERROR"));

    const result = await signOutAction("vi");
    expect(result).toEqual({ ok: false, error: "SIGN_OUT_FAILED" });
  });
});
