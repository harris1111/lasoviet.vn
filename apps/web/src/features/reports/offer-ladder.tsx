"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import { useTranslations } from "next-intl";
import { findLaProduct, isSinglePalaceSku, type LaSku, type WalletQuoteV1 } from "@lasoviet/contracts";
import { UnlockSheet } from "../commerce/unlock-sheet";
import { useUnlockLabels } from "../commerce/contextual-unlock";
import { useWalletQuotes, type InitialWalletQuotes } from "../commerce/use-wallet-quotes";
import { ladderSelectionQuery } from "../commerce/offer-selection";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";
import { claimLadderViewEvents } from "./offer-ladder-analytics";
import { PalacePicker } from "./palace-picker";
import { OfferCard } from "./offer-ladder-card";
import { visibleLadder } from "./offer-ladder-config";
import { LaMark } from "../../components/la-icons";

export function OfferLadder({ chartId, chartVersionId, locale, initialSku, initialQuotes, initialResume = false, initialIntent = false, balance, scores }: {
  chartId: string; chartVersionId: string; locale: "vi" | "en"; initialSku: LaSku;
  initialQuotes: InitialWalletQuotes; initialResume?: boolean; initialIntent?: boolean; balance: number; scores: Record<string, number>;
}) {
  const t = useTranslations("reports");
  const router = useRouter();
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
  const resumed = useRef(false);
  useEffect(() => {
    if (!initialResume || resumed.current || selectedSku !== initialSku || quote.status !== "ready") return;
    const current = quote.quotes?.find(item => item.sku === initialSku);
    const button = root.current?.querySelector<HTMLButtonElement>(`button[data-sku-open="${initialSku}"]`);
    if (current?.state !== "available" || !button || button.disabled) return;
    // Open confirmation only. The user still explicitly confirms any spend or top-up.
    resumed.current = true;
    button.click();
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
  function openCard(sku: LaSku) { select(sku); setOpen(true); }
  function ownedLinkFor(sku: LaSku, result?: WalletQuoteV1) {
    const href = sku === "ZIWEI-TODAY-P0" ? "#personal-daily-reading" : result?.reportId ? `${prefix}/bao-cao/${encodeURIComponent(result.reportId)}` : `${prefix}/tai-khoan/bao-cao`;
    return { href, label: t(sku === "ZIWEI-TODAY-P0" || result?.reportState === "ready" ? "selection.readAgain" : result?.reportId ? "selection.viewProgress" : "selection.viewLibrary") };
  }
  function terms(sku: LaSku) {
    const product = findLaProduct(sku)!;
    const result = quote.quotes?.find(item => item.sku === sku);
    const guestSupported = product.locales.includes(locale) && !(locale === "en" && product.category === "palace");
    return { product, quote: result, state: result?.state ?? (quote.status !== "guest" ? "unavailable" : !guestSupported ? "unavailable" : product.availability === "active" ? "available" : "coming_soon"), price: result?.priceLa ?? product.priceLa };
  }
  const tiers = visibleLadder(locale, palaceSku);
  const tierName = (tier: string) => t(`selection.tier${tier[0]!.toUpperCase()}${tier.slice(1)}`);
  const selected = terms(selectedSku);
  return <div ref={root} className="offer-ladder" data-testid="offer-ladder">
    <h2>{t("selection.ladderHeading")}</h2><p>{t("selection.ladderDescription")}</p>
    {quote.status === "loading" && <p role="status">{t("selection.ladderLoading")}</p>}
    {quote.status === "error" && <div role="alert"><p>{t("selection.ladderQuoteError")}</p><button type="button" className="button" onClick={quote.retry}>{t("selection.retry")}</button></div>}
    <p>{t("selection.ladderIntro")}</p>
    <div className="offer-ladder-body">
    <nav className="offer-ladder-rail" aria-label={t("selection.ladderRail")}>
      <ol>{tiers.map(({ tier, entries }) => <li key={tier}><a href={`#offer-tier-first-${tier}`}>
        <span>{tierName(tier)}</span><small>{t("selection.ladderRailCount", { count: entries.length })}</small></a></li>)}</ol>
      <p className="offer-ladder-rail-balance" aria-hidden="true"><LaMark name="wallet" size={28} />{t("selection.ladderBalance", { balance })}</p>
    </nav>
    <div className="offer-ladder-tiers">
    {tiers.map(({ tier, entries }) => <section key={tier} className="offer-ladder-tier" aria-labelledby={`offer-tier-${tier}`}>
      <h3 id={`offer-tier-${tier}`}>{tierName(tier)}</h3>
      <div className="offer-ladder-cards">{entries.map(({ sku: entrySku, resolved: sku, copy }, index) => {
        const item = terms(sku);
        const palace = entrySku === "palace";
        const fits = initialIntent && (palace ? isSinglePalaceSku(selectedSku) && isSinglePalaceSku(initialSku) : sku === initialSku);
        return <OfferCard key={palace ? "palace" : sku} sku={sku} name={palace ? t("selection.ladderPalace") : item.product.name[locale]}
          price={item.price} state={item.state} quote={item.quote} lifetime={sku === "ZIWEI-IDENTITY-P0"}
          canOpen={item.state === "available" && (quote.status === "ready" || quote.status === "guest")}
          shortfall={Math.max(0, item.price - balance)} onOpen={openCard}
          ownedLink={item.state === "owned" ? ownedLinkFor(sku, item.quote) : undefined}
          fitLabel={fits ? t("selection.ladderFit") : undefined}
          tierLabel={tierName(tier)} anchorId={index === 0 ? `offer-tier-first-${tier}` : undefined}
          copy={{ pitch: t(`selection.copy.${copy}.pitch`), parts: t(`selection.copy.${copy}.parts`), learnLabel: t("selection.ladderLearn"),
            learn: [t(`selection.copy.${copy}.l1`), t(`selection.copy.${copy}.l2`), t(`selection.copy.${copy}.l3`)] }}>
          {palace && <PalacePicker locale={locale} selectedSku={selectedSku} onSelect={select} scores={scores} quotes={quote.quotes} />}
        </OfferCard>;
      })}</div>
    </section>)}
    </div>
    </div>
    <div className="offer-ladder-summary" aria-label={t("selection.ladderHeading")}>
      <p className="la-balance-row"><LaMark name="wallet" size={28} />{t("selection.ladderBalance", { balance })}</p>
      {receipt && <div role="status"><p>{t("selection.contextualUnlocked")}</p><Link className="button" href={selectedSku === "ZIWEI-TODAY-P0" ? "#personal-daily-reading" : receipt.reportId ? `${prefix}/bao-cao/${encodeURIComponent(receipt.reportId)}` : `${prefix}/tai-khoan/bao-cao`}>{t("selection.viewProgress")}</Link></div>}
      <Link href={`${prefix}/bao-cao-mau/tu-vi`}>{t("selection.viewSample")}</Link>
    </div>
    <UnlockSheet open={open} chartId={chartId} chartVersionId={chartVersionId} sku={selectedSku} locale={locale} itemName={selected.product.name[locale]} labels={labels}
      onOpenChange={setOpen} onUnlocked={reportId => { setReceipt({ reportId }); quote.retry(); if (selectedSku === "ZIWEI-TODAY-P0") router.refresh(); }} />
  </div>;
}
