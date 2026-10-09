"use client";
import type { ReactNode } from "react";
import Link from "next/link";
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

export function OfferCard({ sku, name, price, state, lifetime, quote, shortfall = 0, canOpen, onOpen, ownedLink, children, copy, fitLabel }: {
  sku: LaSku; name: string; price: number; state: OfferCardState; lifetime: boolean; quote?: WalletQuoteV1;
  /** Lá still missing for this price; the card stays openable because the sheet tops up in place. */
  shortfall?: number; canOpen: boolean; onOpen: (sku: LaSku) => void;
  ownedLink?: { href: string; label: string }; children?: ReactNode;
  copy?: OfferCardCopy; fitLabel?: string;
}) {
  const t = useTranslations("reports");
  const owned = state === "owned" && ownedLink;
  const reasonId = `offer-reason-${sku}`;
  const headingId = `offer-name-${sku}`;
  const buttonId = `offer-open-${sku}`;
  const short = canOpen && shortfall > 0;
  return <article className={`stretched-card${lifetime ? " offer-ladder-best" : ""}${fitLabel ? " offer-ladder-fit" : ""}`} data-sku={sku}
    data-state={owned ? "owned" : canOpen ? (short ? "short" : "openable") : "locked"}>
    {fitLabel && <span className="offer-fit-flag">{fitLabel}</span>}
    {lifetime && <span className="fd109-state">{t("selection.ladderBestValue")}</span>}
    <h3 id={headingId}>{name}</h3>
    {copy && <>
      <p className="offer-pitch">{copy.pitch}</p>
      <p className="offer-learn-label">{copy.learnLabel}</p>
      <ul className="offer-learn">{copy.learn.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="offer-parts">{copy.parts}</p>
    </>}
    {children}
    <p className="offer-ladder-price"><LaGlyph />{t("selection.ladderPrice", { price })}</p>
    {lifetime && <p>{t("selection.ladderLifetimeComparison")}</p>}
    {quote && quote.creditLa > 0 && <p>{t("selection.ladderCredit", { credit: quote.creditLa, price })}</p>}
    {quote && quote.discountLa > 0 && <p>{t("selection.ladderDiscount", { discount: quote.discountLa })}</p>}
    {owned
      ? <>
        <p>{t("selection.ladderOwned")}</p>
        <Link className="button button-primary offer-card-open stretched-target" href={ownedLink.href}>{ownedLink.label}<span className="sr-only"> · {name}</span></Link>
      </>
      : canOpen
        ? <>
          <button id={buttonId} type="button" className={`button ${short ? "button-secondary offer-card-short" : "button-primary"} offer-card-open stretched-target`}
            aria-describedby={short ? reasonId : undefined} data-sku-open={sku}
            aria-label={t("selection.ladderOpenAria", { name, price })} onClick={() => onOpen(sku)}>
            <span aria-hidden="true">{t("selection.ladderOpenCard", { price })}</span><span className="offer-open-arrow" aria-hidden="true">→</span>
          </button>
          {short && <p id={reasonId} className="offer-card-reason">{t("selection.ladderShortfall", { gap: shortfall })}</p>}
        </>
        : <>
          <button type="button" className="button button-secondary offer-card-open" disabled aria-disabled="true" aria-describedby={reasonId} id={buttonId}
            aria-label={t("selection.ladderOpenAria", { name, price })}>{t("selection.ladderOpenCard", { price })}</button>
          <p id={reasonId} className="offer-card-reason">{t("selection.ladderUnavailable")}</p>
        </>}
  </article>;
}
