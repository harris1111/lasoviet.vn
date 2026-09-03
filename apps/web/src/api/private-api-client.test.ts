import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@lasoviet/config/load-environment", () => ({ loadEnvironment: vi.fn() }));
vi.mock("../auth/create-internal-actor-token", () => ({
  createInternalActorToken: vi.fn(),
}));
vi.mock("../auth/create-internal-admin-preflight-audit-token", () => ({
  createInternalAdminPreflightAuditToken: vi.fn(),
}));

import { loadEnvironment } from "@lasoviet/config/load-environment";

import {
  PrivateApiClientError,
  privateAdminAuditClient,
  privateApiClient,
} from "./private-api-client";
import { createInternalActorToken } from "../auth/create-internal-actor-token";
import { createInternalAdminPreflightAuditToken } from "../auth/create-internal-admin-preflight-audit-token";

const actor = {
  kind: "account" as const,
  userId: "user-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const privateApiOrigin = "https://private-api.example";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadEnvironment).mockReturnValue({
    ok: true,
    value: { privateApiUrl: privateApiOrigin },
  } as never);
  vi.mocked(createInternalActorToken).mockResolvedValue("actor-token");
  vi.mocked(createInternalAdminPreflightAuditToken).mockResolvedValue(
    "preflight-token",
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("private API client", () => {
  it("sends an application-relative request with server-derived credentials", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ profileId: "profile-1" }), { status: 200 }),
    );

    await expect(
      privateApiClient(actor, "request-1").request<{ profileId: string }>(
        "/birth-profiles",
      ),
    ).resolves.toEqual({ profileId: "profile-1" });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe(privateApiOrigin);
    expect(url.pathname).toBe("/birth-profiles");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer actor-token",
    );
    expect(new Headers(init.headers).get("x-request-id")).toBe("request-1");
  });

  it("uses a purpose-bound server credential for preflight denial audits", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      privateAdminAuditClient("request-preflight").recordPreflightDenial(),
    ).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe(privateApiOrigin);
    expect(url.pathname).toBe("/admin/access/preflight-denial");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer preflight-token",
    );
  });

  it.each(["https://attacker.example/steal", "//attacker.example/steal"])(
    "rejects unsafe path %s before issuing actor credentials",
    async (path) => {
      await expect(
        privateApiClient(actor, "request-1").request(path),
      ).rejects.toMatchObject({ code: "PRIVATE_API_PATH_INVALID" });

      expect(createInternalActorToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: "environment loading fails",
      environment: { ok: false, error: { code: "INVALID_ENV" } },
    },
    {
      name: "private API URL is missing",
      environment: { ok: true, value: {} },
    },
    {
      name: "private API URL is malformed",
      environment: { ok: true, value: { privateApiUrl: "not a URL" } },
    },
  ])(
    "preserves PRIVATE_API_UNREACHABLE when $name",
    async ({ environment }) => {
      vi.mocked(loadEnvironment).mockReturnValue(environment as never);

      await expect(
        privateApiClient(actor, "request-1").request("/birth-profiles"),
      ).rejects.toMatchObject({ code: "PRIVATE_API_UNREACHABLE" });

      expect(createInternalActorToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("preserves a safe API error code and status without provider text", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "BIRTH_PROFILE_INVALID",
          message: "Untrusted provider text",
        }),
        { status: 400 },
      ),
    );

    await expect(
      privateApiClient(actor, "request-1").request("/birth-profiles"),
    ).rejects.toEqual(
      new PrivateApiClientError("BIRTH_PROFILE_INVALID", 400),
    );
  });

  it("maps transport and malformed JSON failures to the local error contract", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await expect(
      privateApiClient(actor, "request-1").request("/birth-profiles"),
    ).rejects.toMatchObject({ code: "PRIVATE_API_UNREACHABLE" });

    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect(
      privateApiClient(actor, "request-1").request("/birth-profiles"),
    ).rejects.toMatchObject({ code: "PRIVATE_API_RESPONSE_INVALID" });

    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 400 }));
    await expect(
      privateApiClient(actor, "request-1").request("/birth-profiles"),
    ).rejects.toMatchObject({ code: "PRIVATE_API_RESPONSE_INVALID" });
  });
});
