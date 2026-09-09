import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createSePayWebhookService } from "./sepay-webhook.service.js";
import { generatePaymentCode } from "./payment-code.js";

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

  it("persists unmatched and acknowledges success when recordPaid returns non-ok for hosted ORDER_PAID", async () => {
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      recordPaid: async () => ({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" }),
      recordUnmatched,
    });
    const payload = {
      notification_type: "ORDER_PAID",
      order: { order_invoice_number: "LSV-order-1", order_amount: "1", order_currency: "VND", order_status: "CAPTURED" },
      transaction: { transaction_id: "event-1", transaction_amount: "1", transaction_currency: "VND", transaction_status: "APPROVED", transaction_type: "PAYMENT" },
    };
    await expect(service.handle({
      rawBody: JSON.stringify(payload),
      secretHeader: "synthetic-sepay-secret",
      traceId: "trace",
    })).resolves.toMatchObject({ ok: true, value: { acknowledged: true } });
    expect(recordUnmatched).toHaveBeenCalledWith({
      providerEventId: "event-1",
      rawPayload: payload,
      amount: 1,
      reason: "PAYMENT_AMOUNT_MISMATCH",
    });
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
    expect(recordPaid).toHaveBeenCalledWith(expect.objectContaining({ amount: 50_000, matchMethod: "invoice_number" }));
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
  const validPaymentCode = generatePaymentCode();

  const bankTransfer = {
    id: 92704,
    gateway: "Vietcombank",
    transactionDate: "2026-09-05 10:00:00",
    accountNumber: "123456789",
    subAccount: "",
    code: validPaymentCode,
    content: `${validPaymentCode} chuyen tien`,
    transferType: "in",
    description: "NGUYEN VAN A chuyen tien",
    transferAmount: 79000,
    accumulated: 1000000,
    referenceCode: "FT24012345678",
  };

  const nowEpochSeconds = 1757066400;
  const nowClock = () => new Date(nowEpochSeconds * 1000);
  const webhookSecret = "synthetic-webhook-secret";

  function sign(timestamp: number | string, body: string, secret = webhookSecret) {
    const hmac = createHmac("sha256", secret);
    hmac.update(String(timestamp) + "." + body);
    return "sha256=" + hmac.digest("hex");
  }

  it("accepts valid HMAC, scans code, and calls recordPaid with matchMethod 'payment_code'", async () => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const recordUnmatched = vi.fn();
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
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
      paymentCode: validPaymentCode,
      matchMethod: "payment_code",
      providerEventId: "92704",
      amount: 79000,
      currency: "VND",
      traceId: "bank-trace-1",
    });
    expect(recordUnmatched).not.toHaveBeenCalled();
  });

  it("matches intended order from noisy bank content containing one valid code", async () => {
    const targetCode = generatePaymentCode();
    const recordPaid = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const payload = {
      ...bankTransfer,
      code: null,
      content: `CT DEN:513423 ${targetCode} CHUYEN TIEN HOC PHI`,
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-noisy",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).toHaveBeenCalledWith(expect.objectContaining({
      paymentCode: targetCode,
      matchMethod: "payment_code",
      providerEventId: "92704",
    }));
  });

  it("persists one unmatched row and returns HTTP 200 on completely corrupted content", async () => {
    const recordPaid = vi.fn();
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    const payload = { ...bankTransfer, code: "", content: "GIBBERISH CONTENT WITHOUT CODE" };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-corrupted",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).not.toHaveBeenCalled();
    expect(recordUnmatched).toHaveBeenCalledWith({
      providerEventId: "92704",
      rawPayload: payload,
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
    });
  });

  it("persists unmatched and never calls paid matching on invalid checksum", async () => {
    const recordPaid = vi.fn();
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    // Invert the checksum character
    const badCode = `${validPaymentCode.slice(0, 11)}${validPaymentCode[11] === "0" ? "1" : "0"}`;
    const payload = { ...bankTransfer, code: badCode, content: badCode };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-bad-checksum",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).not.toHaveBeenCalled();
    expect(recordUnmatched).toHaveBeenCalledWith({
      providerEventId: "92704",
      rawPayload: payload,
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
    });
  });

  it("persists unmatched and acknowledges when code is unknown or amount mismatches", async () => {
    const recordPaid = vi.fn().mockResolvedValue({ ok: false, code: "ORDER_NOT_FOUND" });
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    const rawBody = JSON.stringify(bankTransfer);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-unknown",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordUnmatched).toHaveBeenCalledWith(expect.objectContaining({
      providerEventId: "92704",
      reason: "ORDER_NOT_FOUND",
    }));

    // Test amount mismatch returned by recordPaid
    recordPaid.mockResolvedValueOnce({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" });
    const resultMismatch = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-mismatch",
    });
    expect(resultMismatch).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordUnmatched).toHaveBeenCalledWith(expect.objectContaining({
      providerEventId: "92704",
      reason: "PAYMENT_AMOUNT_MISMATCH",
    }));
  });

  it("does not synthesize valid code across split code='LSV' and content='000000000', persists unmatched and never calls recordPaid", async () => {
    const recordPaid = vi.fn();
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    const payload = {
      ...bankTransfer,
      code: "LSV",
      content: "000000000",
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-split-fields",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).not.toHaveBeenCalled();
    expect(recordUnmatched).toHaveBeenCalledWith({
      providerEventId: "92704",
      rawPayload: payload,
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
    });
  });

  it("persists unmatched and never guesses when two distinct valid codes are present", async () => {
    const codeA = generatePaymentCode(() => new Uint8Array([1, 2, 3, 4, 5]));
    const codeB = generatePaymentCode(() => new Uint8Array([6, 7, 8, 9, 10]));
    const recordPaid = vi.fn();
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: false });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    const payload = { ...bankTransfer, code: codeA, content: `${codeA} and ${codeB}` };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-multiple",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });
    expect(recordPaid).not.toHaveBeenCalled();
    expect(recordUnmatched).toHaveBeenCalledWith({
      providerEventId: "92704",
      rawPayload: payload,
      amount: 79000,
      reason: "MULTIPLE_PAYMENT_CODES",
    });
  });

  it("returns acknowledged with replayed true on duplicate unmatched provider event", async () => {
    const recordPaid = vi.fn();
    const recordUnmatched = vi.fn().mockResolvedValue({ ok: true, replayed: true });
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
      recordUnmatched,
    });
    const payload = { ...bankTransfer, code: "", content: "NO CODE" };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-duplicate-unmatched",
    });

    expect(result).toEqual({ ok: true, value: { acknowledged: true, replayed: true } });
  });

  it.each([
    ["null", null],
    ["object", {}],
    ["array", [92704]],
    ["string numeric", "92704"],
    ["empty string", ""],
    ["non-integer float", 92704.5],
    ["zero", 0],
    ["negative", -92704],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ])("rejects invalid bank id boundary case: %s", async (_label, invalidId) => {
    const recordPaid = vi.fn();
    const service = createSePayWebhookService({
      secretKey: "synthetic-sepay-secret",
      webhookSecret,
      now: nowClock,
      recordPaid,
    });
    const payload = { ...bankTransfer, id: invalidId };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(nowEpochSeconds);
    const signature = sign(timestamp, rawBody);

    const result = await service.handle({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
      traceId: "bank-trace-invalid-id",
    });

    expect(result).toEqual({ ok: false, error: { code: "SEPAY_PAYLOAD_INVALID" } });
    expect(recordPaid).not.toHaveBeenCalled();
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
      signatureHeader: signatureHeader,
      timestampHeader: timestampHeader,
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
