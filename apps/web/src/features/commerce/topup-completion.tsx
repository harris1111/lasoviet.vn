import "server-only";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CurrentActor, WalletTopUpContinuationViewV1 } from "@lasoviet/contracts";
import { privateApiClient } from "../../api/private-api-client";
import { safeParseCheckoutStatus } from "./checkout-status";
import { residualBalanceSuggestion } from "./residual-balance";

export async function loadTopUpCompletion(actor: CurrentActor, orderId: unknown, chartPath: string): Promise<WalletTopUpContinuationViewV1 | null> {
  if (actor.kind !== "account" || typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  try {
    const response = await privateApiClient(actor, actor.requestId).request<{ ok: boolean; value: unknown }>(`/commerce/orders/${encodeURIComponent(orderId)}`);
    const parsed = safeParseCheckoutStatus(response.value);
    if (!response.ok || !parsed.ok || parsed.value.order.status !== "paid" || parsed.value.order.kind !== "wallet_topup") return null;
    const continuation = parsed.value.order.continuation;
    if (!continuation || continuation.status !== "completed" || new URL(continuation.returnPath, "https://lasoviet.net").pathname !== chartPath) return null;
    return continuation;
  } catch {
    return null;
  }
}

export async function TopUpCompletionNotice({ continuation, locale, chartId }: { continuation: WalletTopUpContinuationViewV1; locale: "vi" | "en"; chartId: string }) {
  const t = await getTranslations("reports.selection");
  const prefix = locale === "en" ? "/en" : "";
  const suggestion = residualBalanceSuggestion(continuation.unlockedSku, continuation.remainingLa ?? 0, locale);
  return <section className="container" role="status">
    <p>{t("unlockCompletedBalance", { balance: continuation.remainingLa ?? 0 })}</p>
    {continuation.reportId && <Link className="button button-primary" href={`${prefix}/bao-cao/${encodeURIComponent(continuation.reportId)}`}>{t("unlockReadPart")}</Link>}
    {(continuation.remainingLa ?? 0) > 0 && <>
      <p>{suggestion ? t(suggestion.key, { cost: suggestion.cost }) : t("unlockResidualSuggestion")}</p>
      {suggestion?.reserved && <p>{t("residualReserved")}</p>}
      <Link href={`${prefix}/la-so/${encodeURIComponent(chartId)}/chon-luan-giai`}>{t("unlockReviewSelection")}</Link>
    </>}
  </section>;
}
