import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { CommerceController } from "./commerce.controller.js";

function controller(options: {
  orderTtlSeconds?: number;
  webhookSecret?: string;
  recordPaidResult?: { ok: boolean; replayed?: boolean; code?: string };
} = {}) {
  const database = {
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
  return new CommerceController(
    database as never,
    "internal-secret",
    "provider-secret",
    "ingress-secret",
    "sandbox",
    "merchant",
    "https://lasoviet.example",
    options.orderTtlSeconds ?? 900,
    options.webhookSecret ?? "synthetic-webhook-secret",
  );
}

const nonPaid = Buffer.from(JSON.stringify({
  timestamp: 1,
  notification_type: "TRANSACTION_VOID",
  order: {
    id: "order", order_id: "provider-order", order_status: "CANCELLED",
    order_currency: "VND", order_amount: "79000.00", order_invoice_number: "LSV-order",
    custom_data: [], user_agent: "test", ip_address: "127.0.0.1", order_description: "test",
  },
  transaction: {
    id: "transaction", payment_method: "CARD", transaction_id: "event",
    transaction_type: "PAYMENT", transaction_date: "2026-09-03 00:00:00",
    transaction_status: "DECLINED", transaction_amount: "79000.00", transaction_currency: "VND",
  },
  customer: { id: "customer", customer_id: "customer" },
}));

describe("SePay controller HTTP contract", () => {
  it.each([
    ["vi", "https://lasoviet.example/thanh-toan/order-1"],
    ["en", "https://lasoviet.example/en/thanh-toan/order-1"],
  ] as const)("builds %s hosted callback paths from the persisted order locale", (locale, callbackUrl) => {
    const payment = (
      controller() as unknown as {
        payment(order: {
          id: string;
          invoiceNumber: string;
          amount: number;
          locale: "vi" | "en";
        }): { fields: Record<string, string> };
      }
    ).payment({
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      amount: 79_000,
      locale,
    });

    expect(payment.fields).toMatchObject({
      success_url: callbackUrl,
      error_url: callbackUrl,
      cancel_url: callbackUrl,
    });
  });

  it("rejects an unsigned checkout request before it can reach persistence", async () => {
    await expect(controller().create(undefined, {
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a checkout locale outside vi and en before actor resolution", async () => {
    await expect(controller().create(undefined, {
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      locale: "fr",
    })).resolves.toEqual({
      ok: false,
      error: { code: "COMMERCE_ORDER_INVALID" },
    });
  });

  it("maps ingress and provider authentication failures to 401", async () => {
    await expect(controller().webhook(undefined, "provider-secret", undefined, undefined, { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().webhook("ingress-secret", "wrong", undefined, undefined, { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps malformed provider data to 400", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", undefined, undefined, { rawBody: Buffer.from("{}") }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns exactly the documented acknowledgement for authenticated non-paid notifications", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", undefined, undefined, { rawBody: nonPaid }))
      .resolves.toEqual({ success: true });
  });

  it("rejects invalid HMAC bank webhook with 401", async () => {
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
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    await expect(controller().webhook("ingress-secret", undefined, "sha256=wrong", "1757066400", { rawBody }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects transferType 'out' with 400", async () => {
    const bankTransfer = {
      id: 92704,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:00:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "LSV-order-1",
      content: "LSV-order-1 chuyen tien",
      transferType: "out",
      description: "NGUYEN VAN A chuyen tien",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT24012345678",
    };
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const hmac = createHmac("sha256", "synthetic-webhook-secret");
    hmac.update(String(nowEpochSeconds) + "." + rawBody.toString("utf8"));
    const signature = "sha256=" + hmac.digest("hex");

    await expect(controller().webhook("ingress-secret", undefined, signature, String(nowEpochSeconds), { rawBody }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepts valid HMAC bank webhook through controller boundary and authenticates", async () => {
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
    const rawBody = Buffer.from(JSON.stringify(bankTransfer));
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const hmac = createHmac("sha256", "synthetic-webhook-secret");
    hmac.update(String(nowEpochSeconds) + "." + rawBody.toString("utf8"));
    const signature = "sha256=" + hmac.digest("hex");

    await expect(controller().webhook("ingress-secret", undefined, signature, String(nowEpochSeconds), { rawBody }))
      .rejects.not.toBeInstanceOf(UnauthorizedException);
  });
});
