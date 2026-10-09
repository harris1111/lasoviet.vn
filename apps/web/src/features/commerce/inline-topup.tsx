"use client";
import { useEffect, useRef, useState } from "react";
import { LaGlyph } from "../../components/la-icons";
import { useTranslations } from "next-intl";
import type { WalletTopUpContinuationRequestV1, WalletTopUpModeV1 } from "@lasoviet/contracts";
import { findSmallestCoveringPack } from "./la-packs";
import { PackPicker } from "./pack-picker";
import { parseCheckoutStatus, type CheckoutStatus } from "./checkout-status";
import { VietQrCheckout } from "./vietqr-checkout";
import { PaymentSelfClaimForm, type PaymentSelfClaimState } from "./payment-self-claim-form";
import { trackPackSelected, trackUnlockConfirmView, trackUnlockError } from "../analytics/funnel-analytics";

export function InlineTopUp({ locale, itemName, balance, priceLa, continuation, chartId, chartVersionId, sku, topUpMode, onCompleted, onReconfirm }: {
  locale: "vi" | "en"; itemName: string; balance: number; priceLa: number;
  continuation: WalletTopUpContinuationRequestV1; chartId: string; chartVersionId: string; sku: string; topUpMode: WalletTopUpModeV1;
  onCompleted: (status: CheckoutStatus) => void; onReconfirm: () => void;
}) {
  const t = useTranslations("reports");
  const [pack, setPack] = useState(() => findSmallestCoveringPack(priceLa - balance));
  const [checkout, setCheckout] = useState<CheckoutStatus | null>(null);
  const [checkoutRevision, setCheckoutRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [termsChanged, setTermsChanged] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [hasPending, setHasPending] = useState(false);
  const pending = useRef<string | null>(null);
  const active = useRef(true);
  const operation = useRef(false);
  const completed = useRef(false);
  const storageKey = `lsv:topup:${continuation.purchaseIntentId}`;
  function matchesSelection(status: CheckoutStatus, expectedOrderId?: string): boolean {
    const binding = status.order.continuation;
    if (status.order.kind !== "wallet_topup" || status.order.locale !== locale || (expectedOrderId && status.order.id !== expectedOrderId)
      || !binding || binding.purchaseIntentId !== continuation.purchaseIntentId || binding.chartVersionId !== chartVersionId || binding.unlockedSku !== sku) return false;
    const target = new URL(binding.returnPath, "https://lasoviet.net");
    return target.origin === "https://lasoviet.net" && target.pathname === `${locale === "en" ? "/en" : ""}/la-so/${encodeURIComponent(chartId)}`
      && target.searchParams.get("tab") === continuation.returnTab && target.searchParams.get("open") === (continuation.returnOpen ?? null)
      && target.searchParams.get("topupOrder") === status.order.id;
  }
  const matchRef = useRef(matchesSelection);
  useEffect(() => { matchRef.current = matchesSelection; });
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    async function restore() {
      try { pending.current = sessionStorage.getItem(storageKey); } catch { /* Authorized server reuse still prevents duplicate orders. */ }
      if (pending.current) {
        setHasPending(true);
        try {
          const response = await fetch(`/api/commerce/orders/${encodeURIComponent(pending.current)}/status`, { cache: "no-store" });
          if (cancelled) return;
          if (response.status === 404) {
            pending.current = null; setHasPending(false);
            try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
          } else {
            if (!response.ok) throw new Error("CHECKOUT_STATUS_FAILED");
            const status = parseCheckoutStatus(await response.json());
            if (cancelled) return;
            if (!matchRef.current(status, pending.current ?? undefined)) throw new Error("CHECKOUT_STATUS_INVALID");
            setCheckout(status);
          }
        } catch { if (!cancelled) setError(true); }
      }
      if (!cancelled) setBusy(false);
    }
    void restore();
    return () => { cancelled = true; active.current = false; };
  }, [storageKey, locale, restoreAttempt]);

  useEffect(() => {
    if (!busy && !checkout && !error) void trackUnlockConfirmView({ sku, price_la: priceLa, balance,
      balance_after: balance + pack.totalLa - priceLa, placement: "inline_topup" });
  }, [busy, checkout, error, sku, priceLa, balance, pack.totalLa]);
  useEffect(() => {
    if (error || termsChanged) void trackUnlockError({ sku, error_code: termsChanged ? "TOP_UP_CONTINUATION_INVALID" : "TOP_UP_UNAVAILABLE", placement: "inline_topup" });
  }, [error, termsChanged, sku]);

  async function createOrder() {
    if (operation.current || busy || pending.current || termsChanged || topUpMode === "unavailable") return;
    operation.current = true; setBusy(true); setError(false);
    try {
      void trackPackSelected({ pack_id: pack.id, price_vnd: pack.vndAmount, la_amount: pack.totalLa });
      const response = await fetch("/api/commerce/wallet/top-up-orders", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId: pack.id, locale, continuation }) });
      if (!response.ok) {
        if (response.status === 409) {
          const body = await response.json().catch(() => null) as { code?: string } | null;
          if (body?.code === "TOP_UP_CONTINUATION_INVALID") {
            if (active.current) setTermsChanged(true);
            return;
          }
        }
        throw new Error("TOP_UP_ORDER_FAILED");
      }
      const status = parseCheckoutStatus(await response.json());
      if (!matchesSelection(status)) throw new Error("CHECKOUT_STATUS_INVALID");
      pending.current = status.order.id;
      if (active.current) setHasPending(true);
      // Preserve the consented order even if the customer closes the sheet during the request.
      try { sessionStorage.setItem(storageKey, status.order.id); } catch { /* Server-side matching remains authoritative. */ }
      if (active.current) setCheckout(status);
    } catch { if (active.current) setError(true); }
    finally { operation.current = false; if (active.current) setBusy(false); }
  }

  function finish(status: CheckoutStatus) {
    if (!matchesSelection(status, pending.current ?? undefined) || completed.current || status.order.status !== "paid" || status.order.continuation?.status !== "completed") return;
    completed.current = true;
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    onCompleted(status);
  }

  async function claim(_state: PaymentSelfClaimState, form: FormData): Promise<PaymentSelfClaimState> {
    try {
      const response = await fetch("/api/commerce/payments/self-claim", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: Number(form.get("amount")), transferredAtLocal: form.get("transferredAtLocal") }) });
      if (response.ok) {
        const orderId = pending.current;
        if (!orderId || !active.current) return { status: "idle" };
        const refreshed = await fetch(`/api/commerce/orders/${encodeURIComponent(orderId)}/status`, { cache: "no-store" });
        if (!refreshed.ok) throw new Error("CHECKOUT_STATUS_FAILED");
        const status = parseCheckoutStatus(await refreshed.json());
        if (!active.current) return { status: "idle" };
        if (!matchesSelection(status, orderId)) throw new Error("CHECKOUT_STATUS_INVALID");
        if (status.order.status === "paid" && status.order.continuation?.status === "completed") finish(status);
        else { setCheckout(status); setCheckoutRevision(value => value + 1); }
        return { status: "idle" }; // The authorized GET, not the claim receipt, determines completion.
      }
      const result = await response.json().catch(() => ({})) as { code?: string };
      return { status: response.status === 400 ? "invalid_input" : result.code === "PAYMENT_CLAIM_NOT_FOUND" ? "payment_not_found"
        : result.code === "PAYMENT_CLAIM_RATE_LIMITED" ? "rate_limited" : "service_unavailable" };
    } catch { return { status: "service_unavailable" }; }
  }

  function reconfirm() {
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    pending.current = null;
    onReconfirm(); // Reload authoritative intent and balance before another explicit purchase.
  }
  if (checkout) return <div className="inline-topup-payment" data-testid="inline-topup-payment">
    <VietQrCheckout key={`${checkout.order.id}:${checkoutRevision}`} initialStatus={checkout} onCompleted={finish} validateStatus={status => matchesSelection(status, checkout.order.id)} labels={{
      instructionsTitle: t("checkout.instructions_title"), bankCode: t("checkout.bank_code"), accountNumber: t("checkout.account_number"),
      accountHolder: t("checkout.account_holder"), amount: t("checkout.amount"), transferDescription: t("checkout.transfer_description"),
      remainingTime: t("checkout.remaining_time"), qrAlt: t("checkout.qr_alt"), copyAccountNumber: t("checkout.copy_account_number"),
      copyAmount: t("checkout.copy_amount"), copyTransferDescription: t("checkout.copy_transfer_description"), copied: t("checkout.copied"),
      noSecondTransferWarning: t("checkout.no_second_transfer_warning"), summaryAutoFulfill: t("selection.inlineProcessing", { item: itemName }),
      status: { pending: t("checkout.status.pending"), paid: t("checkout.status.paid"), expired: t("checkout.status.expired"),
        failed: t("checkout.status.failed"), refunded: t("checkout.status.refunded") },
    }} selfClaim={checkout.order.status === "pending" || checkout.order.status === "expired" ? <PaymentSelfClaimForm orderId={checkout.order.id} defaultAmount={checkout.order.amount}
      locale={locale} action={claim} /> : undefined} />
    {["expired", "failed", "refunded"].includes(checkout.order.status) && <button className="button" type="button" onClick={reconfirm}>
      {t("selection.inlineReconfirm")}</button>}
    {checkout.paymentInstructions && <a className="button button-secondary" href={checkout.paymentInstructions.qrUrl} target="_blank" rel="noopener noreferrer">
      {t("selection.inlineSaveQr")}</a>}
    <a href={`${locale === "en" ? "/en" : ""}/thanh-toan/${encodeURIComponent(checkout.order.id)}`}>{t("selection.inlineOrderLink")}</a>
  </div>;
  return <div className="inline-topup" data-testid="inline-topup">
    <dl className="inline-topup-summary">
      <div><dt>{t("selection.inlinePrice")}</dt><dd><LaGlyph />{priceLa.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} Lá</dd></div>
      <div><dt>{t("selection.inlineBalance")}</dt><dd><LaGlyph />{balance.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} Lá</dd></div>
      <div><dt>{t("selection.inlineGap")}</dt><dd><LaGlyph />{(priceLa - balance).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} Lá</dd></div>
    </dl>
    {topUpMode === "test" && <div className="inline-topup-mode" role="note"><strong>{t("selection.inlineTestTitle")}</strong><p>{t("selection.inlineTestBody")}</p></div>}
    {topUpMode === "unavailable" && <p role="status">{t("selection.inlineUnavailable")}</p>}
    {termsChanged && <p role="alert">{t("selection.inlineTermsChanged")}</p>}
    {error && <p role="alert">{t("selection.inlineError")}</p>}
    {termsChanged ? <button className="button button-primary" type="button" onClick={reconfirm} disabled={busy}>
      {t("selection.inlineRefresh")}</button> : error && hasPending ? <button className="button" type="button" onClick={() => { setError(false); setBusy(true); setRestoreAttempt(v => v + 1); }} disabled={busy}>
      {t("selection.unlockDialogRetry")}</button> : <>
      <PackPicker selected={pack} onSelect={setPack} locale={locale} gap={priceLa - balance} />
      <p className="inline-topup-after">{t("selection.inlineRemaining", { item: itemName, balance: (balance + pack.totalLa - priceLa).toLocaleString(locale === "vi" ? "vi-VN" : "en-US") })}</p>
      <button className="button button-primary" type="button" onClick={() => void createOrder()} disabled={busy || topUpMode === "unavailable"}>
        {busy ? t("selection.unlockDialogConfirming") : topUpMode === "test" ? t("selection.inlineTestConfirm", { amount: pack.totalLa.toLocaleString(locale === "vi" ? "vi-VN" : "en-US") }) : t("selection.inlineConfirm", { amount: pack.vndFormatted[locale], item: itemName })}
      </button>
      <p className="inline-topup-consent">{t("selection.inlineConsent", { price: priceLa.toLocaleString(locale === "vi" ? "vi-VN" : "en-US"), item: itemName })}</p>
    </>}
  </div>;
}
