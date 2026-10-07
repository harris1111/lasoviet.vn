"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { findLaProduct, type LaSku } from "@lasoviet/contracts";
import { UnlockSheet } from "./unlock-sheet";
import { useWalletQuotes } from "./use-wallet-quotes";

export function useUnlockLabels() {
  const t = useTranslations("reports");
  return { title: t("selection.unlockDialogTitle"), itemLabel: t("selection.unlockDialogItemLabel"),
    priceLabel: t("selection.unlockDialogPriceLabel"), balanceLabel: t("selection.unlockDialogBalanceLabel"),
    balanceAfterLabel: t("selection.unlockDialogBalanceAfterLabel"), confirm: t("selection.unlockDialogConfirm"),
    confirming: t("selection.unlockDialogConfirming"), cancel: t("selection.unlockDialogCancel"),
    shortBalanceTitle: t("selection.unlockDialogShortBalanceTitle"), topUpNote: t("selection.unlockDialogTopupNote"),
    genericError: t("selection.unlockDialogGenericError") };
}

function ContextualUnlockForChart({ chartId, chartVersionId, locale, sku, offerHref, onDoor }: {
  chartId: string; chartVersionId: string; locale: "vi" | "en"; sku: LaSku;
  offerHref: string; onDoor?: () => void;
}) {
  const t = useTranslations("reports");
  const labels = useUnlockLabels();
  const router = useRouter();
  const quote = useWalletQuotes(chartId, chartVersionId, locale);
  const [selection, setSelection] = useState<LaSku | null>(null);
  const [receipt, setReceipt] = useState<{ reportId: string | null; sku: LaSku } | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const lifetimeRef = useRef<HTMLButtonElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const previousSelection = useRef<LaSku | null>(null);
  useEffect(() => {
    if (receipt) receiptRef.current?.focus();
    else if (previousSelection.current && !selection) {
      (previousSelection.current === sku ? primaryRef.current : lifetimeRef.current)?.focus();
    }
    previousSelection.current = selection;
  }, [selection, receipt, sku]);
  const receiptQuote = receipt ? quote.quotes?.find(item => item.sku === receipt.sku && item.state === "owned"
    && (receipt.reportId === null || item.reportId === receipt.reportId)) : undefined;
  const receiptReady = receiptQuote?.reportState === "ready";
  const receiptUnavailable = receiptQuote?.reportState === "unavailable";
  const retryQuotes = quote.retry;
  useEffect(() => {
    if (!receipt || receiptQuote?.reportState !== "processing" || quote.status !== "ready") return;
    const refresh = () => { if (document.visibilityState === "visible") retryQuotes(); };
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [receipt, receiptQuote?.reportState, quote.status, retryQuotes]);
  const prefix = locale === "en" ? "/en" : "";
  if (receipt) return <div ref={receiptRef} tabIndex={-1} role="status" data-testid="contextual-unlock-success">
    <p>{t(quote.status === "guest" ? "selection.contextualSignInAgain" : quote.status === "error" ? "selection.contextualCheckError"
      : !receiptQuote ? "selection.contextualUnverified" : receiptReady ? "selection.contextualReady"
      : receiptUnavailable ? "selection.contextualUnavailable" : "selection.contextualPreparing")}</p>
    {quote.status === "guest" ? <Link className="button" href={`${prefix}/dang-nhap?callbackURL=${encodeURIComponent(`${prefix}/la-so/${chartId}`)}`}>
      {t("selection.contextualSignIn")}</Link> : receiptQuote ? <Link className="button" href={receiptQuote.reportId ? `${prefix}/bao-cao/${encodeURIComponent(receiptQuote.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>
      {t(receiptReady ? "selection.contextualReadNow" : "selection.viewProgress")}</Link>
      : <button className="button" type="button" onClick={retryQuotes}>{t("selection.unlockDialogRetry")}</button>}
  </div>;
  if (selection) {
    const selected = findLaProduct(selection)!;
    return <UnlockSheet embedded open chartId={chartId} chartVersionId={chartVersionId} sku={selection}
      locale={locale} labels={labels} itemName={selected.name[locale]}
      onOpenChange={(open) => { if (!open) setSelection(null); }}
      onUnlocked={(reportId) => { setReceipt({ reportId, sku: selection }); quote.retry(); router.refresh(); }} />;
  }
  function action(itemSku: LaSku, secondary = false) {
    const product = findLaProduct(itemSku);
    if (!product) return null;
    const terms = quote.quotes?.find((item) => item.sku === itemSku);
    const supportedGuest = product.locales.includes(locale) && !(locale === "en" && product.category === "palace");
    const state = terms?.state ?? (quote.status !== "guest" ? "unavailable" : !supportedGuest ? "unavailable" : product.availability === "active" ? "available" : "coming_soon");
    if (state === "owned") return <Link className="button button-secondary" href={terms?.reportId ? `${prefix}/bao-cao/${encodeURIComponent(terms.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>
      {t(terms?.reportState === "ready" ? "selection.readAgain" : terms?.reportId ? "selection.viewProgress" : "selection.viewLibrary")}
    </Link>;
    const price = terms?.priceLa ?? product.priceLa;
    return <div className="contextual-unlock-option" key={itemSku}>
      {terms && terms.creditLa > 0 && <p>{t("selection.ladderCredit", { credit: terms.creditLa, price })}</p>}
      {terms && terms.discountLa > 0 && <p>{t("selection.ladderDiscount", { discount: terms.discountLa })}</p>}
      <button ref={secondary ? lifetimeRef : primaryRef} type="button" className={`button ${secondary ? "button-secondary" : "button-primary"}`}
        data-testid={secondary ? "contextual-lifetime-unlock" : "contextual-palace-unlock"}
        disabled={state !== "available" || quote.status === "loading" || quote.status === "error"}
        onClick={() => { onDoor?.(); setSelection(itemSku); }}>
        {state === "coming_soon" ? t("selection.ladderComingSoon") : state === "unavailable" ? t("selection.ladderUnavailable") :
          t(secondary ? "selection.contextualLifetime" : "selection.contextualOpen", { item: product.name[locale], price })}
      </button>
    </div>;
  }
  return <div className="contextual-unlock" data-testid="contextual-unlock">
    {quote.status === "loading" && <p role="status">{t("selection.ladderLoading")}</p>}
    {quote.status === "error" && <div role="alert"><p>{t("selection.ladderQuoteError")}</p><button className="button" type="button" onClick={quote.retry}>{t("selection.retry")}</button></div>}
    {action(sku)}{sku !== "ZIWEI-IDENTITY-P0" && action("ZIWEI-IDENTITY-P0", true)}
    <Link href={offerHref} onClick={onDoor}>{t("selection.contextualAllOffers")}</Link>
  </div>;
}


export function ContextualUnlock(props: Parameters<typeof ContextualUnlockForChart>[0]) {
  return <ContextualUnlockForChart key={JSON.stringify([props.chartId, props.chartVersionId, props.locale, props.sku])} {...props} />;
}
