import { describe, expect, it } from "vitest";

import {
  createOrderService,
  PRODUCT_CATALOG,
} from "./order.service.js";

describe("order service", () => {
  it("uses the server catalog price and rejects unsupported SKU", async () => {
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async () => null,
      save: async (order) => order,
      createId: () => "order-1",
    });

    await expect(
      service.create(
        { kind: "account", userId: "account-1", sessionId: "s", requestId: "r" },
        "chart-1",
        "NOT-A-SKU",
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: "SKU_UNSUPPORTED" } });

    await expect(
      service.create(
        { kind: "account", userId: "account-1", sessionId: "s", requestId: "r" },
        "chart-1",
        "ZIWEI-IDENTITY-P0",
      ),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-1",
        amount: PRODUCT_CATALOG["ZIWEI-IDENTITY-P0"].amount,
        currency: "VND",
      },
    });
  });

  it("refuses an owner mismatch, ineligible chart, and duplicate entitlement", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const create = (chart: { ownerId: string; eligible: boolean }, paid = false) =>
      createOrderService({
        findCheckoutAccount: async () => ({
          emailVerified: true,
          isAnonymous: false,
        }),
        findChart: async () => ({ id: "chart-1", ...chart }),
        findReusableEntitlement: async () => (paid ? { id: "entitlement-1" } : null),
        save: async (order) => order,
        createId: () => "order-1",
      }).create(actor, "chart-1", "ZIWEI-IDENTITY-P0");

    await expect(create({ ownerId: "account-2", eligible: true })).resolves.toMatchObject({
      ok: false, error: { code: "CHART_NOT_FOUND" },
    });
    await expect(create({ ownerId: "account-1", eligible: false })).resolves.toMatchObject({
      ok: false, error: { code: "CHART_INELIGIBLE" },
    });
    await expect(create({ ownerId: "account-1", eligible: true }, true)).resolves.toMatchObject({
      ok: false, error: { code: "ENTITLEMENT_EXISTS" },
    });
  });

  it("rejects anonymous actors before it reads a chart or saves an order", async () => {
    const findChart = async () => {
      throw new Error("CHART_LOOKUP_MUST_NOT_RUN");
    };
    const save = async () => {
      throw new Error("ORDER_SAVE_MUST_NOT_RUN");
    };
    const service = createOrderService({
      findCheckoutAccount: async () => null,
      findChart,
      findReusableEntitlement: async () => null,
      save,
      createId: () => "order-1",
    } as never);

    await expect(service.create(
      {
        kind: "anonymous",
        anonymousActorId: "anonymous-1",
        sessionId: "s",
        requestId: "r",
        expiresAt: "2026-09-04T00:00:00+00:00",
      },
      "chart-1",
      "ZIWEI-IDENTITY-P0",
    )).resolves.toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_ACCOUNT_REQUIRED" },
    });
  });

  it("rejects an unverified account before it reads a chart or saves an order", async () => {
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: false,
        isAnonymous: false,
      }),
      findChart: async () => {
        throw new Error("CHART_LOOKUP_MUST_NOT_RUN");
      },
      findReusableEntitlement: async () => null,
      save: async () => {
        throw new Error("ORDER_SAVE_MUST_NOT_RUN");
      },
      createId: () => "order-1",
    } as never);

    await expect(service.create(
      { kind: "account", userId: "account-1", sessionId: "s", requestId: "r" },
      "chart-1",
      "ZIWEI-IDENTITY-P0",
    )).resolves.toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_EMAIL_VERIFICATION_REQUIRED" },
    });
  });
});
