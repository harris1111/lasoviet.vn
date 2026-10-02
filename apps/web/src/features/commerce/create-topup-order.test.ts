import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../analytics/server-analytics.js", () => ({
  sendServerAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true, replayed: false }),
}));

import {
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../api/private-api-client.js";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));
vi.mock("../../api/private-api-client.js", () => {
  class MockPrivateApiClientError extends Error {
    readonly code: string;
    readonly status: number | undefined;
    constructor(code: string, status?: number) {
      super(code);
      this.name = "PrivateApiClientError";
      this.code = code;
      this.status = status;
    }
  }
  return {
    privateApiClient: vi.fn(),
    PrivateApiClientError: MockPrivateApiClientError,
  };
});

import { sendServerAnalyticsEvent } from "../../analytics/server-analytics.js";

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const validTopUpStatus = {
  order: {
    id: "topup-1",
    kind: "wallet_topup" as const,
    status: "pending" as const,
    amount: 99000,
    currency: "VND" as const,
    locale: "vi" as const,
    productTitle: "Gói Khởi Đọc · 1.100 Lá",
    paymentCode: "LSVK7M2P9QXJ",
    chartId: null,
    createdAt: "2026-09-27T00:00:00.000Z",
    creditApplied: 0,
    creditExpiresAt: null,
    creditedLa: null,
    supportUrl: "/lien-he?order=LSV-topup-1",
  },
  paymentInstructions: {
    bankCode: "VCB",
    accountNumber: "123456789",
    accountHolder: "LA SO VIET",
    amount: 99000,
    currency: "VND" as const,
    transferDescription: "LSV-topup-1",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=99000&des=LSV-topup-1&template=compact",
    expiresAt: "2026-09-27T00:15:00.000Z",
  },
  reportId: null,
};

describe("create top-up order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects an anonymous or unverified customer to sign-in with a callback back to /nap-la", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor.js"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await createTopUpOrder("LA-START-1100", "vi");

    expect(privateApiClient).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      `/dang-nhap?callbackURL=${encodeURIComponent("/nap-la")}&fallbackURL=${encodeURIComponent("/nap-la")}`,
    );

    vi.mocked(redirect).mockClear();
    await createTopUpOrder("LA-START-1100", "en");
    expect(redirect).toHaveBeenCalledWith(
      `/en/dang-nhap?callbackURL=${encodeURIComponent("/en/nap-la")}&fallbackURL=${encodeURIComponent("/en/nap-la")}`,
    );
  });

  it("keeps the customer's chosen return path through sign-in", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor.js"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await createTopUpOrder("LA-START-1100", "vi", "/la-so/chart-1/chon-luan-giai");

    expect(redirect).toHaveBeenCalledWith(
      `/dang-nhap?callbackURL=${encodeURIComponent("/la-so/chart-1/chon-luan-giai")}` +
        `&fallbackURL=${encodeURIComponent("/la-so/chart-1/chon-luan-giai")}`,
    );
  });

  it("rejects an unknown pack id before auth or the private API", async () => {
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await expect(createTopUpOrder("LA-NOT-A-PACK", "vi")).rejects.toThrow("TOP_UP_PACK_INVALID");

    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid locale before auth or the private API", async () => {
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await expect(createTopUpOrder("LA-START-1100", "fr")).rejects.toThrow("TOP_UP_LOCALE_INVALID");
    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
  });

  it("creates the order via the wallet top-up endpoint and redirects to checkout", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({ ok: true, value: validTopUpStatus }),
    });
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await createTopUpOrder("LA-START-1100", "vi");

    expect(privateApiClient).toHaveBeenCalledWith(actor, actor.requestId);
    expect(vi.mocked(privateApiClient).mock.results[0]?.value.request).toHaveBeenCalledWith(
      "/commerce/wallet/top-up-orders",
      expect.objectContaining({
        body: JSON.stringify({ packId: "LA-START-1100", locale: "vi" }),
      }),
    );
    expect(sendServerAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "checkout_created",
        properties: { sku: "LA-START-1100", amount: 99000, currency: "VND" },
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/thanh-toan/topup-1");
  });

  it("throws instead of redirecting when the private API call fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(new PrivateApiClientError("TOP_UP_UNAVAILABLE", 503)),
    });
    const { createTopUpOrder } = await import("./create-topup-order.js");

    await expect(createTopUpOrder("LA-START-1100", "vi")).rejects.toThrow("TOP_UP_ORDER_FAILED");
    expect(redirect).not.toHaveBeenCalled();
  });
});
