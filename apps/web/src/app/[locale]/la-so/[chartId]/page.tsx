import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { SiteHeader } from "../../../../components/site-header";
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


function localizedChartPath(locale: "vi" | "en", chartId: string): string {
  return locale === "en" ? `/en/la-so/${chartId}` : `/la-so/${chartId}`;
}

function localizedSignInPath(locale: "vi" | "en", callbackURL: string): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callbackURL)}`;
}
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

  const currentChartPath = localizedChartPath(locale, chartId);
  const signInHref = localizedSignInPath(locale, currentChartPath);

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
    <>
      <SiteHeader currentPath={currentChartPath} locale={locale} />
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
            <p className="eyebrow">{locale === "en" ? "Go deeper into your chart" : "Đọc sâu hơn lá số của bạn"}</p>
            <h2 id="paid-report-cta-heading">
              {locale === "en" ? "From today's 3 highlights to all 12 palaces" : "Từ 3 điểm hôm nay, đến toàn bộ 12 cung"}
            </h2>
            <p className="result-paid-report-body">
              {locale === "en"
                ? "You just read three highlights from your Life Palace. Your chart still has the Body Palace, the Four Transformations, and other configurations left to open — see them all when you're ready to go deeper."
                : "Bạn vừa đọc 3 điểm nổi bật từ Cung Mệnh. Lá số của bạn còn Cung Thân, Tứ Hóa và các cấu hình khác chưa mở — xem đầy đủ khi bạn sẵn sàng đọc sâu hơn."}
            </p>
          </div>
          <div className="result-paid-report-actions">
            <Link className="button" href={topicHref}>{locale === "en" ? "Choose a reading" : "Chọn luận giải phù hợp"}</Link>
            <Link className="button button-secondary" href={locale === "en" ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi"}>
              {locale === "en" ? "View sample report" : "Xem bản luận giải mẫu"}
            </Link>
          </div>
        </section>
        {actor.kind === "anonymous" ? (
          <div className="result-privacy-note">
            <p>
              {locale === "en" ? (
                <>
                  Private chart · guest data is automatically deleted after 24 hours unless linked to a verified account.{" "}
                  <Link href={signInHref}>Sign in to keep it</Link>, or delete it now below.
                </>
              ) : (
                <>
                  Lá số riêng tư · dữ liệu khách tự xóa sau 24 giờ nếu chưa liên kết với tài khoản đã xác minh.{" "}
                  <Link href={signInHref}>Đăng nhập để lưu lại</Link>, hoặc xóa ngay bên dưới.
                </>
              )}
            </p>
          </div>
        ) : null}
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
    </>
  );
}
