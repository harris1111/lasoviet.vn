"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { findLaProduct, isSinglePalaceSku, type LaSku } from "@lasoviet/contracts";
import { UnlockSheet } from "../commerce/unlock-sheet";
import { useUnlockLabels } from "../commerce/contextual-unlock";
import { useWalletQuotes, type InitialWalletQuotes } from "../commerce/use-wallet-quotes";
import { ladderSelectionQuery } from "../commerce/offer-selection";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";
import { claimLadderViewEvents } from "./offer-ladder-analytics";
import { PalacePicker } from "./palace-picker";

const FIXED_SKUS: LaSku[] = ["ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-IDENTITY-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-COMBO-2026-P0"];
export function OfferLadder({ chartId, chartVersionId, locale, initialSku, initialQuotes, initialResume = false, balance, scores }: {
  chartId: string; chartVersionId: string; locale: "vi" | "en"; initialSku: LaSku;
  initialQuotes: InitialWalletQuotes; initialResume?: boolean; balance: number; scores: Record<string, number>;
}) {
  const t = useTranslations("reports");
  const labels = useUnlockLabels();
  const quote = useWalletQuotes(chartId, chartVersionId, locale, initialQuotes);
  const [selectedSku, setSelectedSku] = useState(initialSku);
  const [palaceSku, setPalaceSku] = useState<LaSku>(isSinglePalaceSku(initialSku) ? initialSku : "ZIWEI-PALACE-LIFE-P0");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ reportId: string | null } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio <= 0 || !entry.target.getClientRects().length) continue;
        const sku = entry.target.getAttribute("data-sku") as LaSku;
        const claims = claimLadderViewEvents({ sku, locale, quote: quote.quotes?.find(item => item.sku === sku), nowMs: Date.now(), seen: seen.current });
        for (const claim of claims) void sendBrowserAnalyticsEvent(claim.name, claim.properties);
      }
    }, { threshold: 0.1 });
    root.current?.querySelectorAll("article[data-sku]").forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [locale, quote.quotes, palaceSku]);
  const trigger = useRef<HTMLButtonElement>(null);
  const resumed = useRef(false);
  useEffect(() => {
    if (!initialResume || resumed.current || selectedSku !== initialSku || quote.status !== "ready") return;
    const current = quote.quotes?.find(item => item.sku === initialSku);
    if (current?.state !== "available" || !trigger.current || trigger.current.disabled) return;
    // Open confirmation only. The user still explicitly confirms any spend or top-up.
    resumed.current = true;
    trigger.current.click();
  }, [initialResume, initialSku, selectedSku, quote.status, quote.quotes]);
  const prefix = locale === "en" ? "/en" : "";
  function select(sku: LaSku) {
    setSelectedSku(sku); setReceipt(null);
    if (isSinglePalaceSku(sku)) setPalaceSku(sku);
    const url = new URL(window.location.href);
    url.searchParams.delete("palace");
    url.searchParams.delete("resume");
    for (const [key, value] of Object.entries(ladderSelectionQuery(sku))) url.searchParams.set(key, value);
    window.history.replaceState(window.history.state, "", url);
  }
  function terms(sku: LaSku) {
    const product = findLaProduct(sku)!;
    const result = quote.quotes?.find(item => item.sku === sku);
    const guestSupported = product.locales.includes(locale) && !(locale === "en" && product.category === "palace");
    return { product, quote: result, state: result?.state ?? (quote.status !== "guest" ? "unavailable" : !guestSupported ? "unavailable" : product.availability === "active" ? "available" : "coming_soon"), price: result?.priceLa ?? product.priceLa };
  }
  const selected = terms(selectedSku);
  const canBuy = selected.state === "available" && (quote.status === "ready" || quote.status === "guest");
  const shortfall = Math.max(0, selected.price - balance);
  return <div ref={root} className="offer-ladder" data-testid="offer-ladder">
    <h2>{t("selection.ladderHeading")}</h2><p>{t("selection.ladderDescription")}</p>
    {quote.status === "loading" && <p role="status">{t("selection.ladderLoading")}</p>}
    {quote.status === "error" && <div role="alert"><p>{t("selection.ladderQuoteError")}</p><button type="button" className="button" onClick={quote.retry}>{t("selection.retry")}</button></div>}
    <div className="offer-ladder-cards">{[palaceSku, ...FIXED_SKUS].map(sku => {
      const item = terms(sku);
      const lifetime = sku === "ZIWEI-IDENTITY-P0";
      return <article key={isSinglePalaceSku(sku) ? "palace" : sku} className={lifetime ? "offer-ladder-best" : undefined} data-sku={sku}>
        {lifetime && <span className="fd109-state">{t("selection.ladderBestValue")}</span>}
        <h3>{isSinglePalaceSku(sku) ? t("selection.ladderPalace") : item.product.name[locale]}</h3>
        <p className="offer-ladder-price">{t("selection.ladderPrice", { price: item.price })}</p>
        {lifetime && <p>{t("selection.ladderLifetimeComparison")}</p>}
        {item.quote && item.quote.creditLa > 0 && <p>{t("selection.ladderCredit", { credit: item.quote.creditLa, price: item.price })}</p>}
        {item.quote && item.quote.discountLa > 0 && <p>{t("selection.ladderDiscount", { discount: item.quote.discountLa })}</p>}
        {item.state === "owned" && <p>{t("selection.ladderOwned")}</p>}
        {item.state === "coming_soon" || item.product.availability !== "active" ? <p>{t("selection.ladderComingSoon")}</p> :
          item.state === "unavailable" ? <p>{t("selection.ladderUnavailable")}</p> :
          <button type="button" className="button button-secondary" aria-pressed={selectedSku === sku} onClick={() => select(sku)}>{t("selection.ladderSelect")}</button>}
        {isSinglePalaceSku(sku) && <PalacePicker locale={locale} selectedSku={selectedSku} onSelect={select} scores={scores} quotes={quote.quotes} />}
      </article>;
    })}</div>
    <div className="offer-ladder-summary" aria-label={t("selection.ladderHeading")}>
      <p><strong>{selected.product.name[locale]}</strong> · {t("selection.ladderPrice", { price: selected.price })}</p>
      <p>{t("selection.ladderBalance", { balance })}{canBuy && shortfall > 0 ? ` · ${t("selection.insufficientBalance", { gap: shortfall })}` : ""}</p>
      {receipt ? <div role="status"><p>{t("selection.contextualUnlocked")}</p><Link className="button" href={receipt.reportId ? `${prefix}/bao-cao/${encodeURIComponent(receipt.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>{t("selection.viewProgress")}</Link></div> :
        selected.state === "owned" ? <Link className="button" href={selected.quote?.reportId ? `${prefix}/bao-cao/${encodeURIComponent(selected.quote.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>{t(selected.quote?.reportState === "ready" ? "selection.readAgain" : selected.quote?.reportId ? "selection.viewProgress" : "selection.viewLibrary")}</Link> :
          <button ref={trigger} type="button" className="button button-primary" disabled={!canBuy} onClick={() => setOpen(true)}>{canBuy ? t("selection.ladderOpen", { price: selected.price }) : t(selected.product.availability === "active" ? "selection.ladderUnavailable" : "selection.ladderComingSoon")}</button>}
      <Link href={`${prefix}/bao-cao-mau/tu-vi`}>{t("selection.viewSample")}</Link>
    </div>
    <UnlockSheet open={open} chartId={chartId} chartVersionId={chartVersionId} sku={selectedSku} locale={locale} itemName={selected.product.name[locale]} labels={labels}
      onOpenChange={setOpen} onUnlocked={reportId => { setReceipt({ reportId }); quote.retry(); }} />
  </div>;
}
