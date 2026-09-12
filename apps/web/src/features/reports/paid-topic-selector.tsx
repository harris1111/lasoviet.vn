export function formatUpgradeDeadline(
  dateStr: string,
  locale: "vi" | "en",
): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = find("day");
    const month = find("month");
    const year = find("year");
    const hour = find("hour");
    const minute = find("minute");

    if (locale === "vi") {
      return `${hour}:${minute} ${day}/${month}/${year}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

import Link from "next/link";
import type {
  OrderHistoryItemV1,
  PaidTopicSelectionViewV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { createCheckoutOrderAction } from "../commerce/create-checkout-order";
import type { PublicOfferKey } from "../commerce/checkout-offer";
import { CheckoutPurchaseForm } from "../commerce/checkout-purchase-form";
import type { ZiweiPresentationLocale } from "../ziwei/ziwei-presentation";
import {
  buildSafeOfferPresentations,
  type OfferOwnershipState,
} from "./purchase-offer-presentation";

export type PaidTopicSelectorProps = {
  locale: ZiweiPresentationLocale;
  topics: PaidTopicSelectionViewV1;
  birthSummary?: ZiweiBirthSummaryV1;
  ownershipByOfferKey?: Partial<Record<PublicOfferKey, OfferOwnershipState>>;
  orderHistory?: OrderHistoryItemV1[];
  now?: Date;
};

export function PaidTopicSelector({
  locale,
  topics,
  birthSummary,
  ownershipByOfferKey,
  orderHistory,
  now,
}: PaidTopicSelectorProps) {
  const t = useTranslations("reports");

  const displayName = birthSummary?.displayName;
  const pageTitle = displayName
    ? t("selection.personalizedTitle", { name: displayName })
    : t("selection.title");

  const sampleHref = locale === "en" ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi";
  const chartHref = locale === "en" ? `/en/la-so/${encodeURIComponent(topics.chartId)}` : `/la-so/${encodeURIComponent(topics.chartId)}`;

  const safeOffers = buildSafeOfferPresentations({
    offers: topics.offers,
    ownershipByOfferKey,
    locale,
    orders: orderHistory,
    chartId: topics.chartId,
    now,
  });

  return (
    <section aria-labelledby="topic-selector-heading" className="paid-topic-selector">
      <div className="topic-selector-header">
        <p className="eyebrow">{t("selection.eyebrow")}</p>
        <h1 id="topic-selector-heading">{pageTitle}</h1>
        <p className="topic-selector-context">
          {birthSummary?.normalizedCalendar?.date
            ? t("selection.contextWithDate", { date: birthSummary.normalizedCalendar.date })
            : t("selection.context")}{" "}
          ·{" "}
          <Link href={chartHref} className="back-to-chart-link">
            {t("selection.backToChart")}
          </Link>
        </p>
        </div>

      {/* Layer 2: Zi Wei Reading Topics */}
      <div className="topics-layer" data-testid="topics-layer">
        <div className="topics-list">
          {/* Active Available Topics (at most two) */}
          {safeOffers.map((offer) => (
            <article
              className="topic-card topic-card-active"
              data-testid={
                offer.offerKey === "ziwei-comprehensive"
                  ? "topic-lifetime-active"
                  : `topic-${offer.offerKey}-active`
              }
              id={offer.anchorId}
              key={offer.offerKey}
            >
              <div className="topic-card-head">
                <div className="topic-title-group">
                  {offer.badge ? (
                    <span className="status-badge badge-featured">{offer.badge[locale]}</span>
                  ) : (
                    <span className="topic-status-tag tag-available">{t("selection.available")}</span>
                  )}
                  <h3>{offer.title[locale]}</h3>
                </div>
                <div className="topic-pricing-block">
                  {offer.upgradeCredit ? (
                    <div className="topic-upgrade-pricing">
                      <span className="topic-list-price">
                        {offer.upgradeCredit.listPrice.toLocaleString(locale === "en" ? "en-US" : "vi-VN")} {locale === "en" ? "VND" : "₫"}
                      </span>
                      <span className="topic-credit-tag">
                        {locale === "en"
                          ? `Credit: -${offer.upgradeCredit.creditApplied.toLocaleString("en-US")} VND`
                          : `Đã trừ: -${offer.upgradeCredit.creditApplied.toLocaleString("vi-VN")} ₫`}
                      </span>
                      <span className="topic-price-val">
                        {offer.upgradeCredit.netPrice.toLocaleString(locale === "en" ? "en-US" : "vi-VN")} {locale === "en" ? "VND" : "₫"}
                      </span>
                    </div>
                  ) : (
                    <span className="topic-price-val">
                      {offer.price.toLocaleString(locale === "en" ? "en-US" : "vi-VN")} {locale === "en" ? "VND" : "₫"}
                    </span>
                  )}
                  <span className="topic-price-note">{t("selection.oneTime")}</span>
                </div>
              </div>

              {offer.upgradeCredit && (
                <div className="topic-upgrade-notice" data-testid="topic-upgrade-notice">
                  <p className="topic-credit-expires">
                    {locale === "en" ? (
                      <>
                        Upgrade credit valid until:{" "}
                        <time dateTime={offer.upgradeCredit.creditExpiresAt}>
                          {formatUpgradeDeadline(offer.upgradeCredit.creditExpiresAt, locale)}
                        </time>
                      </>
                    ) : (
                      <>
                        Ưu đãi nâng cấp áp dụng đến:{" "}
                        <time dateTime={offer.upgradeCredit.creditExpiresAt}>
                          {formatUpgradeDeadline(offer.upgradeCredit.creditExpiresAt, locale)}
                        </time>
                      </>
                    )}
                  </p>
                  <p className="topic-unlocked-summary">
                    {locale === "en"
                      ? "Unlocks key configurations, 12 palace readings, and 4 thematic syntheses."
                      : "Mở khóa thêm: Cấu trúc và cách cục trọng yếu, Luận giải chi tiết 12 cung vị, Tổng hợp 4 lĩnh vực đời sống."}
                  </p>
                </div>
              )}

              {offer.upgradeDisclosure && (
                <p className="topic-upgrade-disclosure" data-testid="topic-upgrade-disclosure">
                  {offer.upgradeDisclosure[locale]}
                </p>
              )}

              <p className="topic-summary-prose">{offer.summary[locale]}</p>

              <ul className="topic-deliverables-list">
                {offer.deliverables[locale].map((deliverable, index) => (
                  <li key={index}>{deliverable}</li>
                ))}
              </ul>

              {offer.fit && (
                <p className="topic-fit-line" data-testid={`topic-${offer.offerKey}-fit`}>
                  {offer.fit[locale]}
                </p>
              )}

              {offer.ownership.kind === "readable" ? (
                <div className="topic-actions-row">
                  <Link className="button button-primary" href={offer.ownership.readUrl}>
                    {t("selection.readAgain")}
                  </Link>
                  <Link className="sample-report-link" href={sampleHref}>
                    {t("selection.viewSample")} →
                  </Link>
                </div>
              ) : offer.ownership.kind === "processing_or_terminal" ? (
                <div className="topic-actions-row">
                  <Link className="button button-primary" href={offer.ownership.progressUrl}>
                    {t("selection.viewProgress")}
                  </Link>
                  <Link className="sample-report-link" href={sampleHref}>
                    {t("selection.viewSample")} →
                  </Link>
                </div>
              ) : offer.ownership.kind === "owned_unknown" ? (
                <div className="topic-actions-row">
                  <Link className="button button-primary" href={offer.ownership.libraryUrl}>
                    {t("selection.viewLibrary")}
                  </Link>
                  <Link className="sample-report-link" href={sampleHref}>
                    {t("selection.viewSample")} →
                  </Link>
                </div>
              ) : offer.ownership.kind === "unavailable" ? (
                <div
                  aria-live="polite"
                  className="checkout-purchase-unavailable"
                  data-testid="checkout-unavailable-state"
                  role="status"
                >
                  <p className="checkout-purchase-unavailable-title">
                    {t("selection.unavailableTitle")}
                  </p>
                  <p className="checkout-purchase-unavailable-description">
                    {t("selection.unavailableDescription")}
                  </p>
                  <div className="topic-actions-row">
                    <Link className="sample-report-link" href={sampleHref}>
                      {t("selection.viewSample")} →
                    </Link>
                  </div>
                </div>
              ) : (
                <CheckoutPurchaseForm
                  action={createCheckoutOrderAction.bind(
                    null,
                    topics.chartId,
                    locale,
                    offer.offerKey,
                  )}
                  chartId={topics.chartId}
                  locale={locale}
                  offerKey={offer.offerKey}
                  sampleHref={sampleHref}
                  labels={{
                    continuePayment: offer.ctaLabel[locale],
                    viewSample: t("selection.viewSample"),
                    pausedTitle: t("selection.pausedTitle"),
                    pausedDescription: t("selection.pausedDescription"),
                    retry: t("selection.retry"),
                  }}
                />
              )}
            </article>
          ))}


        </div>
        <div className="topic-selector-trust-footer" data-testid="topic-trust-footer">
          <p className="topic-trust-row topic-trust-line">{t("selection.trustRow")}</p>
          <p className="topic-gate-note">{t("selection.gateNote")}</p>
          <p className="topic-help-row">
            {t("selection.helpPrefix")}{" "}
            <Link href={locale === "en" ? "/en/lien-he" : "/lien-he"} className="topic-help-link">
              {t("selection.helpLink")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
