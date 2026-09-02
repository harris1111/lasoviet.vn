import type { PaidTopicSelectionViewV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";

export function PaidTopicSelector({
  locale,
  topics,
}: {
  locale: ZiweiPresentationLocale;
  topics: PaidTopicSelectionViewV1;
}) {
  const t = useTranslations("reports");
  const presentation = ziweiPresentation(locale);
  const offer = topics.offers[0]!;
  const price = offer.price.toLocaleString(locale === "en" ? "en-US" : "vi-VN");

  return (
    <section className="paid-topic-selector">
      <p className="eyebrow">{t("selection.eyebrow")}</p>
      <h1>{t("selection.title")}</h1>
      <article className="paid-topic-offer">
        <p>{t("selection.available")}</p>
        <h2>{presentation.offer(offer.sku)}</h2>
        <p>{price} {offer.currency}</p>
        <p>{t("selection.oneTime")}</p>
        <p className="topic-deferred">{t("paymentDeferred")}</p>
      </article>
    </section>
  );
}
