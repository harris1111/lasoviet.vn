import { createHmac, timingSafeEqual } from "node:crypto";
import { extractValidPaymentCodes } from "./payment-code.js";

type IpN = {
  notification_type: "ORDER_PAID" | "TRANSACTION_VOID";
  order: { order_invoice_number: string; order_amount: number; order_currency: "VND"; order_status: string };
  transaction: { transaction_id: string; transaction_amount: number; transaction_currency: "VND"; transaction_status: string; transaction_type: string };
};

function boundedText(value: unknown, pattern: RegExp, max = 128): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && pattern.test(value);
}

function vndAmount(value: unknown): number | null {
  if (!boundedText(value, /^(0|[1-9]\d{0,15})(?:\.0{1,2})?$/, 19)) return null;
  const whole = value.split(".", 1)[0];
  const amount = Number(whole);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function ipn(value: unknown): IpN | null {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;
  const order = body.order as Record<string, unknown> | undefined;
  const transaction = body.transaction as Record<string, unknown> | undefined;
  if (
    (body.notification_type !== "ORDER_PAID" && body.notification_type !== "TRANSACTION_VOID") ||
    order === undefined || transaction === undefined ||
    !boundedText(order.order_invoice_number, /^[A-Za-z0-9_-]+$/) ||
    vndAmount(order.order_amount) === null || order.order_currency !== "VND" ||
    !boundedText(order.order_status, /^(CAPTURED|CANCELLED|AUTHENTICATION_NOT_NEEDED)$/) ||
    !boundedText(transaction.transaction_id, /^[A-Za-z0-9_-]+$/) ||
    vndAmount(transaction.transaction_amount) === null ||
    transaction.transaction_currency !== "VND" ||
    !boundedText(transaction.transaction_status, /^(APPROVED|DECLINED)$/) ||
    !boundedText(transaction.transaction_type, /^(PAYMENT|REFUND)$/)
  ) return null;
  return {
    notification_type: body.notification_type,
    order: { order_invoice_number: order.order_invoice_number, order_amount: vndAmount(order.order_amount)!, order_currency: "VND", order_status: order.order_status },
    transaction: { transaction_id: transaction.transaction_id, transaction_amount: vndAmount(transaction.transaction_amount)!, transaction_currency: "VND", transaction_status: transaction.transaction_status, transaction_type: transaction.transaction_type },
  };
}

function sameSecret(expected: string, received: string | undefined): boolean {
  if (received === undefined) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyHmac(options: {
  webhookSecret: string;
  rawBody: string;
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  now: () => Date;
}): boolean {
  if (options.signatureHeader === undefined || options.timestampHeader === undefined) {
    return false;
  }
  if (!/^sha256=[0-9a-fA-F]{64}$/.test(options.signatureHeader)) {
    return false;
  }
  if (!/^\d+$/.test(options.timestampHeader)) {
    return false;
  }
  const timestampSec = Number(options.timestampHeader);
  if (!Number.isSafeInteger(timestampSec)) {
    return false;
  }
  const currentSec = Math.floor(options.now().getTime() / 1000);
  if (Math.abs(currentSec - timestampSec) > 300) {
    return false;
  }
  const hmac = createHmac("sha256", options.webhookSecret);
  hmac.update(`${options.timestampHeader}.${options.rawBody}`);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;
  const a = Buffer.from(expectedSignature);
  const b = Buffer.from(options.signatureHeader.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSePayWebhookService(dependencies: {
  secretKey: string;
  webhookSecret?: string;
  now?: () => Date;
  recordPaid(input: {
    invoiceNumber?: string;
    paymentCode?: string;
    matchMethod?: "invoice_number" | "payment_code";
    providerEventId: string;
    amount: number;
    currency: string;
    traceId: string;
  }): Promise<{ ok: boolean; replayed?: boolean; code?: string }>;
  recordUnmatched?(input: {
    providerEventId: string;
    rawPayload: Record<string, unknown>;
    amount: number;
    reason: string;
    receivedAt?: Date;
  }): Promise<{ ok: boolean; replayed?: boolean; code?: string }>;
}) {
  const getNow = dependencies.now ?? (() => new Date());

  return {
    async handle(input: {
      rawBody: string;
      secretHeader?: string;
      signatureHeader?: string;
      timestampHeader?: string;
      traceId: string;
    }): Promise<
      | { ok: true; value: { acknowledged: true; replayed?: boolean } }
      | { ok: false; error: { code: string } }
    > {
      const hasHostedSecret = input.secretHeader !== undefined;
      const hasHmac = input.signatureHeader !== undefined || input.timestampHeader !== undefined;

      if (hasHostedSecret && hasHmac) {
        return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
      }
      if (!hasHostedSecret && !hasHmac) {
        return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
      }

      let authMode: "hosted" | "bank";
      if (hasHostedSecret) {
        if (!sameSecret(dependencies.secretKey, input.secretHeader)) {
          return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
        }
        authMode = "hosted";
      } else {
        if (!dependencies.webhookSecret) {
          return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
        }
        if (!verifyHmac({
          webhookSecret: dependencies.webhookSecret,
          rawBody: input.rawBody,
          signatureHeader: input.signatureHeader,
          timestampHeader: input.timestampHeader,
          now: getNow,
        })) {
          return { ok: false as const, error: { code: "SEPAY_SIGNATURE_INVALID" } };
        }
        authMode = "bank";
      }

      let payload: unknown;
      try {
        payload = JSON.parse(input.rawBody);
      } catch {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }

      if (authMode === "hosted") {
        const parsed = ipn(payload);
        if (parsed === null) {
          return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
        }
        if (parsed.notification_type !== "ORDER_PAID") {
          return { ok: true as const, value: { acknowledged: true } };
        }
        if (
          parsed.transaction.transaction_status !== "APPROVED" ||
          parsed.transaction.transaction_type !== "PAYMENT" ||
          parsed.order.order_status !== "CAPTURED" ||
          parsed.transaction.transaction_amount !== parsed.order.order_amount ||
          parsed.transaction.transaction_currency !== parsed.order.order_currency
        ) return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
        const result = await dependencies.recordPaid({
          invoiceNumber: parsed.order.order_invoice_number,
          matchMethod: "invoice_number",
          providerEventId: parsed.transaction.transaction_id,
          amount: parsed.order.order_amount,
          currency: parsed.order.order_currency,
          traceId: input.traceId,
        });
        if (result.ok) {
          return { ok: true as const, value: { acknowledged: true, replayed: result.replayed === true } };
        }

        if (!dependencies.recordUnmatched) {
          throw new Error("UNMATCHED_PAYMENT_HANDLER_MISSING");
        }
        const unmatchedResult = await dependencies.recordUnmatched({
          providerEventId: parsed.transaction.transaction_id,
          rawPayload: payload as Record<string, unknown>,
          amount: parsed.order.order_amount,
          reason: result.code ?? "PAYMENT_MATCH_FAILED",
        });
        if (!unmatchedResult.ok) {
          return { ok: false as const, error: { code: "UNMATCHED_PERSISTENCE_FAILED" } };
        }
        return { ok: true as const, value: { acknowledged: true as const, replayed: unmatchedResult.replayed === true } };
      }

      if (typeof payload !== "object" || payload === null) {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }
      const bank = payload as Record<string, unknown>;

      if (
        typeof bank.id !== "number" ||
        !Number.isSafeInteger(bank.id) ||
        bank.id <= 0 ||
        bank.transferType !== "in" ||
        typeof bank.transferAmount !== "number" ||
        !Number.isSafeInteger(bank.transferAmount) ||
        bank.transferAmount <= 0
      ) {
        return { ok: false as const, error: { code: "SEPAY_PAYLOAD_INVALID" } };
      }

      const idStr = String(bank.id);
      const rawCode = typeof bank.code === "string" ? bank.code : "";
      const rawContent = typeof bank.content === "string" ? bank.content : "";
      const combined = `${rawCode} ${rawContent}`.trim();

      const validCodes = extractValidPaymentCodes(combined);

      async function persistUnmatched(reason: string) {
        if (!dependencies.recordUnmatched) {
          throw new Error("UNMATCHED_PAYMENT_HANDLER_MISSING");
        }
        const unmatchedResult = await dependencies.recordUnmatched({
          providerEventId: idStr,
          rawPayload: bank,
          amount: bank.transferAmount as number,
          reason,
        });
        if (!unmatchedResult.ok) {
          return { ok: false as const, error: { code: "UNMATCHED_PERSISTENCE_FAILED" } };
        }
        return { ok: true as const, value: { acknowledged: true as const, replayed: unmatchedResult.replayed === true } };
      }

      if (validCodes.length === 0) {
        return persistUnmatched("NO_VALID_PAYMENT_CODE");
      }

      if (validCodes.length > 1) {
        return persistUnmatched("MULTIPLE_PAYMENT_CODES");
      }

      const paymentCode = validCodes[0];
      const result = await dependencies.recordPaid({
        paymentCode,
        matchMethod: "payment_code",
        providerEventId: idStr,
        amount: bank.transferAmount as number,
        currency: "VND",
        traceId: input.traceId,
      });

      if (result.ok) {
        return { ok: true as const, value: { acknowledged: true, replayed: result.replayed === true } };
      }

      return persistUnmatched(result.code ?? "PAYMENT_MATCH_FAILED");
    },
  };
}
