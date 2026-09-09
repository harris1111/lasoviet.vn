import Link from "next/link";
import type {
  PaidTopicSelectionViewV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

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
};

export function PaidTopicSelector({
  locale,
  topics,
  birthSummary,
  ownershipByOfferKey,
}: PaidTopicSelectorProps) {
  const t = useTranslations("reports");

  const displayName = birthSummary?.displayName;
  const pageTitle = displayName
    ? t("selection.personalizedTitle", { name: displayName })
    : t("selection.title");

  const sampleHref = locale === "en" ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi";

  const safeOffers = buildSafeOfferPresentations({
    offers: topics.offers,
    ownershipByOfferKey,
  });

  const disciplines = [
    {
      id: "ziwei",
      name: locale === "vi" ? "Tử Vi Đẩu Số" : "Zi Wei Dou Shu",
      status: "available",
      badge: t("selection.available"),
      description:
        locale === "vi"
          ? "Hệ thống 12 cung số phản chiếu cấu trúc bản mệnh và các trục tương tác đa chiều."
          : "Twelve-palace system reflecting natal structure and multi-dimensional palace interactions.",
    },
    {
      id: "bazi",
      name: locale === "vi" ? "Bát Tự (Tứ Trụ)" : "BaZi (Four Pillars)",
      status: "dev",
      badge: t("selection.inDevelopment"),
      description:
        locale === "vi"
          ? "Phân tích Thiên can, Địa chi, Ngũ hành vượng suy và trạng thái cân bằng của Nhật chủ."
          : "Analysis of Heavenly Stems, Earthly Branches, and five-element Day Master equilibrium.",
    },
    {
      id: "astrology",
      name: locale === "vi" ? "Bản đồ sao phương Tây" : "Western Astrology",
      status: "dev",
      badge: t("selection.inDevelopment"),
      description:
        locale === "vi"
          ? "Vị trí các hành tinh, cung địa bàn và góc hợp tại thời khắc chào đời theo tọa độ thực."
          : "Planetary positions, houses, and geometric aspects charted from exact birth coordinates.",
    },
    {
      id: "numerology",
      name: locale === "vi" ? "Thần số học (Pitago)" : "Numerology",
      status: "dev",
      badge: t("selection.inDevelopment"),
      description:
        locale === "vi"
          ? "Các chỉ số đường đời, năng lực tự nhiên và chu kỳ cá nhân dẫn xuất từ ngày sinh."
          : "Life path vibratory numbers, natural competencies, and personal developmental cycles.",
    },
  ];

  const comingSoonTopics = [
    {
      id: "relationship",
      title: locale === "vi" ? "Tình duyên & Hôn nhân" : "Relationship & Marriage",
      badge: t("selection.comingSoon"),
      description:
        locale === "vi"
          ? "Đi sâu vào cung Phu Thê, các sao đào hoa, tương tác duyên nợ và sự hòa hợp trong mối quan hệ dài hạn."
          : "Dedicated inspection of the Spouse Palace, affinity stars, and enduring relational harmony.",
    },
    {
      id: "career-wealth",
      title: locale === "vi" ? "Công danh & Tài lộc" : "Career & Wealth",
      badge: t("selection.comingSoon"),
      description:
        locale === "vi"
          ? "Phân tích chuyên sâu trục Quan Lộc - Tài Bạch, điểm rơi phát triển sự nghiệp và cách quản trị nguồn lực."
          : "In-depth synthesis of the Career and Wealth axis, professional momentum, and asset stewardship.",
    },
    {
      id: "annual",
      title: locale === "vi" ? "Vận trình năm & Lưu niên" : "Annual Outlook",
      badge: t("selection.comingSoon"),
      description:
        locale === "vi"
          ? "Luận giải lưu niên thái tuế, tiểu hạn theo năm và những cơ hội cũng như thách thức trọng điểm."
          : "Yearly horoscope transitions, current-year triggers, and focal opportunities.",
    },
  ];

  return (
    <section aria-labelledby="topic-selector-heading" className="paid-topic-selector">
      <div className="topic-selector-header">
        <p className="eyebrow">{t("selection.eyebrow")}</p>
        <h1 id="topic-selector-heading">{pageTitle}</h1>
      </div>

      {/* Layer 1: Birth Data Disciplines */}
      <div className="disciplines-layer" data-testid="disciplines-layer">
        <div className="layer-header">
          <h2>{t("selection.disciplinesTitle")}</h2>
          <p className="layer-subtitle">{t("selection.disciplinesSubtitle")}</p>
        </div>
        <div className="disciplines-grid">
          {disciplines.map((d) => (
            <article className={`discipline-card status-${d.status}`} key={d.id}>
              <div className="card-top">
                <h3>{d.name}</h3>
                <span className={`status-badge badge-${d.status}`}>{d.badge}</span>
              </div>
              <p className="card-desc">{d.description}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Layer 2: Zi Wei Reading Topics */}
      <div className="topics-layer" data-testid="topics-layer">
        <div className="layer-header">
          <h2>{t("selection.topicsTitle")}</h2>
          <p className="layer-subtitle">{t("selection.topicsSubtitle")}</p>
        </div>

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
                  <span className="topic-status-tag tag-available">{t("selection.available")}</span>
                  <h3>{offer.title[locale]}</h3>
                </div>
                <div className="topic-pricing-block">
                  <span className="topic-price-val">
                    {offer.price.toLocaleString(locale === "en" ? "en-US" : "vi-VN")} {locale === "en" ? "VND" : "₫"}
                  </span>
                  <span className="topic-price-note">{t("selection.oneTime")}</span>
                </div>
              </div>

              <p className="topic-summary-prose">{offer.summary[locale]}</p>

              <ul className="topic-deliverables-list">
                {offer.deliverables[locale].map((deliverable, index) => (
                  <li key={index}>{deliverable}</li>
                ))}
              </ul>

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
                  chartId={topics.chartId}
                  locale={locale}
                  offerKey={offer.offerKey}
                  sampleHref={sampleHref}
                  labels={{
                    continuePayment: t("selection.continuePayment"),
                    viewSample: t("selection.viewSample"),
                    pausedTitle: t("selection.pausedTitle"),
                    pausedDescription: t("selection.pausedDescription"),
                    retry: t("selection.retry"),
                  }}
                />
              )}
            </article>
          ))}

          {/* Disabled Coming Soon Topics */}
          {comingSoonTopics.map((topic) => (
            <article className="topic-card topic-card-disabled" data-testid={`topic-${topic.id}-disabled`} key={topic.id}>
              <div className="topic-card-head">
                <div className="topic-title-group">
                  <span className="topic-status-tag tag-coming-soon">{topic.badge}</span>
                  <h3>{topic.title}</h3>
                </div>
              </div>
              <p className="topic-summary-prose">{topic.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
