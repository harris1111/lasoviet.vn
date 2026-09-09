import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { CurrentActor, OrderHistoryItemV1 } from "@lasoviet/contracts";
import {
  resolveVerifiedAccountActor,
  VerifiedAccountResolutionError,
} from "../../../../../auth/resolve-current-actor";
import { accountDataLoader } from "../../../../../features/account/account-data-loader";
import type { PublicOfferKey } from "../../../../../features/commerce/checkout-offer";
import { freeIdentityPreviewLoader } from "../../../../../features/reports/load-free-identity-preview";
import { PaidTopicSelector } from "../../../../../features/reports/paid-topic-selector";
import {
  deriveOfferOwnership,
  type OfferOwnershipState,
} from "../../../../../features/reports/purchase-offer-presentation";
import { loadZiweiChart } from "../../../../../features/ziwei/load-ziwei-chart";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PaidTopicSelectionPage({
  params,
}: {
  params: Promise<{ chartId: string; locale: string }>;
}) {
  const { chartId, locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "vi";
  const [topics, chartResult] = await Promise.all([
    freeIdentityPreviewLoader.loadTopics(chartId),
    loadZiweiChart.loadChart(chartId),
  ]);
  if (!topics.ok || !chartResult.ok) notFound();

  let actor: Extract<CurrentActor, { kind: "account" }> | null = null;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      actor = null;
    } else {
      throw error;
    }
  }

  let ownershipByOfferKey: Partial<Record<PublicOfferKey, OfferOwnershipState>> = {};
  let orderHistory: OrderHistoryItemV1[] = [];
  if (actor !== null) {
    const [libraryResult, ordersResult] = await Promise.all([
      accountDataLoader.loadLibrary(actor),
      accountDataLoader.loadOrders(actor),
    ]);
    if (!libraryResult.ok || !ordersResult.ok) {
      ownershipByOfferKey = {
        "ziwei-comprehensive": { kind: "unavailable" },
        "ziwei-natal-excerpt": { kind: "unavailable" },
      };
    } else {
      orderHistory = ordersResult.value.orders;
      ownershipByOfferKey = {
        "ziwei-comprehensive": deriveOfferOwnership({
          chartId,
          offerKey: "ziwei-comprehensive",
          library: libraryResult.value,
          locale,
        }),
        "ziwei-natal-excerpt": deriveOfferOwnership({
          chartId,
          offerKey: "ziwei-natal-excerpt",
          library: libraryResult.value,
          locale,
        }),
      };
    }
  }

  return (
    <main className="topic-page">
      <div className="container">
        <PaidTopicSelector
          birthSummary={chartResult.value.birthSummary}
          locale={locale}
          ownershipByOfferKey={ownershipByOfferKey}
          orderHistory={orderHistory}
          topics={topics.value}
        />
      </div>
    </main>
  );
}
