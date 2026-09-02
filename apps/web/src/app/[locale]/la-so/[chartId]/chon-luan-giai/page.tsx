import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PaidTopicSelector } from "../../../../../features/reports/paid-topic-selector";
import { freeIdentityPreviewLoader } from "../../../../../features/reports/load-free-identity-preview";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PaidTopicSelectionPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const { chartId } = await params;
  const topics = await freeIdentityPreviewLoader.loadTopics(chartId);
  if (!topics.ok) notFound();

  return <main className="topic-page"><div className="container"><PaidTopicSelector topics={topics.value} /></div></main>;
}
