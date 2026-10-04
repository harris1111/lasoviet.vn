import type { ReactNode } from "react";
import type { WalletTopUpContinuationRequestV1 } from "@lasoviet/contracts";
import type {
  OrderHistoryItemV1,
  PaidTopicSelectionViewV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";
import { customerContactConfig } from "@lasoviet/config/customer-contact";

import type { WalletUnlockDialogSku } from "../commerce/wallet-unlock-dialog";
import type { PublicOfferKey } from "../commerce/checkout-offer";
import { resolveActiveSkuFromPublicOfferKey } from "../commerce/checkout-offer";
import type { RenderedOfferDescriptor } from "./offer-view-tracker";
import type { ZiweiPresentationLocale } from "../ziwei/ziwei-presentation";
import {
  buildSafeOfferPresentations,
  type OfferOwnershipState,
} from "./purchase-offer-presentation";
import {
  PaidTopicSelectorClient,
  type SelectorOffer,
  type SelectorPackId,
  type SelectorTab,
} from "./paid-topic-selector-client";

export { formatUpgradeDeadline } from "./format-upgrade-deadline";

export type PaidTopicSelectorProps = {
  readingContent?: ReactNode;
  locale: ZiweiPresentationLocale;
  topics?: PaidTopicSelectionViewV1;
  birthSummary?: ZiweiBirthSummaryV1;
  ownershipByOfferKey?: Partial<Record<PublicOfferKey, OfferOwnershipState>>;
  orderHistory?: OrderHistoryItemV1[];
  now?: Date;
  supportEmail?: string;
  initialTab?: SelectorTab;
  initialPackId?: SelectorPackId;
  initialOfferKey?: PublicOfferKey;
  userBalance?: number;
  topUpContinuation?: WalletTopUpContinuationRequestV1;
  topUpReturnPath?: string;
};

const DEFAULT_OFFERS: PaidTopicSelectionViewV1["offers"] = [
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

/**
 * Server half of the reading-selection and top-up page. It resolves everything that
 * needs server-only modules (offer presentation, SKU mapping) and hands plain data to
 * the client half, which owns tab, card and pack selection so the page stays
 * interactive after soft navigation.
 */
export function PaidTopicSelector({
  readingContent,
  locale,
  topics,
  birthSummary,
  ownershipByOfferKey,
  orderHistory,
  now,
  supportEmail = customerContactConfig.email.value,
  initialTab,
  initialPackId,
  initialOfferKey,
  userBalance = 0,
  topUpContinuation,
  topUpReturnPath,
}: PaidTopicSelectorProps) {
  const safeOffers = buildSafeOfferPresentations({
    offers: topics?.offers ?? DEFAULT_OFFERS,
    ownershipByOfferKey,
    locale,
    orders: orderHistory,
    chartId: topics?.chartId,
    now,
  });

  const offers: SelectorOffer[] = safeOffers.map((offer) => ({
    ...offer,
    sku: (resolveActiveSkuFromPublicOfferKey(offer.offerKey) as WalletUnlockDialogSku | null) ?? null,
  }));

  const offerDescriptors: RenderedOfferDescriptor[] = [];
  for (const offer of offers) {
    if (!offer.sku) continue;
    offerDescriptors.push({
      offerId: offer.offerKey,
      sku: offer.sku,
      upgradeCredit: offer.upgradeCredit
        ? {
            sourceSku: "ZIWEI-NATAL-EXCERPT-P0",
            targetSku: offer.sku,
            creditExpiresAt: offer.upgradeCredit.creditExpiresAt,
          }
        : null,
    });
  }

  const prefix = locale === "en" ? "/en" : "";
  const chartHref = topics?.chartId
    ? `${prefix}/la-so/${encodeURIComponent(topics.chartId)}`
    : `${prefix}/tao-la-so/tu-vi`;

  return (
    <PaidTopicSelectorClient
      readingContent={readingContent}
      locale={locale}
      offers={offers}
      offerDescriptors={offerDescriptors}
      chartId={topics?.chartId}
      chartVersionId={topics?.chartVersionId}
      chartHref={chartHref}
      sampleHref={`${prefix}/bao-cao-mau/tu-vi`}
      displayName={birthSummary?.displayName}
      birthDate={birthSummary?.normalizedCalendar?.date}
      balance={userBalance}
      supportEmail={supportEmail}
      initialTab={initialTab ?? (topics ? "luan-giai" : "nap-la")}
      initialPackId={initialPackId}
      initialOfferKey={initialOfferKey}
      topUpContinuation={topUpContinuation}
      topUpReturnPath={topUpReturnPath}
    />
  );
}
