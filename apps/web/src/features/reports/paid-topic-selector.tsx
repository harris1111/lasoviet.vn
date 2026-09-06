import type { PaidTopicSelectionViewV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";
import { createCheckoutOrder } from "../commerce/create-checkout-order";

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
        <form action={createCheckoutOrder.bind(null, topics.chartId, locale)}>
          <button className="button" type="submit">{t("selection.available")}</button>
        </form>
      </article>
    </section>
  );
}
