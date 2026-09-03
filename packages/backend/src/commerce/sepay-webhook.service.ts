import { timingSafeEqual } from "node:crypto";

type Order = { id: string; status: "pending" | "paid"; amount: number; currency: string };
type Transaction = {
  findOrder(invoice: string): Promise<Order | null>;
  recordPaid(order: Order): Promise<void>;
};

function sameSecret(expected: string, received: string | undefined): boolean {
  if (received === undefined) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSePayWebhookService(dependencies: {
  secretKey: string;
  transact<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
}) {
  return {
    async handle(input: { rawBody: string; secretHeader?: string }) {
      if (!sameSecret(dependencies.secretKey, input.secretHeader)) {
        return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
      }
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(input.rawBody) as Record<string, unknown>;
      } catch {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }
      if (payload.status !== "ORDER_PAID") return { ok: true as const, value: { acknowledged: true } };
      const invoice = payload.order_invoice_number;
      const amount = payload.order_amount;
      const currency = payload.currency;
      if (typeof invoice !== "string" || typeof amount !== "number" || currency !== "VND") {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }
      return dependencies.transact(async (transaction) => {
        const order = await transaction.findOrder(invoice);
        if (order === null) return { ok: false as const, error: { code: "ORDER_NOT_FOUND" } };
        if (order.amount !== amount || order.currency !== currency) {
          return { ok: false as const, error: { code: "PAYMENT_AMOUNT_MISMATCH" } };
        }
        if (order.status === "paid") return { ok: true as const, value: { acknowledged: true } };
        await transaction.recordPaid(order);
        return { ok: true as const, value: { acknowledged: true } };
      });
    },
  };
}
