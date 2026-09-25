import Link from "next/link";
import { useTranslations } from "next-intl";
import type {
  OrderHistoryItemV1,
  PaidTopicSelectionViewV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";
import { customerContactConfig } from "@lasoviet/config/customer-contact";

import { createCheckoutOrderFormAction } from "../commerce/create-checkout-order";
import type { PublicOfferKey } from "../commerce/checkout-offer";
import { resolveActiveSkuFromPublicOfferKey } from "../commerce/checkout-offer";
import { OfferViewTracker, type RenderedOfferDescriptor } from "./offer-view-tracker";
import { SupportCard } from "../../components/ui/support-card";
import { formatDisplayDate, type ZiweiPresentationLocale } from "../ziwei/ziwei-presentation";
import {
  buildSafeOfferPresentations,
  type OfferOwnershipState,
  type SafeOfferPresentation,
} from "./purchase-offer-presentation";
import {
  LA_TOP_UP_PACKS,
  MEMBERSHIP_TIERS,
  findSmallestCoveringPack,
  type LaPackPresentation,
} from "../commerce/la-packs";

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

export type PaidTopicSelectorProps = {
  locale: ZiweiPresentationLocale;
  topics?: PaidTopicSelectionViewV1;
  birthSummary?: ZiweiBirthSummaryV1;
  ownershipByOfferKey?: Partial<Record<PublicOfferKey, OfferOwnershipState>>;
  orderHistory?: OrderHistoryItemV1[];
  now?: Date;
  supportEmail?: string;
  initialTab?: "luan-giai" | "hoi-vien" | "nap-la";
  userBalance?: number;
};

export function PaidTopicSelector({
  locale,
  topics,
  birthSummary,
  ownershipByOfferKey,
  orderHistory,
  now,
  supportEmail = customerContactConfig.email.value,
  initialTab,
  userBalance = 0,
}: PaidTopicSelectorProps) {
  const t = useTranslations("reports");

  const activeTab: "luan-giai" | "hoi-vien" | "nap-la" =
    initialTab ?? (topics ? "luan-giai" : "nap-la");
  const selectedReading: PublicOfferKey = "ziwei-comprehensive";
  const selectedPackId = "LA-DISCOVER-3000";
  const selectedMembershipId = "membership-yearly";

  const balance = userBalance;

  const defaultOffers: PaidTopicSelectionViewV1["offers"] = [
    {
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      method: "ziwei",
      price: 19000,
      currency: "VND",
      sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
    },
    {
      sku: "ZIWEI-IDENTITY-P0",
      method: "ziwei",
      price: 79000,
      currency: "VND",
      sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis"],
    },
  ];

  const safeOffers = buildSafeOfferPresentations({
    offers: topics?.offers ?? defaultOffers,
    ownershipByOfferKey,
    locale,
    orders: orderHistory,
    chartId: topics?.chartId,
    now,
  });

  const renderedOfferDescriptors: RenderedOfferDescriptor[] = [];
  for (const offer of safeOffers) {
    const sku = resolveActiveSkuFromPublicOfferKey(offer.offerKey);
    if (sku) {
      renderedOfferDescriptors.push({
        offerId: offer.offerKey,
        sku,
      });
    }
  }

  const displayName = birthSummary?.displayName;
  const pageTitle = displayName
    ? t("selection.personalizedTitle", { name: displayName })
    : t("selection.title");

  const chartHref = topics?.chartId
    ? locale === "en"
      ? `/en/la-so/${encodeURIComponent(topics.chartId)}`
      : `/la-so/${encodeURIComponent(topics.chartId)}`
    : locale === "en"
      ? "/en/tao-la-so/tu-vi"
      : "/tao-la-so/tu-vi";

  // Selected reading calculations
  const activeOffer =
    safeOffers.find((o) => o.offerKey === selectedReading) ?? safeOffers[0];
  const activePack =
    LA_TOP_UP_PACKS.find((p) => p.id === selectedPackId) ?? LA_TOP_UP_PACKS[2]!;
  const activeMembership =
    MEMBERSHIP_TIERS.find((m) => m.id === selectedMembershipId) ??
    MEMBERSHIP_TIERS[1]!;

  const neededLa = activeOffer ? activeOffer.laPrice : 0;
  const laGap = Math.max(0, neededLa - balance);
  const coveringPack = findSmallestCoveringPack(laGap);

  // FAQ per tab
  const readingFaqs = [
    {
      q: locale === "en"
        ? "How do Core Destiny and Comprehensive readings differ?"
        : "Bản mệnh và Toàn diện khác nhau thế nào?",
      a: locale === "en"
        ? "Core Destiny focuses on your personality, core axis, strengths, and tensions. Comprehensive expands to career, wealth, love, health, 10-year decadal cycle, and monthly forecasts."
        : "Bản mệnh nói về con người bạn: tính cách, trục Mệnh - Thân, điểm mạnh và điểm căng. Toàn diện mở rộng thêm công việc, tiền bạc, tình duyên, sức khoẻ, đại vận 10 năm và từng tháng hạn năm nay.",
    },
    {
      q: locale === "en" ? "What is Lá?" : "Lá là gì?",
      a: locale === "en"
        ? "Lá is the service credit on Lá Số Việt used to unlock readings, membership, and family charts from one single shared balance."
        : "Lá là đơn vị để mở nội dung trên Lá Số Việt. Bạn nạp Lá một lần rồi dùng cho mọi thứ: luận giải, hội viên, lá số người thân từ một số dư chung.",
    },
    {
      q: locale === "en"
        ? "What if I entered an incorrect birth date or time?"
        : "Nhập sai ngày giờ sinh thì sao?",
      a: locale === "en"
        ? "Please correct your birth information before unlocking. If you already unlocked and noticed a mistake, email support for assistance under our re-issue policy."
        : "Sửa thông tin trước khi mở. Nếu đã mở rồi mới phát hiện sai, gửi email tới hỗ trợ để được tạo lại theo chính sách dịch vụ.",
    },
  ];

  const topupFaqs = [
    {
      q: locale === "en"
        ? "How long after transfer do I receive my Lá?"
        : "Nạp Lá xong bao lâu thì nhận được?",
      a: locale === "en"
        ? "Lá is credited automatically to your account immediately when our system detects your VietQR transfer, typically within a few seconds."
        : "Lá được cộng tự động vào tài khoản ngay khi hệ thống nhận được chuyển khoản qua VietQR, thường trong vòng vài giây mà không cần chờ duyệt.",
    },
    {
      q: locale === "en" ? "Do purchased Lá expire?" : "Lá đã nạp có hết hạn không?",
      a: locale === "en"
        ? "Purchased and bonus Lá never expire. You can use your balance at any time across all Lá Số Việt features."
        : "Lá đã nạp và Lá tặng không bao giờ hết hạn. Bạn có thể sử dụng bất cứ lúc nào cho mọi tính năng trên Lá Số Việt.",
    },
    {
      q: locale === "en"
        ? "Can unused Lá be refunded to cash?"
        : "Có thể hoàn tiền Lá chưa dùng không?",
      a: locale === "en"
        ? "Under our terms of service, Lá cannot be converted back to cash. If a payment encounter any technical error, our support team will promptly issue a refund or credit bonus."
        : "Theo điều khoản dịch vụ, Lá đã nạp không quy đổi ngược lại tiền mặt. Nếu thanh toán gặp sự cố kỹ thuật, hỗ trợ viên sẽ giải quyết hoàn tiền hoặc cộng bù đầy đủ.",
    },
  ];

  const membershipFaqs = [
    {
      q: locale === "en"
        ? "What is included in the Membership plan?"
        : "Gói hội viên bao gồm những gì?",
      a: locale === "en"
        ? "Membership includes daily personalized reading, monthly 12-month guidance, full chart personalization for free tools, and 20% discount on report unlocks."
        : "Gói hội viên bao gồm tính năng xem Tử Vi mỗi ngày, nguyệt vận 12 tháng, mở khóa bản theo lá số của mọi công cụ và giảm 20% khi mở luận giải.",
    },
    {
      q: locale === "en"
        ? "Does the Membership auto-renew?"
        : "Gói hội viên có tự động gia hạn không?",
      a: locale === "en"
        ? "Never. Lá Số Việt never automatically renews memberships or deducts credits without your explicit purchase confirmation."
        : "Hoàn toàn không. Lá Số Việt không bao giờ tự động gia hạn hoặc tự ý trừ Lá khi bạn chưa chủ động bấm mua.",
    },
    {
      q: locale === "en"
        ? "When will Membership officially launch?"
        : "Khi nào gói hội viên chính thức ra mắt?",
      a: locale === "en"
        ? "Membership features are in final polish and will launch in an upcoming release."
        : "Tính năng Hội viên đang trong giai đoạn hoàn thiện cuối cùng và sẽ sớm ra mắt đến người dùng trong bản cập nhật tới.",
    },
  ];

  const activeFaqs =
    activeTab === "luan-giai"
      ? readingFaqs
      : activeTab === "nap-la"
        ? topupFaqs
        : membershipFaqs;

  return (
    <section aria-labelledby="topic-selector-heading" className="pricing-page-container">
      <OfferViewTracker offers={renderedOfferDescriptors} />

      {/* Header */}
      <div className="c-head">
        <div>
          <p className="eyebrow">{t("selection.subheading")}</p>
          <h1 id="topic-selector-heading">{pageTitle}</h1>
          <p className="topic-selector-context">
            {birthSummary?.normalizedCalendar?.date
              ? t("selection.contextWithDate", {
                  date: formatDisplayDate(birthSummary.normalizedCalendar.date, locale),
                })
              : t("selection.context")}{" "}
            ·{" "}
            <Link href={chartHref} className="back-to-chart-link">
              {t("selection.backToChart")}
            </Link>{" "}
            ·{" "}
            <Link href={locale === "en" ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi"} className="view-sample-link">
              {t("selection.viewSample")}
            </Link>
          </p>
        </div>
        <span className="balance-pill">
          {locale === "en" ? "Balance" : "Số dư"} <b>{balance}</b> Lá
        </span>
      </div>

      {/* Segmented Tab Bar */}
      <div className="seg3" role="tablist" aria-label="Loại gói" id="seg">
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "luan-giai"}
          data-target="luan-giai"
        >
          {t("selection.tabReadings")}
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "hoi-vien"}
          data-target="hoi-vien"
        >
          {t("selection.tabMembership")}
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "nap-la"}
          data-target="nap-la"
        >
          {t("selection.tabTopup")}
        </button>
      </div>

      {/* Tab 1: Luận giải (FD-065: NO VND on this tab!) */}
      <section id="luan-giai" aria-label={t("selection.tabReadings")} hidden={activeTab !== "luan-giai"}>
        <div className="offers-grid" data-testid="topics-layer">
          {safeOffers.map((offer) => {
            const isSelected = selectedReading === offer.offerKey;
            const isFeatured = offer.offerKey === "ziwei-comprehensive";

            return (
              <article
                key={offer.offerKey}
                className={`offer-card ${isFeatured ? "is-featured" : ""} topic-card topic-card-active`}
                data-testid={
                  offer.offerKey === "ziwei-comprehensive"
                    ? "topic-lifetime-active"
                    : `topic-${offer.offerKey}-active`
                }
                id={offer.anchorId}
                data-offer-key={offer.offerKey}
                >
                  <div className="offer-top">
                    <span className="offer-medallion">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 32 32"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <circle cx="16" cy="16" r="10.5" />
                        <circle cx="16" cy="16" r="3.6" />
                      </svg>
                    </span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {offer.badge ? (
                        <span className="tag-gold">{offer.badge[locale]}</span>
                      ) : (
                        <span className="tag-subtle">{t("selection.available")}</span>
                      )}
                      <span className="radio-circle" aria-hidden="true" />
                    </div>
                  </div>

                  <h2>{offer.shortTitle[locale]}</h2>
                  <span className="sr-only">{offer.title[locale]}</span>

                  <div className="offer-price">
                    {offer.laPrice} <small>Lá</small>
                  </div>

                  <p className="offer-desc">{offer.summary[locale]}</p>

                  <ul className="offer-checklist">
                    {offer.deliverables[locale].map((deliverable, index) => (
                      <li key={index}>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 256 256"
                          fill="currentColor"
                        >
                          <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
                        </svg>
                        <span>{deliverable}</span>
                      </li>
                    ))}
                    {offer.offerKey === "ziwei-natal-excerpt" && (
                      <li className="excluded">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 256 256"
                          fill="currentColor"
                        >
                          <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" />
                        </svg>
                        <span>
                          {locale === "en"
                            ? "Excludes annual snapshot and decadal cycle"
                            : "Chưa có năm nay và đại vận"}
                        </span>
                      </li>
                    )}
                  </ul>

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

                  {offer.offerKey === "ziwei-natal-excerpt" && (
                    <div className="offer-upgrade-bar">
                      <span>
                        {locale === "en"
                          ? "Upgrade to Comprehensive within 7 days for only"
                          : "Nâng lên Toàn diện trong 7 ngày chỉ thêm"}{" "}
                        <b>720 Lá</b>
                      </span>
                    </div>
                  )}

                  {offer.ownership.kind === "readable" && (
                    <div style={{ marginTop: "12px" }}>
                      <Link className="button button-primary" href={offer.ownership.readUrl}>
                        {t("selection.readAgain")}
                      </Link>
                    </div>
                  )}

                  {offer.ownership.kind === "processing_or_terminal" && (
                    <div style={{ marginTop: "12px" }}>
                      <Link className="button button-secondary" href={offer.ownership.progressUrl}>
                        {t("selection.viewProgress")}
                      </Link>
                    </div>
                  )}

                  {offer.ownership.kind === "owned_unknown" && (
                    <div style={{ marginTop: "12px" }}>
                      <Link className="button button-secondary" href={offer.ownership.libraryUrl}>
                        {t("selection.viewLibrary")}
                      </Link>
                    </div>
                  )}

                  {offer.ownership.kind === "unavailable" && (
                    <div className="topic-card-unavailable" role="alert" style={{ marginTop: "12px" }}>
                      <p><strong>{t("selection.unavailableTitle")}</strong></p>
                      <p>{t("selection.unavailableDescription")}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

      {/* Tab 2: Hội viên (FD-093, Sắp có) */}
      <section id="hoi-vien" aria-label={t("selection.tabMembership")} hidden={activeTab !== "hoi-vien"}>
        <div className="offers-grid">
          {MEMBERSHIP_TIERS.map((tier) => {
            const isSelected = selectedMembershipId === tier.id;
            return (
              <article
                key={tier.id}
                className={`offer-card ${tier.isFeatured ? "is-featured" : ""}`}
                data-membership-id={tier.id}
              >
                  <div className="offer-top">
                    <h2>{tier.name[locale]}</h2>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {tier.badge && <span className="tag-gold">{tier.badge[locale]}</span>}
                      <span className="tag-subtle">
                        {locale === "en" ? "Coming soon" : "Sắp có"}
                      </span>
                      <span className="radio-circle" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="offer-price">{tier.priceFormatted[locale]}</div>

                  {tier.description && (
                    <p className="offer-desc">{tier.description[locale]}</p>
                  )}

                  <ul className="offer-checklist">
                    {tier.deliverables[locale].map((item, idx) => (
                      <li key={idx} className={item.excluded ? "excluded" : ""}>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 256 256"
                          fill="currentColor"
                        >
                          {item.excluded ? (
                            <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" />
                          ) : (
                            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
                          )}
                        </svg>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="pack-note">{t("selection.membershipNotice")}</p>
        </section>

      {/* Tab 3: Nạp Lá (FD-066: VND appears here) */}
      <section id="nap-la" aria-label={t("selection.tabTopup")} hidden={activeTab !== "nap-la"}>
        <div className="packs-grid" id="packs">
          {LA_TOP_UP_PACKS.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            return (
              <div
                key={pack.id}
                className={`pack-card ${pack.isFeatured ? "is-featured" : ""}`}
                aria-pressed={isSelected}
                data-pack-id={pack.id}
              >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="pack-name">{pack.name[locale]}</h3>
                    {pack.badge && <span className="tag-gold">{pack.badge[locale]}</span>}
                  </div>
                  <div className="pack-vnd">{pack.vndFormatted[locale]}</div>
                  <div className="pack-la">
                    <b>{pack.totalLa.toLocaleString(locale === "en" ? "en-US" : "vi-VN")}</b> Lá
                  </div>
                  {pack.bonusLa > 0 && (
                    <div className="pack-bonus">
                      {t("selection.bonusLa", {
                        count: pack.bonusLa.toLocaleString(locale === "en" ? "en-US" : "vi-VN"),
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="pack-note">{t("selection.topupNotice")}</p>
        </section>

      {/* Benefits Panel (Quyền lợi khi mở luận giải) */}
      <div className="benefits-grid" aria-label={t("selection.benefitsTitle")}>
        <div className="benefit-item">
          <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor">
            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
          </svg>
          <div>
            <b>{t("selection.benefitLifetime")}</b>
            {t("selection.benefitLifetimeDesc")}
          </div>
        </div>
        <div className="benefit-item">
          <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor">
            <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" />
          </svg>
          <div>
            <b>{t("selection.benefitPrivacy")}</b>
            {t("selection.benefitPrivacyDesc")}
          </div>
        </div>
        <div className="benefit-item">
          <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor">
            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
          </svg>
          <div>
            <b>{t("selection.benefitNoAutoRenew")}</b>
            {t("selection.benefitNoAutoRenewDesc")}
          </div>
        </div>
        <div className="benefit-item">
          <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor">
            <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z" />
          </svg>
          <div>
            <b>{t("selection.benefitSupport")}</b>
            {t("selection.benefitSupportDesc")}
          </div>
        </div>
      </div>

      {/* Dynamic Per-Tab FAQ */}
      <div className="faq-section" aria-label="FAQ">
        {activeFaqs.map((faq, index) => (
          <details key={index} className="faq-item" open={index === 0}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </div>

      {/* Support Card */}
      <div className="support-block" data-testid="topic-support-card">
        <SupportCard
          actionLabel={locale === "en" ? "Send support email" : "Gửi email hỗ trợ"}
          description={t("selection.supportDesc")}
          email={supportEmail}
          title={locale === "en" ? "Need help choosing a reading?" : "Cần hỗ trợ về gói luận giải?"}
        />
      </div>

      {/* Trust & Policy Notes */}
      <div className="topic-trust-block" style={{ marginTop: "24px", color: "var(--pearl-400)", fontSize: "14px", lineHeight: "1.6" }}>
        <p className="trust-row-note">{t("selection.trustRow")}</p>
        <p className="gate-note">{t("selection.gateNote")}</p>
        <p className="help-note">
          {t("selection.helpPrefix")}{" "}
          <Link href={locale === "en" ? "/en/lien-he" : "/lien-he"}>
            {t("selection.helpLink")}
          </Link>
        </p>
      </div>

      {/* Sticky Bottom Paybar */}
      <div className="paybar" role="region" aria-label="Đơn đang chọn">
        <div className="container">
          <div className="paybar-sum">
            {activeTab === "luan-giai" && activeOffer && (
              <>
                <b>
                  {activeOffer.shortTitle[locale]} · {neededLa} Lá
                </b>
                {laGap > 0 ? (
                  <>
                    {" "}
                    · <span className="short-warn">{t("selection.insufficientBalance", { gap: laGap })}</span>
                    <small>
                      {t("selection.smallestPackHint", {
                        pack: coveringPack.name[locale],
                        la: coveringPack.totalLa,
                        vnd: coveringPack.vndFormatted[locale],
                      })}
                    </small>
                  </>
                ) : (
                  <small>
                    {locale === "en"
                      ? `Sufficient balance: ${balance} Lá`
                      : `Đủ số dư: ${balance} Lá`}
                  </small>
                )}
              </>
            )}

            {activeTab === "nap-la" && (
              <>
                <b>
                  {activePack.name[locale]} · {activePack.totalLa} Lá
                </b>{" "}
                · {activePack.vndFormatted[locale]}
                <small>{t("selection.laInstantNotice")}</small>
              </>
            )}

            {activeTab === "hoi-vien" && (
              <>
                <b>
                  {activeMembership.name[locale]} · {activeMembership.priceFormatted[locale]}
                </b>
                <small>{t("selection.membershipNotice")}</small>
              </>
            )}
          </div>

          <div className="paybar-btn">
            {activeTab === "luan-giai" && activeOffer && (
              activeOffer.ownership.kind === "readable" ? (
                <Link className="button button-primary btn btn-primary" href={activeOffer.ownership.readUrl}>
                  {t("selection.readAgain")}
                </Link>
              ) : activeOffer.ownership.kind === "processing_or_terminal" ? (
                <Link className="button button-secondary btn btn-secondary" href={activeOffer.ownership.progressUrl}>
                  {t("selection.viewProgress")}
                </Link>
              ) : activeOffer.ownership.kind === "owned_unknown" ? (
                <Link className="button button-secondary btn btn-secondary" href={activeOffer.ownership.libraryUrl}>
                  {t("selection.viewLibrary")}
                </Link>
              ) : activeOffer.ownership.kind === "unavailable" ? (
                <button type="button" className="button button-disabled btn" disabled>
                  {t("selection.unavailableTitle")}
                </button>
              ) : topics?.chartId ? (
                <form action={createCheckoutOrderFormAction}>
                  <input type="hidden" name="chartId" value={topics.chartId} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="offerKey" value={activeOffer.offerKey} />
                  <button type="submit" className="button button-primary btn btn-primary btn-lg">
                    {laGap > 0
                      ? `${t("selection.topupAndUnlock")}: ${coveringPack.vndFormatted[locale]}`
                      : `${t("selection.unlock")}: ${neededLa} Lá`}
                  </button>
                </form>
              ) : (
                <Link href={chartHref} className="button button-primary btn btn-primary btn-lg">
                  {locale === "en" ? "Create chart to unlock" : "Lập lá số để mở luận giải"}
                </Link>
              )
            )}

            {activeTab === "nap-la" && (
              topics?.chartId ? (
                <form action={createCheckoutOrderFormAction}>
                  <input type="hidden" name="chartId" value={topics.chartId} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="offerKey" value={selectedReading} />
                  <button type="submit" className="button button-primary btn btn-primary btn-lg">
                    {t("selection.topupPack", { vnd: activePack.vndFormatted[locale] })}
                  </button>
                </form>
              ) : (
                <Link href={chartHref} className="button button-primary btn btn-primary btn-lg">
                  {t("selection.topupPack", { vnd: activePack.vndFormatted[locale] })}
                </Link>
              )
            )}

            {activeTab === "hoi-vien" && (
              <button type="button" className="button button-disabled btn" disabled>
                {locale === "en" ? "Coming soon" : "Sắp ra mắt"}
              </button>
            )}
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var seg = document.getElementById("seg");
  if (!seg) return;
  var tabs = seg.querySelectorAll("[role=tab]");
  var sections = {
    "luan-giai": document.getElementById("luan-giai"),
    "hoi-vien": document.getElementById("hoi-vien"),
    "nap-la": document.getElementById("nap-la")
  };
  var paybarsSum = {
    "luan-giai": document.getElementById("paybar-sum-luan-giai"),
    "hoi-vien": document.getElementById("paybar-sum-hoi-vien"),
    "nap-la": document.getElementById("paybar-sum-nap-la")
  };
  var paybarsBtn = {
    "luan-giai": document.getElementById("paybar-btn-luan-giai"),
    "hoi-vien": document.getElementById("paybar-btn-hoi-vien"),
    "nap-la": document.getElementById("paybar-btn-nap-la")
  };

  tabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      tabs.forEach(function(t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
      var target = tab.getAttribute("data-target");
      for (var id in sections) {
        if (sections[id]) sections[id].hidden = id !== target;
      }
      for (var id in paybarsSum) {
        if (paybarsSum[id]) paybarsSum[id].hidden = id !== target;
      }
      for (var id in paybarsBtn) {
        if (paybarsBtn[id]) paybarsBtn[id].hidden = id !== target;
      }
    });
  });
})();
`,
        }}
      />
    </section>
  );
}
