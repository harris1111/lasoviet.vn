import type { AnalyticsPropertyValue } from "@lasoviet/contracts";
import { sendBrowserAnalyticsEvent, type BrowserAnalyticsOptions } from "../../analytics/browser-analytics";

const forbiddenExact = new Set([
  "name",
  "email",
  "birth_date",
  "birth_time",
  "birth_place",
  "birth_day",
  "birth_month",
  "birth_year",
  "birth_hour",
  "birth_minute",
  "payment_reference",
  "report_content",
  "chart_id",
  "chartid",
  "profile_id",
  "profileid",
  "visitor_id",
  "visitorid",
  "user_id",
  "userid",
  "account_id",
  "accountid",
  "free_text",
  "question",
  "evidence_text",
]);

export function isForbiddenAnalyticsKey(property: string): boolean {
  const lower = property.trim().toLowerCase();
  if (forbiddenExact.has(lower)) {
    return true;
  }
  const compact = lower.replace(/[-_\s]/g, "");
  if (
    compact === "name" ||
    (compact.endsWith("name") && !compact.endsWith("stepname")) ||
    compact.includes("email") ||
    compact.includes("birth") ||
    compact.includes("chart") ||
    compact.includes("profile") ||
    compact.includes("visitor") ||
    compact.includes("account") ||
    compact.includes("user") ||
    compact.includes("freetext") ||
    compact.includes("question") ||
    compact.includes("reportcontent") ||
    compact.includes("evidence")
  ) {
    return true;
  }
  return false;
}


/**
 * Validates and sanitizes properties against FD-053, FD-080, and FD-081 privacy boundaries:
 * strictly ensures no birth data, raw chart_id, profile_id, user_id, or report/evidence text is emitted.
 */
export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, AnalyticsPropertyValue> {
  const sanitized: Record<string, AnalyticsPropertyValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    const trimmedKey = key.trim();

    if (isForbiddenAnalyticsKey(trimmedKey)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[analytics] forbidden property key stripped: "${trimmedKey}"`);
      }
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[trimmedKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[trimmedKey] = value.filter(
        (v) =>
          v === null ||
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean",
      ) as (string | number | boolean | null)[];
    }
  }

  return sanitized;
}

/** Stable opaque key for idempotent browser telemetry without logging identifiers. */
export function deterministicAnalyticsKey(prefix: string, ...parts: string[]): string {
  let hash = 2166136261;
  for (const character of parts.join("\u001f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(16)}`;
}

// ==========================================
// 1. TOP-UP & PACK SELECTION (#50)
// ==========================================

export type TopupViewParams = {
  pack_id: string;
  placement: string;
};

export async function trackTopupView(
  params: TopupViewParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    pack_id: params.pack_id,
    placement: params.placement,
  });
  await sendBrowserAnalyticsEvent("topup_view", properties, options);
}

export type PackSelectedParams = {
  pack_id: string;
  price_vnd: number;
  la_amount: number;
};

export async function trackPackSelected(
  params: PackSelectedParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    pack_id: params.pack_id,
    price_vnd: params.price_vnd,
    la_amount: params.la_amount,
  });
  await sendBrowserAnalyticsEvent("pack_selected", properties, options);
}

// ==========================================
// 2. UNLOCK CONFIRM DIALOG (#51)
// ==========================================

export type UnlockConfirmViewParams = {
  sku: string;
  price_la: number;
  amount?: number;
  balance: number;
  balance_after: number;
  placement?: string;
};

export async function trackUnlockConfirmView(
  params: UnlockConfirmViewParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    sku: params.sku,
    price_la: params.price_la,
    amount: params.amount ?? params.price_la,
    balance: params.balance,
    balance_after: params.balance_after,
    placement: params.placement ?? "wallet_unlock_dialog",
  });
  await sendBrowserAnalyticsEvent("unlock_confirm_view", properties, options);
}

export type UnlockConfirmedParams = {
  sku: string;
  price_la?: number;
  amount?: number;
  balance_after?: number;
};

export async function trackUnlockConfirmed(
  params: UnlockConfirmedParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    sku: params.sku,
    price_la: params.price_la ?? params.amount,
    amount: params.amount ?? params.price_la,
    balance_after: params.balance_after,
  });
  await sendBrowserAnalyticsEvent("unlock_confirmed", properties, options);
}

// ==========================================
// 3. RETURN VISIT
// ==========================================

export type ReturnVisitParams = {
  days_since_last_visit: number;
  return_count: number;
};

export async function trackReturnVisit(
  params: ReturnVisitParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    days_since_last_visit: params.days_since_last_visit,
    return_count: params.return_count,
  });
  await sendBrowserAnalyticsEvent("return_visit", properties, options);
}

// ==========================================
// 4. FUTURE / HOOKS: UPGRADE (#52 rollover)
// ==========================================

export type UpgradeViewParams = {
  source_sku: string;
  target_sku: string;
  days_remaining: number;
};

export async function trackUpgradeView(
  params: UpgradeViewParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    source_sku: params.source_sku,
    target_sku: params.target_sku,
    days_remaining: params.days_remaining,
  });
  await sendBrowserAnalyticsEvent("upgrade_view", properties, options);
}

export type UpgradePurchasedParams = {
  source_sku: string;
  target_sku: string;
  amount: number;
  currency: string;
};

export async function trackUpgradePurchased(
  params: UpgradePurchasedParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    source_sku: params.source_sku,
    target_sku: params.target_sku,
    amount: params.amount,
    currency: params.currency,
  });
  await sendBrowserAnalyticsEvent("upgrade_purchased", properties, options);
}

// ==========================================
// 5. FUTURE / HOOKS: WELCOME GRANT (#55)
// ==========================================

export type WelcomeGrantParams = {
  amount: number;
  balance_after?: number;
  grant_type?: string;
};

export async function trackWelcomeGrant(
  params: WelcomeGrantParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    amount: params.amount,
    balance_after: params.balance_after,
    grant_type: params.grant_type ?? "welcome_verified_account",
  });
  await sendBrowserAnalyticsEvent("welcome_grant", properties, options);
}

// ==========================================
// 6. FUTURE / HOOKS: PART FEEDBACK & GUARANTEE (#1.10)
// ==========================================

export type PartFeedbackParams = {
  section_id: string;
  feedback: string;
  rating?: string | number;
  sku?: string;
  is_free?: boolean;
};

export async function trackPartFeedback(
  params: PartFeedbackParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    section_id: params.section_id,
    feedback: params.feedback,
    rating: params.rating,
    sku: params.sku,
    is_free: params.is_free,
  });
  await sendBrowserAnalyticsEvent("part_feedback", properties, options);
}

export type GuaranteeClaimedParams = {
  sku: string;
  amount?: number;
  amount_restored?: number;
  reason: string;
  section_id?: string;
};

export async function trackGuaranteeClaimed(
  params: GuaranteeClaimedParams,
  options?: BrowserAnalyticsOptions,
): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    sku: params.sku,
    amount: params.amount ?? params.amount_restored,
    amount_restored: params.amount_restored ?? params.amount,
    reason: params.reason,
    section_id: params.section_id,
  });
  await sendBrowserAnalyticsEvent("guarantee_claimed", properties, options);
}
