import { loadTopUpCompletion, TopUpCompletionNotice } from "../../../../features/commerce/topup-completion";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { PrivateApiClientError } from "../../../../api/private-api-client";
import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { SiteHeader } from "../../../../components/site-header";
import { AnonymousDataDeletionControl } from "../../../../features/privacy/anonymous-data-deletion-control";
import { deleteAnonymousDataAction } from "../../../../features/privacy/delete-anonymous-data-action";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { freePalaceGiftLoader } from "../../../../features/ziwei/load-free-palace-gift";
import { recordFreePalaceEngagement } from "../../../../features/ziwei/record-free-palace-engagement-action";
import { loadZiweiEvidence } from "../../../../features/ziwei/calculate-ziwei-chart-action";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";
import { ZiweiFreeResult } from "../../../../features/ziwei/ziwei-free-result";
import { buildFreeResultModel } from "../../../../features/ziwei/ziwei-free-result-model";
import { resolveFreeResultSource } from "../../../../features/ziwei/free-result-source-resolver";
import { Guest24hDeletionBanner } from "../../../../features/ziwei/guest-24h-deletion-banner";
import {
  parseResultTabState,
  buildCanonicalTabUrl,
  hasNonCanonicalQueryParams,
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { chartId, locale: requestedLocale } = await params;
  const rawSearchParams = searchParams ? await searchParams : undefined;
  const locale = requestedLocale === "en" ? "en" : "vi";

  // 1. Authorize actor and load chart/preview FIRST to preserve private route 404/auth boundary
  const [chartResult, previewResult, horoscopeResult, actor, t] = await Promise.all([
    loadZiweiChart.loadChart(chartId),
    freeIdentityPreviewLoader.loadPreview(chartId).catch((error: unknown) => {
      if (error instanceof PrivateApiClientError && error.code === "PRIVATE_API_RESPONSE_INVALID") {
        return { ok: false as const, error: { code: "INSUFFICIENT_EVIDENCE" as const } };
      }
      throw error;
    }),
    loadZiweiChart.loadHoroscope(chartId).catch(() => ({ ok: false as const })),
    resolveCurrentActor(),
    getTranslations("ziwei"),
  ]);
  if (!chartResult.ok || (!previewResult.ok && previewResult.error.code !== "INSUFFICIENT_EVIDENCE")) notFound();

  // 2. Canonicalize query params ONLY AFTER authorized chart loaders pass
  const { topupOrder, ...tabSearchParams } = rawSearchParams ?? {};
  const tabState = parseResultTabState(tabSearchParams, "free-result");
  const currentChartPath = localizedChartPath(locale, chartId);
  const completion = await loadTopUpCompletion(actor, topupOrder, currentChartPath);
  const canonicalTabUrl = buildCanonicalTabUrl(currentChartPath, tabState);
  const canonicalChartUrl = completion && typeof topupOrder === "string" ? `${canonicalTabUrl}${canonicalTabUrl.includes("?") ? "&" : "?"}topupOrder=${encodeURIComponent(topupOrder)}` : canonicalTabUrl;

  // If incoming query parameters differ from canonical URL, safely redirect to canonical URL
  if (hasNonCanonicalQueryParams(tabSearchParams, tabState) || (topupOrder !== undefined && !completion)) {
    redirect(canonicalChartUrl);
  }

  // 3. Resolve only structural metadata for this authorized chart/version.
  const safePreview = resolveFreeResultSource({
    chartId, chartVersionId: chartResult.value.chartVersionId,
    preview: previewResult.ok ? previewResult.value : null,
  });

  // 3b. Server-side, read-only gift lookup. Never throws; anything but a validated ready artifact
  // for this exact chart version and locale is null and leaves the structural fallback in place.
  const gift = await freePalaceGiftLoader.load({ chartId, chartVersionId: chartResult.value.chartVersionId, locale });

  const signInHref = localizedSignInPath(locale, canonicalChartUrl);
  const isGuest = actor.kind !== "account" || actor.emailVerified !== true;

  const displayName = chartResult.value.birthSummary.displayName;
  const freeResultModel = buildFreeResultModel({
    chart: chartResult.value.chart,
    preview: safePreview,
    horoscope: horoscopeResult.ok ? horoscopeResult.value : undefined,
    isGuest, locale, displayName, gift, overview: chartResult.value.freeOverview?.[locale],
  });
  const heroTitle = displayName
    ? t("personalizedTitle", { name: displayName })
    : t("title");
  const heroCopy = displayName
    ? t("personalizedHeroCopy", { name: displayName })
    : t("heroCopy");

  return (
    <>
      <SiteHeader
        variant="result"
        currentPath={currentChartPath}
        locale={locale}
        signInReturnPath={canonicalChartUrl}
      />
      <main className="result-page" data-light-ready>
        <section className="result-hero container">
          <p className="eyebrow">{t("private")}</p>
          <h1>{heroTitle}</h1>
          <p className="result-hero-copy">{heroCopy}</p>
        </section>

        {completion && <TopUpCompletionNotice continuation={completion} locale={locale} chartId={chartId} />}
        <ZiweiFreeResult
          basePath={currentChartPath}
          chart={chartResult.value.chart}
          birthSummary={chartResult.value.birthSummary}
          chartId={chartId}
          chartVersionId={chartResult.value.chartVersionId}
          initialState={tabState}
          locale={locale}
          loadEvidence={loadZiweiEvidence}
          model={freeResultModel}
          recordEngagement={recordFreePalaceEngagement.bind(null, chartId, locale)}
          signInHref={signInHref}
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
