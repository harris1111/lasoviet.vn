import { describe, expect, it } from "vitest";

import { createSePayWebhookService } from "./sepay-webhook.service.js";

describe("SePay IPN", () => {
  it("requires the documented secret and accepts a paid replay exactly once", async () => {
    let commits = 0;
    const order = { id: "order-1", status: "pending" as const, amount: 79_000, currency: "VND" };
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      transact: async (callback) => callback({
        findOrder: async () => order,
        recordPaid: async () => {
          commits += 1;
          Object.assign(order, { status: "paid" });
        },
      }),
    });
    const body = JSON.stringify({ order_invoice_number: "LSV-order-1", order_amount: 79000, currency: "VND", status: "ORDER_PAID" });

    await expect(service.handle({ rawBody: body, secretHeader: "wrong" })).resolves.toMatchObject({
      ok: false, error: { code: "SEPAY_SIGNATURE_INVALID" },
    });
    await expect(service.handle({ rawBody: body, secretHeader: "synthetic-sepay-secret" })).resolves.toMatchObject({ ok: true });
    await expect(service.handle({ rawBody: body, secretHeader: "synthetic-sepay-secret" })).resolves.toMatchObject({ ok: true });
    expect(commits).toBe(1);
  });

  it("fails closed for an amount mismatch", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      transact: async (callback) => callback({
        findOrder: async () => ({ id: "order-1", status: "pending", amount: 79_000, currency: "VND" }),
        recordPaid: async () => undefined,
      }),
    });
    await expect(service.handle({
      rawBody: JSON.stringify({ order_invoice_number: "LSV-order-1", order_amount: 1, currency: "VND", status: "ORDER_PAID" }),
      secretHeader: "synthetic-sepay-secret",
    })).resolves.toMatchObject({ ok: false, error: { code: "PAYMENT_AMOUNT_MISMATCH" } });
  });
});
