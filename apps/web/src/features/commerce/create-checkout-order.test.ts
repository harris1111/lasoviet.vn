import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor";
import { privateApiClient } from "../../api/private-api-client";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../auth/resolve-current-actor", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));
vi.mock("../../api/private-api-client", () => ({ privateApiClient: vi.fn() }));

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

describe("create checkout order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects anonymous or unverified purchase intent to the existing sign-in flow without calling commerce", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi");

    expect(privateApiClient).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-1%2Fchon-luan-giai",
    );
  });

  it("creates an order only after resolving a verified account", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: { order: { id: "order-1" } },
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "en");

    expect(privateApiClient).toHaveBeenCalledWith(actor, actor.requestId);
    expect(redirect).toHaveBeenCalledWith("/en/thanh-toan/order-1");
  });
});
