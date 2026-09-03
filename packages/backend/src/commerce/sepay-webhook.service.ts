import { timingSafeEqual } from "node:crypto";

type IpN = {
  notification_type: "ORDER_PAID" | "TRANSACTION_VOID";
  order: { order_invoice_number: string; order_amount: string; order_currency: "VND" };
  transaction: { transaction_id: string; transaction_amount: string; transaction_currency: "VND"; transaction_status: string };
};

function ipn(value: unknown): IpN | null {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;
  const order = body.order as Record<string, unknown> | undefined;
  const transaction = body.transaction as Record<string, unknown> | undefined;
  if (
    (body.notification_type !== "ORDER_PAID" && body.notification_type !== "TRANSACTION_VOID") ||
    order === undefined || transaction === undefined ||
    typeof order.order_invoice_number !== "string" || !/^\d+(\.\d+)?$/.test(String(order.order_amount)) ||
    order.order_currency !== "VND" || typeof transaction.transaction_id !== "string" ||
    !/^\d+(\.\d+)?$/.test(String(transaction.transaction_amount)) ||
    transaction.transaction_currency !== "VND" || typeof transaction.transaction_status !== "string"
  ) return null;
  return {
    notification_type: body.notification_type,
    order: { order_invoice_number: order.order_invoice_number, order_amount: String(order.order_amount), order_currency: "VND" },
    transaction: { transaction_id: transaction.transaction_id, transaction_amount: String(transaction.transaction_amount), transaction_currency: "VND", transaction_status: transaction.transaction_status },
  };
}

function sameSecret(expected: string, received: string | undefined): boolean {
  if (received === undefined) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSePayWebhookService(dependencies: {
  secretKey: string;
  recordPaid(input: {
    invoiceNumber: string; providerEventId: string; amount: number; currency: string; traceId: string;
  }): Promise<{ ok: boolean; replayed?: boolean; code?: string }>;
}) {
  return {
    async handle(input: { rawBody: string; secretHeader?: string; traceId: string }) {
      if (!sameSecret(dependencies.secretKey, input.secretHeader)) {
        return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
      }
      let payload: unknown;
      try {
        payload = JSON.parse(input.rawBody);
      } catch {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }
      const parsed = ipn(payload);
      if (parsed === null) {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }
      if (parsed.notification_type !== "ORDER_PAID") {
        return { ok: true as const, value: { acknowledged: true } };
      }
      if (
        parsed.transaction.transaction_status !== "APPROVED" ||
        parsed.transaction.transaction_amount !== parsed.order.order_amount ||
        parsed.transaction.transaction_currency !== parsed.order.order_currency
      ) return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      const result = await dependencies.recordPaid({
        invoiceNumber: parsed.order.order_invoice_number,
        providerEventId: parsed.transaction.transaction_id,
        amount: Number(parsed.order.order_amount),
        currency: parsed.order.order_currency,
        traceId: input.traceId,
      });
      return result.ok
        ? { ok: true as const, value: { acknowledged: true, replayed: result.replayed === true } }
        : { ok: false as const, error: { code: result.code ?? "PAYMENT_STATE_CONFLICT" } };
    },
  };
}
