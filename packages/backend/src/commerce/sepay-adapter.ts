import { createHmac } from "node:crypto";

import type { CheckoutOrder, PaymentProvider } from "./payment-provider.js";

const SIGNED_FIELDS = [
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "customer_id",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
] as const;

type SePayEnvironment = "sandbox" | "production";

function checkoutUrl(environment: SePayEnvironment): string {
  return environment === "sandbox"
    ? "https://pay-sandbox.sepay.vn/v1/checkout/init"
    : "https://pay.sepay.vn/v1/checkout/init";
}

export function createSePayGateway(config: {
  environment: SePayEnvironment;
  merchantId: string;
  secretKey: string;
}): PaymentProvider {
  return {
    createPayment(order: CheckoutOrder) {
      const fields: Record<string, string> = {
        order_amount: String(order.amount),
        merchant: config.merchantId,
        currency: order.currency,
        operation: "PURCHASE",
        order_description: order.description,
        order_invoice_number: order.invoiceNumber,
        success_url: order.successUrl,
        error_url: order.errorUrl,
        cancel_url: order.cancelUrl,
      };
      const signed = SIGNED_FIELDS
        .filter((field) => fields[field] !== undefined)
        .map((field) => `${field}=${fields[field]}`)
        .join(",");
      fields.signature = createHmac("sha256", config.secretKey)
        .update(signed)
        .digest("base64");
      return { action: checkoutUrl(config.environment), fields };
    },
  };
}
