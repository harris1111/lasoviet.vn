import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor.js";
import {
  privateApiClient,
  PrivateApiClientError,
} from "../../../../api/private-api-client.js";

vi.mock("../../../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
      this.name = "VerifiedAccountResolutionError";
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));

vi.mock("../../../../api/private-api-client.js", () => ({
  PrivateApiClientError: class PrivateApiClientError extends Error {
    readonly code: string;
    readonly status: number | undefined;
    constructor(code: string, status?: number) {
      super(code);
      this.name = "PrivateApiClientError";
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

const validExportPayload = {
  exportedAt: "2026-09-07T12:00:00.000Z",
  account: {
    id: "account-1",
    name: "Account One",
    email: "user@example.test",
    emailVerified: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  profiles: [],
  charts: [],
  orders: [],
  reports: [],
  consents: [],
  deletionRequest: null,
};

describe("GET /api/account/export", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unverified/anonymous actor with 404 and no-store without enumeration", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps any actor-resolution failure to the same generic 404 response", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("AUTH_CONFIG_INVALID"),
    );
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("returns 200 attachment with json content for verified account actor", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue(validExportPayload),
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="lasoviet-account-export.json"',
    );

    const body = await response.json();
    expect(body.account.email).toBe("user@example.test");
  });

  it("maps ACCOUNT_EXPORT_LIMIT_EXCEEDED from private API to 413 no-store", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi
        .fn()
        .mockRejectedValue(
          new PrivateApiClientError("ACCOUNT_EXPORT_LIMIT_EXCEEDED", 413),
        ),
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await GET(request);

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps private API 404 to 404 no-store", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi
        .fn()
        .mockRejectedValue(
          new PrivateApiClientError("ACCOUNT_RESOURCE_NOT_FOUND", 404),
        ),
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("enforces 5 MiB byte bound and returns 413 no-store with no partial body when payload exceeds limit", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue(validExportPayload),
    });
    const { createAccountExportRouteHandler } = await import("./route.js");

    // Inject low maxBytes limit (e.g. 50 bytes) to test byte length bound
    const handler = createAccountExportRouteHandler({ maxBytes: 50 });
    const request = new Request("https://lasoviet.example/api/account/export");
    const response = await handler(request);

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("ACCOUNT_EXPORT_LIMIT_EXCEEDED");
    // Crucial: no private data leaked in 413 response!
    expect(body.account).toBeUndefined();
    expect(body.profiles).toBeUndefined();
  });
});
