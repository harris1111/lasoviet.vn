"use client";

import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { EvidenceDrawer } from "../evidence/evidence-drawer";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";
import { buildFreeInsights } from "../ziwei/ziwei-free-insights";

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
};

export function FreeIdentityPreview({
  chart,
  chartId,
  displayName,
  locale,
  loadEvidence,
  preview,
  paidUpgradeEligible = true,
}: FreeIdentityPreviewProps) {
  const t = useTranslations("reports");
  const presentation = ziweiPresentation(locale);

  // Pure deterministic presenter derived from chart facts
  const richInsights = chart ? buildFreeInsights(chart, locale, displayName) : undefined;

  return (
    <section aria-labelledby="identity-preview-title" className="identity-preview">
      <div className="identity-preview-head">
        <p className="eyebrow">{t("preview.eyebrow")}</p>
        <h2 id="identity-preview-title">{t("preview.title")}</h2>
        <p className="identity-preview-subtitle">
          {locale === "vi"
            ? "Tóm lược ba bình diện nổi bật nhất trên lá số giúp bạn nhận diện xu hướng hành động, nắm bắt cơ hội và tự quan sát điểm cần tiết chế."
            : "A concise overview of three primary chart dimensions to recognize action patterns, leverage opportunities, and observe key tensions."}
        </p>
      </div>

      <div className="identity-insights">
        {richInsights ? (
          richInsights.items.map((item) => (
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
          ))
        ) : (
          preview.insights.map((insight, index) => (
            <article className="identity-insight-card" key={insight.id}>
              <div className="insight-card-top">
                <span className="insight-numeral">0{index + 1}</span>
              </div>
              <h3 className="insight-card-title">{presentation.insight(insight.id)}</h3>
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

      {richInsights ? (
        <div className="identity-signals-grid">
          <article className="signal-card signal-strength">
            <div className="signal-head">
              <span className="signal-badge badge-strength">{t("preview.strength")}</span>
              <h3>{richInsights.overallStrength.title}</h3>
            </div>
            <p className="signal-prose">{richInsights.overallStrength.description}</p>
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
