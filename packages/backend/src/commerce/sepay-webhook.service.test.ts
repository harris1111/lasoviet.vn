import { describe, expect, it } from "vitest";

import { createSePayWebhookService } from "./sepay-webhook.service.js";

describe("SePay IPN", () => {
  it("requires the documented secret and accepts a paid replay exactly once", async () => {
    let commits = 0;
    let paid = false;
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid: async () => {
        if (paid) return { ok: true, replayed: true };
        paid = true;
        commits += 1;
        return { ok: true, replayed: false };
      },
    });
    const body = JSON.stringify({ notification_type: "ORDER_PAID", order: { order_invoice_number: "LSV-order-1", order_amount: "79000", order_currency: "VND", order_status: "CAPTURED" }, transaction: { transaction_id: "event-1", transaction_amount: "79000", transaction_currency: "VND", transaction_status: "APPROVED", transaction_type: "PAYMENT" } });

    await expect(service.handle({ rawBody: body, secretHeader: "wrong", traceId: "trace" })).resolves.toMatchObject({
      ok: false, error: { code: "SEPAY_SIGNATURE_INVALID" },
    });
    await expect(service.handle({ rawBody: body, secretHeader: "synthetic-sepay-secret", traceId: "trace" })).resolves.toMatchObject({ ok: true });
    await expect(service.handle({ rawBody: body, secretHeader: "synthetic-sepay-secret", traceId: "trace" })).resolves.toMatchObject({ ok: true });
    expect(commits).toBe(1);
  });

  it("fails closed for an amount mismatch", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid: async () => ({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" }),
    });
    await expect(service.handle({
      rawBody: JSON.stringify({ notification_type: "ORDER_PAID", order: { order_invoice_number: "LSV-order-1", order_amount: "1", order_currency: "VND", order_status: "CAPTURED" }, transaction: { transaction_id: "event-1", transaction_amount: "1", transaction_currency: "VND", transaction_status: "APPROVED", transaction_type: "PAYMENT" } }),
      secretHeader: "synthetic-sepay-secret",
      traceId: "trace",
    })).resolves.toMatchObject({ ok: false, error: { code: "PAYMENT_AMOUNT_MISMATCH" } });
  });

  it("rejects paid notifications without captured and approved states", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid: async () => ({ ok: true }),
    });
    await expect(service.handle({
      rawBody: JSON.stringify({ notification_type: "ORDER_PAID", order: { order_invoice_number: "LSV-order-1", order_amount: "79000.00", order_currency: "VND", order_status: "AUTHENTICATION_NOT_NEEDED" }, transaction: { transaction_id: "event-1", transaction_amount: "79000.00", transaction_currency: "VND", transaction_status: "APPROVED", transaction_type: "PAYMENT" } }),
      secretHeader: "synthetic-sepay-secret",
      traceId: "trace",
    })).resolves.toMatchObject({ ok: false, error: { code: "SEPAY_PAYLOAD_INVALID" } });
  });
});
