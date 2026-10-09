"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PartFeedback } from "../reports/part-feedback";
import type { FreeResultGift, FreeResultGiftPoint } from "./ziwei-free-result-model";

// One real palace, fully readable. Mobile-first: a single column at 360–430px, with the two
// action lists side by side only from 768px up. It renders the allowlisted projection only and
// never implies that the other palaces were written.
function Refs({ refs, label }: { refs: number[]; label: (n: number) => string }) {
  if (refs.length === 0) return null;
  return (
    <span className="fd109-gift-refs">
      {refs.map((n) => <a key={n} className="fd109-gift-ref" href={`#fd109-gift-fact-${n}`} aria-label={label(n)}>{n}</a>)}
    </span>
  );
}

export function FreePalaceGiftBlock({ gift, chartId, locale, remainingPalaces, score }: {
  gift: FreeResultGift;
  chartId: string;
  locale: "vi" | "en";
  remainingPalaces: number;
  score?: ReactNode;
}) {
  const t = useTranslations("ziwei");
  const refLabel = (n: number) => t("freeResult.giftEvidenceRef", { n });
  const list = (items: FreeResultGiftPoint[]) => (
    <ul className="fd109-gift-list">
      {items.map((item, index) => <li key={index}>{item.text} <Refs refs={item.refs} label={refLabel} /></li>)}
    </ul>
  );
  return (
    <section className="fd109-gift fd109-palace-gift" data-free-result-block="gift" data-palace-id={gift.palaceId} data-testid="fd109-palace-gift">
      <p className="eyebrow">{t("freeResult.giftEyebrow")} · {gift.palaceName}</p>
      <h2>{gift.title}</h2>
      {score}
      <p className="fd109-gift-conclusion">{gift.conclusion}</p>

      <h3>{t("freeResult.giftKeyPoints")}</h3>
      <ol className="fd109-gift-points">
        {gift.keyPoints.map((point, index) => (
          <li key={index}>{point.text} <Refs refs={point.refs} label={refLabel} /></li>
        ))}
      </ol>

      <h3>{t("freeResult.giftNarrative")}</h3>
      <div className="fd109-gift-prose">{gift.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>

      <div className="fd109-gift-actions">
        <div className="fd109-gift-do"><h3>{t("freeResult.giftDo")}</h3>{list(gift.doItems)}</div>
        <div className="fd109-gift-avoid"><h3>{t("freeResult.giftAvoid")}</h3>{list(gift.avoidItems)}</div>
      </div>

      <details className="fd109-gift-evidence">
        <summary>{t("freeResult.giftEvidence")}</summary>
        <ol>
          {gift.facts.map((fact) => (
            <li key={fact.n} id={`fd109-gift-fact-${fact.n}`} value={fact.n}><strong>{fact.label}</strong> · {fact.value}</li>
          ))}
        </ol>
      </details>

      <p className="fd109-gift-scope" role="note">{t("freeResult.giftOnePalace", { name: gift.palaceName, count: remainingPalaces })}</p>
      <PartFeedback locale={locale} chartId={chartId} partId="free-palace-gift" sku="free-result" />
    </section>
  );
}
