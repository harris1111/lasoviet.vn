import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

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

  it("normalizes documented integer and zero-decimal VND representations before recording", async () => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: true });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid,
    });
    await expect(service.handle({
      rawBody: JSON.stringify({
        notification_type: "ORDER_PAID",
        order: {
          order_invoice_number: "LSV-order-1",
          order_amount: "50000.00",
          order_currency: "VND",
          order_status: "CAPTURED",
        },
        transaction: {
          transaction_id: "event-1",
          transaction_amount: "50000",
          transaction_currency: "VND",
          transaction_status: "APPROVED",
          transaction_type: "PAYMENT",
        },
      }),
      secretHeader: "synthetic-sepay-secret",
      traceId: "trace",
    })).resolves.toMatchObject({ ok: true });
    expect(recordPaid).toHaveBeenCalledWith(expect.objectContaining({ amount: 50_000 }));
  });

  it.each([
    "50000.01",
    "-50000",
    "5e4",
    "50000.000",
    "9007199254740992",
    "not-an-amount",
  ])("rejects an unsafe VND amount %s", async (amount) => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid: async () => ({ ok: true }),
    });
    await expect(service.handle({
      rawBody: JSON.stringify({
        notification_type: "ORDER_PAID",
        order: {
          order_invoice_number: "LSV-order-1",
          order_amount: amount,
          order_currency: "VND",
          order_status: "CAPTURED",
        },
        transaction: {
          transaction_id: "event-1",
          transaction_amount: amount,
          transaction_currency: "VND",
          transaction_status: "APPROVED",
          transaction_type: "PAYMENT",
        },
      }),
      secretHeader: "synthetic-sepay-secret",
      traceId: "trace",
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "SEPAY_PAYLOAD_INVALID" },
    });
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

describe("SePay Bank Webhook (HMAC)", () => {
  const bankTransfer = {
    id: 92704,
    gateway: "Vietcombank",
    transactionDate: "2026-09-05 10:00:00",
    accountNumber: "123456789",
    subAccount: "",
    code: "LSV-order-1",
    content: "LSV-order-1 chuyen tien",
    transferType: "in",
    description: "NGUYEN VAN A chuyen tien",
    transferAmount: 79000,
    accumulated: 1000000,
    referenceCode: "FT24012345678",
  };

  const nowEpochSeconds = 1757066400;
  const nowClock = () => new Date(nowEpochSeconds * 1000);
  const webhookSecret = "synthetic-webhook-secret";

  function sign(timestamp, body, secret = webhookSecret) {
    const hmac = createHmac("sha256", secret);
    hmac.update(timestamp + "." + body);
    return "sha256=" + hmac.digest("hex");
  }

  it("accepts valid HMAC and maps id to string providerEventId", async () => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const rawBody = JSON.stringify(bankTransfer);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-1",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).toHaveBeenCalledWith({
      invoiceNumber: "LSV-order-1",
      providerEventId: "92704",
      amount: 79000,
      currency: "VND",
      traceId: "bank-trace-1",
    });
  });

  it("normalizes payment code falling back to content first token", async () => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const payload = { ...bankTransfer, code: null, content: "  LSV-order-fallback  chuyen khoan hoc phi  " };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-fallback",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).toHaveBeenCalledWith(expect.objectContaining({
      invoiceNumber: "LSV-order-fallback",
      providerEventId: "92704",
    }));
  });

  it("rejects transferType not in", async () => {
    const recordPaid = vi.fn();
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const payload = { ...bankTransfer, transferType: "out" };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-out",
    });

    expect(result).toEqual({ ok: false, error: { code: "SEPAY_PAYLOAD_INVALID" } });
    expect(recordPaid).not.toHaveBeenCalled();
  });

  it("fails closed when amount mismatch is returned from recordPaid", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid: async () => ({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" }),
    });
    const rawBody = JSON.stringify(bankTransfer);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    await expect(service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-mismatch",
    })).resolves.toMatchObject({ ok: false, error: { code: "PAYMENT_AMOUNT_MISMATCH" } });
  });

  it.each([
    ["missing timestamp", undefined, sign(nowEpochSeconds, JSON.stringify(bankTransfer)), "SEPAY_SIGNATURE_INVALID"],
    ["missing signature", String(nowEpochSeconds), undefined, "SEPAY_SIGNATURE_INVALID"],
    ["malformed signature without prefix", String(nowEpochSeconds), "badhexsignature", "SEPAY_SIGNATURE_INVALID"],
    ["wrong secret signature", String(nowEpochSeconds), sign(nowEpochSeconds, JSON.stringify(bankTransfer), "wrong-secret"), "SEPAY_SIGNATURE_INVALID"],
    ["malformed non-integer timestamp", "not-a-number", sign("not-a-number", JSON.stringify(bankTransfer)), "SEPAY_SIGNATURE_INVALID"],
    ["timestamp older than 300 seconds", String(nowEpochSeconds - 301), sign(nowEpochSeconds - 301, JSON.stringify(bankTransfer)), "SEPAY_SIGNATURE_INVALID"],
    ["timestamp future beyond 300 seconds", String(nowEpochSeconds + 301), sign(nowEpochSeconds + 301, JSON.stringify(bankTransfer)), "SEPAY_SIGNATURE_INVALID"],
  ])("rejects invalid HMAC scenario: %s", async (_scenario, timestampHeader, signatureHeader, expectedCode) => {
    const recordPaid = vi.fn();
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });

    const rawBody = JSON.stringify(bankTransfer);
    const result = await service.handle({
      rawBody,
      signatureHeader,
      timestampHeader,
      traceId: "bank-trace-invalid-auth",
    });

    expect(result).toEqual({ ok: false, error: { code: expectedCode } });
    expect(recordPaid).not.toHaveBeenCalled();
  });

  it.each([
    nowEpochSeconds - 300,
    nowEpochSeconds + 300,
  ])("accepts timestamps at exact skew boundaries: %s", async (timestampSec) => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: true });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const rawBody = JSON.stringify(bankTransfer);
    const timestamp = String(timestampSec);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-boundary",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
  });

  it("rejects when both x-secret-key and HMAC headers are absent", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid: async () => ({ ok: true }),
    });
    const result = await service.handle({
      rawBody: JSON.stringify(bankTransfer),
      traceId: "bank-trace-no-auth",
    });
    expect(result).toEqual({ ok: false, error: { code: "SEPAY_SIGNATURE_INVALID" } });
  });

  it("rejects when both x-secret-key and HMAC headers are provided", async () => {
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid: async () => ({ ok: true }),
    });
    const rawBody = JSON.stringify(bankTransfer);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);
    const result = await service.handle({
      rawBody,
      secretHeader: "synthetic-sepay-secret",
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-both-auth",
    });
    expect(result).toEqual({ ok: false, error: { code: "SEPAY_SIGNATURE_INVALID" } });
  });
});