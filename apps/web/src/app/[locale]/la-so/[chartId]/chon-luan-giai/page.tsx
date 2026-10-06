import { loadWalletQuotes } from "../../../../../features/commerce/load-wallet-quotes";
import { resolveLadderSelection } from "../../../../../features/commerce/offer-selection";
import { OfferLadder } from "../../../../../features/reports/offer-ladder";
import { computeNormalizedPalaceScores } from "../../../../../features/reports/report-palace-score";
import { customerContactConfig } from "@lasoviet/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WalletTopUpPackIdSchema, type CurrentActor, type OrderHistoryItemV1 } from "@lasoviet/contracts";
import {
  resolveVerifiedAccountActor,
  VerifiedAccountResolutionError,
} from "../../../../../auth/resolve-current-actor";
import { accountDataLoader } from "../../../../../features/account/account-data-loader";
import { isPublicOfferKey, type PublicOfferKey } from "../../../../../features/commerce/checkout-offer";
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
  searchParams,
}: {
  params: Promise<{ chartId: string; locale: string }>;
  searchParams?: Promise<{ tab?: string; pack?: string; offer?: string | string[]; palace?: string | string[]; resume?: string | string[] }>;
}) {
  const { chartId, locale: requestedLocale } = await params;
  const query = await searchParams;
  const initialTab =
    query?.tab === "hoi-vien" || query?.tab === "nap-la" ? query.tab : "luan-giai";
  const parsedPack = WalletTopUpPackIdSchema.safeParse(query?.pack);
  const initialOfferKey = isPublicOfferKey(query?.offer) ? query.offer : undefined;
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

  const initialQuotes = actor ? await loadWalletQuotes(actor, { chartId, chartVersionId: chartResult.value.chartVersionId, locale }) : null;
  const scores = Object.fromEntries([...computeNormalizedPalaceScores(chartResult.value.chart)].map(([id, value]) => [id, value.score]));
  let ownershipByOfferKey: Partial<Record<PublicOfferKey, OfferOwnershipState>> = {};
  let orderHistory: OrderHistoryItemV1[] = [];
  let userBalance = 0;
  if (actor !== null) {
    const [libraryResult, ordersResult, balanceResult] = await Promise.all([
      accountDataLoader.loadLibrary(actor),
      accountDataLoader.loadOrders(actor),
      accountDataLoader.loadWalletBalance(actor),
    ]);
    if (balanceResult.ok) {
      userBalance = balanceResult.value.totalLa;
    }
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
    <main className="topic-page" data-light-ready>
      <div className="container">
        <PaidTopicSelector
          readingContent={<OfferLadder chartId={chartId} chartVersionId={chartResult.value.chartVersionId} locale={locale}
            initialSku={resolveLadderSelection(query?.offer, query?.palace)} initialResume={query?.resume === "1"} balance={userBalance} scores={scores}
            initialQuotes={!actor ? { status: "guest" } : initialQuotes ? { status: "ready", value: initialQuotes } : { status: "error" }} />}
          birthSummary={chartResult.value.birthSummary}
          locale={locale}
          ownershipByOfferKey={ownershipByOfferKey}
          orderHistory={orderHistory}
          topics={topics.value}
          initialTab={initialTab}
          initialPackId={parsedPack.success ? parsedPack.data : undefined}
          initialOfferKey={initialOfferKey}
          supportEmail={customerContactConfig.email.value}
          userBalance={userBalance}
        />
      </div>
    </main>
  );
}
