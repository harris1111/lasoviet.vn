import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../../../../../api/private-api-client.js";

vi.mock("../../../../../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));

vi.mock("../../../../../../api/private-api-client.js", () => ({
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

const validCheckoutStatus = {
  order: {
    id: "order-1",
    status: "pending",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    productTitle: "Luận giải Tử Vi toàn diện",
    paymentCode: "LSVK7M2P9QXJ",
    chartId: "chart-1",
    createdAt: "2026-09-05T00:00:00.000Z",
    creditApplied: 0,
    creditExpiresAt: null,
    supportUrl: "/lien-he?order=LSV-order-1",
  },
  paymentInstructions: {
    bankCode: "VCB",
    accountNumber: "123456789",
    accountHolder: "LA SO VIET",
    amount: 79000,
    currency: "VND",
    transferDescription: "LSV-order-1",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-1&template=compact",
    expiresAt: "2026-09-05T00:15:00.000Z",
  },
  reportId: null,
};

describe("GET /api/commerce/orders/[orderId]/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps anonymous or unverified user to 404 without enumeration", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/commerce/orders/order-1/status");
    const response = await GET(request, { params: Promise.resolve({ orderId: "order-1" }) });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("maps cross-owner or nonexistent order to 404 without enumeration", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "ORDER_NOT_FOUND" },
      }),
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/commerce/orders/order-cross/status");
    const response = await GET(request, { params: Promise.resolve({ orderId: "order-cross" }) });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps 404 from private API client to 404 without enumeration", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(new PrivateApiClientError("ORDER_NOT_FOUND", 404)),
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/commerce/orders/order-cross/status");
    const response = await GET(request, { params: Promise.resolve({ orderId: "order-cross" }) });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 200 with no-store and exact CheckoutStatus contract for verified owner", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const requestMock = vi.fn().mockResolvedValue({
      ok: true,
      value: validCheckoutStatus,
    });
    vi.mocked(privateApiClient).mockReturnValue({
      request: requestMock,
    });
    const { GET } = await import("./route.js");

    const request = new Request("https://lasoviet.example/api/commerce/orders/order-1%2Fspecial/status");
    const response = await GET(request, { params: Promise.resolve({ orderId: "order-1/special" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");

    expect(privateApiClient).toHaveBeenCalledWith(actor, actor.requestId);
    expect(requestMock).toHaveBeenCalledWith("/commerce/orders/order-1%2Fspecial");

    const data = await response.json();
    expect(data).toEqual(validCheckoutStatus);
  });
});
