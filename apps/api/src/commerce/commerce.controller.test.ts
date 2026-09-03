import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { CommerceController } from "./commerce.controller.js";

function controller() {
  return new CommerceController(
    {} as never,
    "internal-secret",
    "provider-secret",
    "ingress-secret",
    "sandbox",
    "merchant",
    "https://lasoviet.example",
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
  it("maps ingress and provider authentication failures to 401", async () => {
    await expect(controller().webhook(undefined, "provider-secret", { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().webhook("ingress-secret", "wrong", { rawBody: nonPaid }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps malformed provider data to 400", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", { rawBody: Buffer.from("{}") }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns exactly the documented acknowledgement for authenticated non-paid notifications", async () => {
    await expect(controller().webhook("ingress-secret", "provider-secret", { rawBody: nonPaid }))
      .resolves.toEqual({ success: true });
  });
});
