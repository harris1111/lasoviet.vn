import {
  WalletTopUpCatalogV1,
  WalletTopUpPackIdSchema,
  type WalletTopUpPackId,
} from "@lasoviet/contracts";
import type { Database, commerceOrders } from "@lasoviet/database";

import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";

type OrderRecord = typeof commerceOrders.$inferSelect;

export type WalletTopUpOrder = OrderRecord & { kind: "wallet_topup"; chartId: null; chartVersionId: null };

export const WALLET_TOP_UP_REASON_CODE = "wallet.topup.paid";

const PACK_TITLES: Record<WalletTopUpPackId, { vi: string; en: string }> = {
  "LA-ENTRY-300": { vi: "Gói Nhập Môn · 300 Lá", en: "Nhập Môn pack · 300 Lá" },
  "LA-START-1100": { vi: "Gói Khởi Đọc · 1.100 Lá", en: "Khởi Đọc pack · 1,100 Lá" },
  "LA-DISCOVER-3000": { vi: "Gói Khám Phá · 3.000 Lá", en: "Khám Phá pack · 3,000 Lá" },
  "LA-LIBRARY-8000": { vi: "Gói Tàng Thư · 8.000 Lá", en: "Tàng Thư pack · 8,000 Lá" },
};

export function isWalletTopUpOrder(order: OrderRecord): order is WalletTopUpOrder {
  return order.kind === "wallet_topup" && order.chartId === null && order.chartVersionId === null &&
    WalletTopUpPackIdSchema.safeParse(order.sku).success;
}

export function walletTopUpPack(packId: string) {
  return WalletTopUpCatalogV1.find((pack) => pack.id === packId);
}

export function walletTopUpPackTitle(packId: string, locale: "vi" | "en"): string {
  const parsed = WalletTopUpPackIdSchema.safeParse(packId);
  return parsed.success ? PACK_TITLES[parsed.data][locale] : packId;
}

export function walletTopUpCreditedLa(packId: string): number {
  const pack = walletTopUpPack(packId);
  return pack === undefined ? 0 : pack.purchasedLa + pack.promotionalLa;
}

export function walletTopUpGrantIdempotencyKey(orderId: string): string {
  return `wallet-topup:${orderId}`;
}

export class WalletTopUpGrantError extends Error {
  constructor(readonly code: string) {
    super(`WALLET_TOP_UP_GRANT_FAILED:${code}`);
  }
}

/**
 * Credits the Lá of a paid top-up order inside the caller's transaction, so
 * the order can never be `paid` without its credit (and never credited twice:
 * the wallet enforces one grant per top-up order and one receipt per key).
 * Any failure throws and rolls the payment back; SePay then retries.
 */
export async function grantWalletTopUpCredit(
  transaction: Database,
  order: WalletTopUpOrder,
  context: { now: () => Date; requestId: string; traceId: string },
): Promise<void> {
  const pack = walletTopUpPack(order.sku);
  if (pack === undefined) throw new WalletTopUpGrantError("WALLET_TOP_UP_PACK_UNKNOWN");
  const token = {};
  const wallet = createDatabaseWalletRepository(transaction, {
    now: context.now,
    trustedGrantAuthority: { token, actorId: order.ownerId },
  });
  const result = await wallet.grant({
    targetOwnerId: order.ownerId,
    topUpOrderId: order.id,
    trustedGrantToken: token,
    grant: {
      kind: "grant",
      actorId: order.ownerId,
      reasonCode: WALLET_TOP_UP_REASON_CODE,
      requestId: context.requestId,
      traceId: context.traceId,
      idempotencyKey: walletTopUpGrantIdempotencyKey(order.id),
      purchasedLa: pack.purchasedLa,
      promotionalLa: pack.promotionalLa,
      topUpPackId: pack.id,
    },
  });
  if (!result.ok) throw new WalletTopUpGrantError(result.error.code);
}
