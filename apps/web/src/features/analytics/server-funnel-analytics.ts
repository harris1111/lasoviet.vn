import "server-only";

import {
  sendServerAnalyticsEvent,
  type ServerAnalyticsResult,
  type ServerAnalyticsDependencies,
} from "../../analytics/server-analytics";
import { sanitizeAnalyticsProperties } from "./funnel-analytics";

export type ServerWelcomeGrantParams = {
  userId: string;
  amount: number;
  balanceAfter?: number;
  grantType?: string;
  idempotencyKey?: string;
  requestId?: string;
};

export async function sendServerWelcomeGrantEvent(
  params: ServerWelcomeGrantParams,
  dependencies?: ServerAnalyticsDependencies,
): Promise<ServerAnalyticsResult> {
  const properties = sanitizeAnalyticsProperties({
    amount: params.amount,
    balance_after: params.balanceAfter,
    grant_type: params.grantType ?? "welcome_verified_account",
  });

  return sendServerAnalyticsEvent(
    {
      name: "welcome_grant",
      idempotencyKey: params.idempotencyKey ?? `welcome-grant:${params.userId}`,
      userId: params.userId,
      requestId: params.requestId,
      properties,
    },
    dependencies,
  );
}

export type ServerUpgradePurchasedParams = {
  userId: string;
  sourceSku: string;
  sourceSkus?: string[];
  creditLa?: number;
  targetSku: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  requestId?: string;
  occurredAt?: Date | string;
};

export async function sendServerUpgradePurchasedEvent(
  params: ServerUpgradePurchasedParams,
  dependencies?: ServerAnalyticsDependencies,
): Promise<ServerAnalyticsResult> {
  const properties = sanitizeAnalyticsProperties({
    source_sku: params.sourceSku,
    ...(params.sourceSkus ? {source_skus: params.sourceSkus} : {}),
    ...(params.creditLa !== undefined ? {credit_amount: params.creditLa} : {}),
    target_sku: params.targetSku,
    amount: params.amount,
    currency: params.currency,
  });

  return sendServerAnalyticsEvent(
    {
      name: "upgrade_purchased",
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      requestId: params.requestId,
      occurredAt: params.occurredAt,
      properties,
    },
    dependencies,
  );
}

export type ServerGuaranteeClaimedParams = {
  userId: string;
  sku: string;
  amount?: number;
  amountRestored?: number;
  reason: string;
  sectionId?: string;
  idempotencyKey: string;
  requestId?: string;
};

export async function sendServerGuaranteeClaimedEvent(
  params: ServerGuaranteeClaimedParams,
  dependencies?: ServerAnalyticsDependencies,
): Promise<ServerAnalyticsResult> {
  const properties = sanitizeAnalyticsProperties({
    sku: params.sku,
    amount: params.amount ?? params.amountRestored,
    amount_restored: params.amountRestored ?? params.amount,
    reason: params.reason,
    section_id: params.sectionId,
  });

  return sendServerAnalyticsEvent(
    {
      name: "guarantee_claimed",
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      requestId: params.requestId,
      properties,
    },
    dependencies,
  );
}
