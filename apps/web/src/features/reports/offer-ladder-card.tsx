"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { LaSku, WalletQuoteV1 } from "@lasoviet/contracts";

export type OfferCardState = "available" | "owned" | "coming_soon" | "unavailable" | string;

/**
 * One card on the selection page. The card's single primary control is a real <button>
 * stretched over the whole card (`.stretched-target`), so mouse, touch, Enter and Space all
 * select it and only one element takes Tab. Locked cards render a disabled button plus a
 * visible reason and never call onSelect. Minimal patch: Phase 5 rebuilds these cards.
 */
export function OfferCard({ sku, name, price, state, locked, selected, lifetime, quote, onSelect, children }: {
  sku: LaSku; name: string; price: number; state: OfferCardState; locked: boolean;
  selected: boolean; lifetime: boolean; quote?: WalletQuoteV1;
  onSelect: (sku: LaSku) => void; children?: ReactNode;
}) {
  const t = useTranslations("reports");
  const comingSoon = state === "coming_soon" || locked;
  const selectable = !comingSoon && state !== "unavailable";
  const reasonId = `offer-reason-${sku}`;
  return <article className={`stretched-card${lifetime ? " offer-ladder-best" : ""}`} data-sku={sku}
    data-state={selectable ? "selectable" : "locked"} data-selected={selectable && selected ? "true" : "false"}>
    {lifetime && <span className="fd109-state">{t("selection.ladderBestValue")}</span>}
    <h3>{name}</h3>
    <p className="offer-ladder-price">{t("selection.ladderPrice", { price })}</p>
    {lifetime && <p>{t("selection.ladderLifetimeComparison")}</p>}
    {quote && quote.creditLa > 0 && <p>{t("selection.ladderCredit", { credit: quote.creditLa, price })}</p>}
    {quote && quote.discountLa > 0 && <p>{t("selection.ladderDiscount", { discount: quote.discountLa })}</p>}
    {state === "owned" && <p>{t("selection.ladderOwned")}</p>}
    {selectable
      ? <button type="button" className="button button-secondary offer-card-select stretched-target" aria-pressed={selected} onClick={() => onSelect(sku)}>
        {selected ? <><span aria-hidden="true">✓</span> {t("selection.ladderSelected")}</> : t("selection.ladderSelect")}
      </button>
      : <>
        <button type="button" className="button button-secondary offer-card-select" disabled aria-disabled="true" aria-describedby={reasonId}>{t("selection.ladderSelect")}</button>
        <p id={reasonId} className="offer-card-reason">{comingSoon ? t("selection.ladderComingSoon") : t("selection.ladderUnavailable")}</p>
      </>}
    {children}
  </article>;
}
