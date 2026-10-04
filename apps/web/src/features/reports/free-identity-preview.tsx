"use client";

import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { PartFeedback } from "./part-feedback";
import { EvidenceDrawer } from "../evidence/evidence-drawer";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";
import { buildFreeInsights } from "../ziwei/ziwei-free-insights";
import { SecureLockedPreview } from "../ziwei/secure-locked-preview";

export type FreeIdentityPreviewProps = {
  chart?: NormalizedZiweiChartV1;
  chartId: string;
  displayName?: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
  paidUpgradeEligible?: boolean;
  signInHref?: string;
  isGuest?: boolean;
};

export function FreeIdentityPreview({
  chart,
  chartId,
  displayName,
  locale,
  loadEvidence,
  preview,
  paidUpgradeEligible = true,
  signInHref,
  isGuest,
}: FreeIdentityPreviewProps) {
  const t = useTranslations("reports");
  const presentation = ziweiPresentation(locale);

  // Pure deterministic presenter fallback derived from chart facts if server details are absent
  const richInsights = !preview.insightDetails && chart ? buildFreeInsights(chart, locale, displayName) : undefined;

  const magnetTitle = preview.magnetOffer?.title ?? (locale === "vi" ? "Lá số Tử Vi của bạn, và 2 điều lá số nói riêng về bạn" : "Your Zi Wei Chart, and 2 Key Insights Personal to You");
  const magnetSubtitle = preview.magnetOffer?.subtitle ?? (locale === "vi" ? "Lập từ dữ liệu sinh chuẩn xác trong 60 giây. Khám phá 2 điều nổi bật nhất về bản mệnh của bạn trước khi đi sâu vào 12 cung." : "Constructed from exact birth data in 60 seconds. Discover the 2 primary highlights about your chart before exploring all 12 palaces.");

  const isGuestActor = Boolean(isGuest ?? preview.audience === "guest");

  return (
    <section aria-labelledby="identity-preview-title" className="identity-preview">
      <div className="identity-preview-head">
        <p className="eyebrow">{t("preview.eyebrow")}</p>
        <h2 id="identity-preview-title">{magnetTitle}</h2>
        <p className="identity-preview-subtitle">
          {magnetSubtitle}
        </p>
      </div>

      <div className="identity-insights">
        {preview.insightDetails && preview.insightDetails.length > 0 ? (
          preview.insightDetails.map((item) => {
            if (item.isLocked) {
              return (
                <article className="identity-insight-card is-locked" key={item.id}>
                  <SecureLockedPreview
                    actionHref={signInHref}
                    actionLabel={locale === "vi" ? "Lưu lá số để đọc điều thứ hai" : "Save chart to reveal insight 2"}
                    badge={locale === "vi" ? "Chưa mở" : "Locked"}
                    clippedSentences={item.lockedPreview?.clippedSentences}
                    counts={item.lockedPreview?.counts}
                    isGuest={true}
                    lengthHint={item.lockedPreview?.lengthHint ?? 4}
                    locale={locale}
                    signInHref={signInHref}
                    tagline={item.tagline}
                    title={item.title}
                  />
                </article>
              );
            }

            return (
              <article className="identity-insight-card" key={item.id}>
                <div className="insight-card-top">
                  <span className="insight-numeral">{item.numeral}</span>
                  <span className="insight-tagline">{item.tagline}</span>
                </div>
                <h3 className="insight-card-title">{item.title}</h3>
                <p className="insight-card-prose">{item.description}</p>
                <div className="insight-card-footer">
                  <EvidenceDrawer
                    chart={chart}
                    chartId={chartId}
                    evidenceId={item.evidenceId}
                    locale={locale}
                    loadEvidence={loadEvidence}
                  />
                </div>
              </article>
            );
          })
        ) : richInsights ? (
          richInsights.items.map((item) => (
            <article className="identity-insight-card" key={item.id}>
              <div className="insight-card-top">
                <span className="insight-numeral">{item.numeral}</span>
                <span className="insight-tagline">{item.tagline}</span>
              </div>
              <h3 className="insight-card-title">{item.title}</h3>
              <p className="insight-card-prose">{item.description}</p>
              <PartFeedback locale={locale} chartId={chartId} partId={item.id} />
              <div className="insight-card-footer">
                <EvidenceDrawer
                  chart={chart}
                  chartId={chartId}
                  evidenceId={item.evidenceId}
                  locale={locale}
                  loadEvidence={loadEvidence}
                />
              </div>
            </article>
          ))
        ) : (
          preview.insights.map((insight, index) => (
            <article className="identity-insight-card" key={insight.id}>
              <div className="insight-card-top">
                <span className="insight-numeral">0{index + 1}</span>
              </div>
              <h3 className="insight-card-title">{presentation.insight(insight.id)}</h3>
              <PartFeedback locale={locale} chartId={chartId} partId={insight.id} />
              <div className="insight-card-footer">
                <EvidenceDrawer
                  chart={chart}
                  chartId={chartId}
                  evidenceId={insight.evidence.evidenceId}
                  locale={locale}
                  loadEvidence={loadEvidence}
                />
              </div>
            </article>
          ))
        )}
      </div>

      {/* Bản Mệnh Opening Card: opening text for verified signed-in; locked placeholder for guest */}
      {preview.banMenhPreview ? (
        <div className="identity-ban-menh-preview-wrap">
          <SecureLockedPreview
            actionHref={isGuestActor ? signInHref : (locale === "en" ? `/en/la-so/${chartId}/chon-luan-giai` : `/la-so/${chartId}/chon-luan-giai`)}
            actionLabel={isGuestActor ? (locale === "vi" ? "Đăng nhập để đọc Bản mệnh" : "Sign in to read Destiny") : (locale === "vi" ? "Mở – 240 Lá" : "Unlock – 240 Lá")}
            badge={locale === "vi" ? "Xem trước Bản mệnh" : "Destiny Preview"}
            clippedSentences={!isGuestActor && preview.banMenhPreview.opening ? [preview.banMenhPreview.opening] : [locale === "vi" ? "Bản mệnh tại Cung Mệnh phản ánh trục cốt lõi của tính cách và thiên hướng phát triển tự nhiên…" : "Your core destiny anchors the life axis, reflecting fundamental nature and natural growth…"]}
            counts={preview.banMenhPreview.counts}
            isGuest={isGuestActor}
            lengthHint={preview.banMenhPreview.lengthHint}
            locale={locale}
            priceLa={isGuestActor ? undefined : preview.banMenhPreview.priceLa}
            signInHref={signInHref}
            tagline={locale === "vi" ? "Trục Cung Mệnh" : "Life Palace Axis"}
            title={preview.banMenhPreview.title}
          />
          {!isGuestActor && preview.banMenhPreview.opening && <PartFeedback locale={locale} chartId={chartId} partId="banMenhPreview.opening" />}
        </div>
      ) : null}

      {richInsights ? (
        <div className="identity-signals-grid">
          <article className="signal-card signal-strength">
            <div className="signal-head">
              <span className="signal-badge badge-strength">{t("preview.strength")}</span>
              <h3>{richInsights.overallStrength.title}</h3>
            </div>
            <p className="signal-prose">{richInsights.overallStrength.description}</p>
            <PartFeedback locale={locale} chartId={chartId} partId="overallStrength" />
            <EvidenceDrawer
              chart={chart}
              chartId={chartId}
              evidenceId={richInsights.overallStrength.evidenceId}
              locale={locale}
              loadEvidence={loadEvidence}
            />
          </article>

          <article className="signal-card signal-tension">
            <div className="signal-head">
              <span className="signal-badge badge-tension">{t("preview.tension")}</span>
              <h3>{richInsights.areaWorthObserving.title}</h3>
            </div>
            <p className="signal-prose">{richInsights.areaWorthObserving.description}</p>
            <PartFeedback locale={locale} chartId={chartId} partId="areaWorthObserving" />
            <EvidenceDrawer
              chart={chart}
              chartId={chartId}
              evidenceId={richInsights.areaWorthObserving.evidenceId}
              locale={locale}
              loadEvidence={loadEvidence}
            />
          </article>
        </div>
      ) : null}

      {paidUpgradeEligible ? (
        <div className="identity-coverage-box">
          <p className="identity-coverage">
            {t("preview.coverage", {
              offer: presentation.offer(preview.paidPreview.sku),
              percent: preview.paidPreview.coveragePercent,
            })}
          </p>
        </div>
      ) : null}
    </section>
  );
}
