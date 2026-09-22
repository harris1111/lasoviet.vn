import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { SiteHeader } from "../../../../components/site-header";
import { AnonymousDataDeletionControl } from "../../../../features/privacy/anonymous-data-deletion-control";
import { deleteAnonymousDataAction } from "../../../../features/privacy/delete-anonymous-data-action";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { loadZiweiEvidence } from "../../../../features/ziwei/calculate-ziwei-chart-action";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";
import { ZiweiResultTabs } from "../../../../features/ziwei/ziwei-result-tabs";
import {
  parseResultTabState,
  buildCanonicalTabUrl,
} from "../../../../features/ziwei/ziwei-tabs-state";

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
  searchParams,
}: {
  params: Promise<{ chartId: string; locale: string }>;
  searchParams?: Promise<{ tab?: string | string[]; open?: string | string[] }>;
}) {
  const { chartId, locale: requestedLocale } = await params;
  const rawSearchParams = searchParams ? await searchParams : undefined;
  const locale = requestedLocale === "en" ? "en" : "vi";

  const [chartResult, previewResult, actor, t] = await Promise.all([
    loadZiweiChart.loadChart(chartId),
    freeIdentityPreviewLoader.loadPreview(chartId),
    resolveCurrentActor(),
    getTranslations("ziwei"),
  ]);
  if (!chartResult.ok || !previewResult.ok) notFound();

  // Canonicalize tab and open state via allowlist
  const tabState = parseResultTabState(rawSearchParams);
  const currentChartPath = localizedChartPath(locale, chartId);
  const canonicalChartUrl = buildCanonicalTabUrl(currentChartPath, tabState);
  const signInHref = localizedSignInPath(locale, canonicalChartUrl);

  const displayName = chartResult.value.birthSummary.displayName;
  const heroTitle = displayName
    ? t("personalizedTitle", { name: displayName })
    : t("title");
  const heroCopy = displayName
    ? t("personalizedHeroCopy", { name: displayName })
    : t("heroCopy");

  return (
    <>
      <SiteHeader
        currentPath={currentChartPath}
        locale={locale}
        signInReturnPath={canonicalChartUrl}
      />
      <main className="result-page">
        <section className="result-hero container">
          <p className="eyebrow">{t("private")}</p>
          <h1>{heroTitle}</h1>
          <p>{heroCopy}</p>
        </section>

        {/* 5-layer result tabs shell */}
        <ZiweiResultTabs
          basePath={currentChartPath}
          birthSummary={chartResult.value.birthSummary}
          chart={chartResult.value.chart}
          chartId={chartId}
          displayName={displayName}
          initialState={tabState}
          locale={locale}
          loadEvidence={loadZiweiEvidence}
          preview={previewResult.value}
        />

        <div className="container result-page-footer-container">
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
