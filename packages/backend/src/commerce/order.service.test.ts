import { describe, expect, it } from "vitest";

import {
  createOrderService,
  PRODUCT_CATALOG,
} from "./order.service.js";

describe("order service", () => {
  it("derives the immutable active catalog from config (Acceptance test 5)", () => {
    expect(PRODUCT_CATALOG["ZIWEI-IDENTITY-P0"]).toEqual({
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      capabilityId: "ziwei.identity.p0",
    });
    expect(PRODUCT_CATALOG["ZIWEI-NATAL-EXCERPT-P0"]).toEqual({
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 19000,
      currency: "VND",
      capabilityId: "ziwei.identity.p0",
    });
    expect(Object.keys(PRODUCT_CATALOG).sort()).toEqual([
      "ZIWEI-IDENTITY-P0",
      "ZIWEI-NATAL-EXCERPT-P0",
    ].sort());
  });

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
        "ZIWEI-NATAL-EXCERPT-P0",
      ),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-1",
        amount: 19000,
        currency: "VND",
      },
    });

    await expect(
      service.create(
        { kind: "account", userId: "account-1", sessionId: "s", requestId: "r" },
        "chart-1",
        "ZIWEI-RELATIONSHIP-P0",
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: "SKU_UNSUPPORTED" } });

    await expect(
      service.create(
        { kind: "account", userId: "account-1", sessionId: "s", requestId: "r" },
        "chart-1",
        "BAZI-COMPREHENSIVE-P0",
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
        amount: 79000,
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
  it("prevents purchasing Tier 1 if Tier 2 is already owned on the chart", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async (_chartId, sku) => (sku === "ZIWEI-IDENTITY-P0" ? { id: "ent-tier-2" } : null),
      save: async (order) => order,
      createId: () => "order-1",
    });

    await expect(
      service.create(actor, "chart-1", "ZIWEI-NATAL-EXCERPT-P0"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ENTITLEMENT_EXISTS" },
    });
  });

  it("allows purchasing Tier 2 when Tier 1 is already owned (upgrade)", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async (_chartId, sku) => (sku === "ZIWEI-NATAL-EXCERPT-P0" ? { id: "ent-tier-1" } : null),
      save: async (order) => order,
      createId: () => "order-2",
    });

    await expect(
      service.create(actor, "chart-1", "ZIWEI-IDENTITY-P0"),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-2",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
      },
    });
  });
  it("calculates upgrade credit for Tier-2 when valid Tier-1 credit is present", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const now = new Date("2026-09-11T00:00:00Z");
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async () => null,
      findUpgradeCredit: async () => ({
        credit: 19000,
        sourceOrderId: "order-tier1",
        creditExpiresAt: expiresAt,
      }),
      save: async (order) => order,
      createId: () => "order-upgrade",
    }, { now: () => now });

    await expect(
      service.create(actor, "chart-1", "ZIWEI-IDENTITY-P0"),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-upgrade",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 60000,
        creditApplied: 19000,
        creditedFromOrderId: "order-tier1",
        creditExpiresAt: expiresAt,
      },
    });
  });

  it("floors net upgrade price at zero when credit exceeds price", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const now = new Date("2026-09-11T00:00:00Z");
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const service = createOrderService({
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async () => null,
      findUpgradeCredit: async () => ({
        credit: 100000,
        sourceOrderId: "order-huge-credit",
        creditExpiresAt: expiresAt,
      }),
      save: async (order) => order,
      createId: () => "order-zero",
    }, { now: () => now });

    await expect(
      service.create(actor, "chart-1", "ZIWEI-IDENTITY-P0"),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-zero",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 0,
        creditApplied: 79000,
      },
    });
  });
  it("evaluates creditExpiresAt against injected clock: applies credit at deadline - 1ms and ignores at exact deadline", async () => {
    const actor = { kind: "account" as const, userId: "account-1", sessionId: "s", requestId: "r" };
    const deadline = new Date("2026-09-17T10:00:00.000Z");

    let currentNow = new Date(deadline.getTime() - 1); // -1ms before deadline
    const dependencies = {
      findCheckoutAccount: async () => ({
        emailVerified: true,
        isAnonymous: false,
      }),
      findChart: async () => ({ id: "chart-1", ownerId: "account-1", eligible: true }),
      findReusableEntitlement: async () => null,
      // Even if dependency returns stale credit object, order.service revalidates with its clock
      findUpgradeCredit: async () => ({
        credit: 19000,
        sourceOrderId: "order-source-t1",
        creditExpiresAt: deadline,
      }),
      save: async (order: any) => order,
      createId: () => "order-boundary-test",
    };

    const serviceBeforeDeadline = createOrderService(dependencies, {
      now: () => currentNow,
    });

    // At deadline - 1ms: credit is valid
    await expect(
      serviceBeforeDeadline.create(actor, "chart-1", "ZIWEI-IDENTITY-P0"),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-boundary-test",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 60000,
        creditApplied: 19000,
        creditedFromOrderId: "order-source-t1",
        creditExpiresAt: deadline,
      },
    });

    // At exact deadline (currentNow === deadline): credit is expired and ignored
    currentNow = deadline;
    const serviceAtDeadline = createOrderService(dependencies, {
      now: () => currentNow,
    });

    await expect(
      serviceAtDeadline.create(actor, "chart-1", "ZIWEI-IDENTITY-P0"),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "order-boundary-test",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        creditApplied: 0,
        creditedFromOrderId: null,
        creditExpiresAt: null,
      },
    });
  });
});
