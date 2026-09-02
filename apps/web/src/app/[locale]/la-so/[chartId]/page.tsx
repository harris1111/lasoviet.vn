import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { EvidenceDrawer } from "../../../../features/evidence/evidence-drawer";
import { AnonymousDataDeletionControl } from "../../../../features/privacy/anonymous-data-deletion-control";
import { deleteAnonymousDataAction } from "../../../../features/privacy/delete-anonymous-data-action";
import { FreeIdentityPreview } from "../../../../features/reports/free-identity-preview";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { loadZiweiEvidence } from "../../../../features/ziwei/calculate-ziwei-chart-action";
import { ZiweiChart } from "../../../../features/ziwei/ziwei-chart";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ZiweiChartResultPage({
  params,
}: {
  params: Promise<{ chartId: string; locale: string }>;
}) {
  const { chartId, locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "vi";
  const [chartResult, previewResult, actor, t] = await Promise.all([
    loadZiweiChart.loadChart(chartId),
    freeIdentityPreviewLoader.loadPreview(chartId),
    resolveCurrentActor(),
    getTranslations("ziwei"),
  ]);
  if (!chartResult.ok || !previewResult.ok) notFound();

  const topicHref = locale === "en"
    ? `/en/la-so/${chartId}/chon-luan-giai`
    : `/la-so/${chartId}/chon-luan-giai`;

  return (
    <main className="result-page">
      <section className="result-hero container">
        <p className="eyebrow">{t("private")}</p>
        <h1>{t("title")}</h1>
        <p>{t("heroCopy")}</p>
      </section>
      <div className="result-layout container">
        <ZiweiChart chart={chartResult.value.chart} locale={locale} />
        <aside className="result-evidence-note">
          <p className="eyebrow">{t("evidence.eyebrow")}</p>
          <h2>{t("evidence.heading")}</h2>
          <EvidenceDrawer chartId={chartId} evidenceId={chartResult.value.evidenceIndex.itemIds[0]!} locale={locale} loadEvidence={loadZiweiEvidence} />
        </aside>
      </div>
      <div className="container">
        <FreeIdentityPreview chartId={chartId} locale={locale} loadEvidence={loadZiweiEvidence} preview={previewResult.value} />
        <Link className="button" href={topicHref}>{t("topicLink")}</Link>
        {actor.kind === "anonymous" ? (
          <AnonymousDataDeletionControl
            action={deleteAnonymousDataAction.bind(null, locale)}
            labels={{
              title: t("deletion.title"),
              description: t("deletion.description"),
              begin: t("deletion.begin"),
              confirmation: t("deletion.confirmation"),
              cancel: t("deletion.cancel"),
              confirm: t("deletion.confirm"),
              pending: t("deletion.pending"),
              error: t("deletion.error"),
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
