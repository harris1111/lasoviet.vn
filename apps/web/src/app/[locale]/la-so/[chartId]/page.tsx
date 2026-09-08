import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { AnonymousDataDeletionControl } from "../../../../features/privacy/anonymous-data-deletion-control";
import { deleteAnonymousDataAction } from "../../../../features/privacy/delete-anonymous-data-action";
import { FreeIdentityPreview } from "../../../../features/reports/free-identity-preview";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { loadZiweiEvidence } from "../../../../features/ziwei/calculate-ziwei-chart-action";
import { ZiweiChart } from "../../../../features/ziwei/ziwei-chart";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";
import { ZiweiResultSummary } from "../../../../features/ziwei/ziwei-result-summary";

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

  const displayName = chartResult.value.birthSummary.displayName;
  const heroTitle = displayName
    ? t("personalizedTitle", { name: displayName })
    : t("title");
  const heroCopy = displayName
    ? t("personalizedHeroCopy", { name: displayName })
    : t("heroCopy");

  return (
    <main className="result-page">
      <section className="result-hero container">
        <p className="eyebrow">{t("private")}</p>
        <h1>{heroTitle}</h1>
        <p>{heroCopy}</p>
      </section>
      <div className="container">
        <ZiweiResultSummary
          birthSummary={chartResult.value.birthSummary}
          chart={chartResult.value.chart}
          locale={locale}
        />
      </div>
      <div className="result-layout container">
        <ZiweiChart
          birthSummary={chartResult.value.birthSummary}
          chart={chartResult.value.chart}
          locale={locale}
        />
      </div>
      <div className="container">
        <FreeIdentityPreview
          chart={chartResult.value.chart}
          chartId={chartId}
          displayName={displayName}
          locale={locale}
          loadEvidence={loadZiweiEvidence}
          preview={previewResult.value}
        />
        <section aria-labelledby="paid-report-cta-heading" className="result-paid-report-cta">
          <div className="result-paid-report-head">
            <p className="eyebrow">{locale === "en" ? "Full Lifetime Report" : "Luận giải chuyên sâu trọn đời"}</p>
            <h2 id="paid-report-cta-heading">
              {locale === "en" ? "Life Potential & Destiny Report" : "Báo cáo luận giải Bản mệnh & Tiềm năng"}
            </h2>
            <div className="result-paid-report-pricing">
              <span className="topic-price">{locale === "en" ? "79,000 VND" : "79.000 ₫"}</span>
              <span className="topic-once">{locale === "en" ? "One-time payment · No auto-renewal" : "Thanh toán một lần · Không tự động gia hạn"}</span>
            </div>
          </div>
          <div className="result-paid-report-actions">
            <Link className="button" href={topicHref}>{t("topicLink")}</Link>
            <Link className="button button-secondary" href={locale === "en" ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi"}>
              {locale === "en" ? "View sample report" : "Xem bản luận giải mẫu"}
            </Link>
          </div>
        </section>
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
