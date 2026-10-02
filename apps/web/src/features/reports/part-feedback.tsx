"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GuaranteeClaimResultV1Schema, PartFeedbackResultV1Schema, type PartFeedbackRating } from "@lasoviet/contracts";
import { ziweiPresentation } from "../ziwei/ziwei-presentation";
import { deterministicAnalyticsKey, trackGuaranteeClaimed, trackPartFeedback } from "../analytics/funnel-analytics";

export function PartFeedback({ chartId, partId, reportId, sku, paid = false, locale = "vi", onClaimed }: { chartId: string; partId: string; reportId?: string; sku?: string; paid?: boolean; locale?: "vi" | "en"; onClaimed?: () => void }) {
  const t = useTranslations("reports.feedback");
  const router = useRouter();
  const [rating, setRating] = useState<PartFeedbackRating>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claimed, setClaimed] = useState(false);
  const [relatedPalaceId, setRelatedPalaceId] = useState<string>();
  const claimKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  async function send(nextRating: PartFeedbackRating, guarantee = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      claimKey.current ??= crypto.randomUUID();
      const response = await fetch(guarantee ? "/api/commerce/wallet/guarantee-claim" : "/api/commerce/feedback/parts", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chartId, partId, ...(reportId ? { reportId } : {}), rating: nextRating, ...(guarantee ? { idempotencyKey: claimKey.current } : {}) }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const code = typeof data === "object" && data !== null && "code" in data ? data.code : undefined;
        setMessage(response.status === 401 ? t("signIn") : code === "GUARANTEE_ALREADY_CLAIMED" ? t("alreadyClaimed") : code === "GUARANTEE_WINDOW_EXPIRED" ? t("expired") : code === "GUARANTEE_PRICE_EXCEEDS_LIMIT" ? t("priceLimit") : t("error"));
        return;
      }
      if (guarantee) {
        const result = GuaranteeClaimResultV1Schema.safeParse(data);
        if (!result.success) { setMessage(t("error")); return; }
        setClaimed(true);
        setRelatedPalaceId(result.data.relatedPalaceSuggestion.palaceId);
        setMessage(t("restored", { amount: result.data.amountLaRestored }));
        void trackGuaranteeClaimed({
          sku: sku ?? (paid ? "paid-report" : "free-result"),
          amount_restored: result.data.amountLaRestored,
          reason: "inaccurate",
          section_id: partId,
        }, { idempotencyKey: claimKey.current ?? undefined });
        onClaimed?.();
        router.refresh();
      } else {
        const result = PartFeedbackResultV1Schema.safeParse(data);
        if (!result.success) { setMessage(t("error")); return; }
        setRelatedPalaceId(result.data.relatedPalaceSuggestion?.palaceId);
        setRating(nextRating);
        setMessage(t("thanks"));
        void trackPartFeedback({
          section_id: partId,
          feedback: nextRating,
          sku,
          is_free: !paid,
        }, {
          idempotencyKey: deterministicAnalyticsKey(
            "part-feedback",
            chartId,
            reportId ?? "",
            sku ?? "",
            partId,
            nextRating,
          ),
        });
      }
    } catch { setMessage(t("error")); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <div className="part-feedback" data-print-hidden>
    <p>{t("question")}</p>
    <div className="part-feedback-actions" role="group" aria-label={t("question")}>
      {(["accurate", "partially_accurate", "inaccurate"] as const).map(value => <button key={value} type="button" disabled={busy || claimed} aria-pressed={rating === value} onClick={() => void send(value)}>{t(value)}</button>)}
    </div>
    {paid && rating === "inaccurate" && !claimed && <div className="part-feedback-guarantee">
      <p>{t("conditions")}</p>
      <button type="button" disabled={busy} onClick={() => void send("inaccurate", true)}>{t("claim")}</button>
    </div>}
    <p role="status" aria-live="polite">{busy ? t("saving") : message}</p>
    {relatedPalaceId && <a href={`${locale === "en" ? "/en" : ""}/la-so/${encodeURIComponent(chartId)}?tab=palaces&open=${encodeURIComponent(relatedPalaceId)}`}>{t("related", { palace: ziweiPresentation(locale, { strict: false }).palace(relatedPalaceId) })}</a>}
  </div>;
}
