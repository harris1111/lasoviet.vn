import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PaidTopicSelector } from "../../../../../features/reports/paid-topic-selector";
import { freeIdentityPreviewLoader } from "../../../../../features/reports/load-free-identity-preview";
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

  return (
    <main className="topic-page">
      <div className="container">
        <PaidTopicSelector
          birthSummary={chartResult.value.birthSummary}
          locale={locale}
          topics={topics.value}
        />
      </div>
    </main>
  );
}
