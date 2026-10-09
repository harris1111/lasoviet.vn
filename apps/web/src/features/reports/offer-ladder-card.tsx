"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { LaSku, WalletQuoteV1 } from "@lasoviet/contracts";
import { LaGlyph } from "../../components/la-icons";

export type OfferCardState = "available" | "owned" | "coming_soon" | "unavailable" | string;

/**
 * One card on the selection page. The card's single primary control is a real <button>
 * stretched over the whole card (`.stretched-target`), so mouse, touch, Enter and Space all
 * select it and only one element takes Tab. Locked cards render a disabled button plus a
 * visible reason and never call onSelect. Minimal patch: Phase 5 rebuilds these cards.
 */
export type OfferCardCopy = { pitch: string; learn: string[]; parts: string; learnLabel: string };

export function OfferCard({ sku, name, price, state, locked, selected, lifetime, quote, onSelect, children, copy, fitLabel }: {
  sku: LaSku; name: string; price: number; state: OfferCardState; locked: boolean;
  selected: boolean; lifetime: boolean; quote?: WalletQuoteV1;
  onSelect: (sku: LaSku) => void; children?: ReactNode;
  copy?: OfferCardCopy; fitLabel?: string;
}) {
  const t = useTranslations("reports");
  const comingSoon = state === "coming_soon" || locked;
  const selectable = !comingSoon && state !== "unavailable";
  const reasonId = `offer-reason-${sku}`;
  const headingId = `offer-name-${sku}`;
  const buttonId = `offer-select-${sku}`;
  return <article className={`stretched-card${lifetime ? " offer-ladder-best" : ""}${fitLabel ? " offer-ladder-fit" : ""}`} data-sku={sku}
    data-state={selectable ? "selectable" : "locked"} data-selected={selectable && selected ? "true" : "false"}>
    {fitLabel && <span className="offer-fit-flag">{fitLabel}</span>}
    {lifetime && <span className="fd109-state">{t("selection.ladderBestValue")}</span>}
    <h3 id={headingId}>{name}</h3>
    {copy && <>
      <p className="offer-pitch">{copy.pitch}</p>
      <p className="offer-learn-label">{copy.learnLabel}</p>
      <ul className="offer-learn">{copy.learn.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="offer-parts">{copy.parts}</p>
    </>}
    <p className="offer-ladder-price"><LaGlyph />{t("selection.ladderPrice", { price })}</p>
    {lifetime && <p>{t("selection.ladderLifetimeComparison")}</p>}
    {quote && quote.creditLa > 0 && <p>{t("selection.ladderCredit", { credit: quote.creditLa, price })}</p>}
    {quote && quote.discountLa > 0 && <p>{t("selection.ladderDiscount", { discount: quote.discountLa })}</p>}
    {state === "owned" && <p>{t("selection.ladderOwned")}</p>}
    {selectable
      ? <button id={buttonId} type="button" className="button button-secondary offer-card-select stretched-target" aria-pressed={selected}
        aria-labelledby={`${buttonId} ${headingId}`} onClick={() => onSelect(sku)}>
        {/* Constant sr-only name ("Select this part" + card name); the visual state text is hidden from AT because aria-pressed already announces it. */}
        <span className="sr-only">{t("selection.ladderSelect")}</span>
        <span aria-hidden="true">{selected ? `✓ ${t("selection.ladderSelected")}` : t("selection.ladderSelect")}</span>
      </button>
      : <>
        <button type="button" className="button button-secondary offer-card-select" disabled aria-disabled="true" aria-labelledby={`${buttonId} ${headingId}`} id={buttonId} aria-describedby={reasonId}>{t("selection.ladderSelect")}</button>
        <p id={reasonId} className="offer-card-reason">{comingSoon ? t("selection.ladderComingSoon") : t("selection.ladderUnavailable")}</p>
      </>}
    {children}
  </article>;
}
