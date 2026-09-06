import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createSePayGateway } from "./sepay-adapter.js";

describe("SePay Gateway checkout", () => {
  it("uses the sandbox checkout host and signs the documented ordered fields", () => {
    const secret = "synthetic-sepay-secret";
    const gateway = createSePayGateway({
      environment: "sandbox",
      merchantId: "synthetic-merchant",
      secretKey: secret,
    });
    const checkout = gateway.createPayment({
      id: "order-1",
      invoiceNumber: "LSV-order-1",
      amount: 79_000,
      currency: "VND",
      description: "Zi Wei identity report",
      successUrl: "https://lasoviet.example/thanh-toan/order-1",
      errorUrl: "https://lasoviet.example/thanh-toan/order-1",
      cancelUrl: "https://lasoviet.example/thanh-toan/order-1",
    });
    const signed = [
      "order_amount=79000",
      "merchant=synthetic-merchant",
      "currency=VND",
      "operation=PURCHASE",
      "order_description=Zi Wei identity report",
      "order_invoice_number=LSV-order-1",
      "success_url=https://lasoviet.example/thanh-toan/order-1",
      "error_url=https://lasoviet.example/thanh-toan/order-1",
      "cancel_url=https://lasoviet.example/thanh-toan/order-1",
    ].join(",");

    expect(checkout.action).toBe("https://pay-sandbox.sepay.vn/v1/checkout/init");
    expect(checkout.fields).not.toHaveProperty("payment_method");
    expect(checkout.fields.signature).toBe(
      createHmac("sha256", secret).update(signed).digest("base64"),
    );
  });
});
