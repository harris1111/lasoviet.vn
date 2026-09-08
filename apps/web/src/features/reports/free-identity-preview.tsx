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

type FreeIdentityPreviewProps = {
  chart?: NormalizedZiweiChartV1;
  chartId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
};

function getInsightSummary(
  insightId: string,
  chart: NormalizedZiweiChartV1 | undefined,
  presentation: ReturnType<typeof ziweiPresentation>,
): string {
  if (!chart) return "";
  if (insightId === "life-palace") {
    const lifePalace = chart.palaces.find((p) => p.id === chart.soulPalaceId);
    if (!lifePalace) return "";
    const stars =
      lifePalace.stars.length > 0
        ? lifePalace.stars
            .map(
              (s) =>
                `${presentation.star(s.id)} (${presentation.brightness(s.brightness)})`,
            )
            .join(", ")
        : presentation.chrome.noStars;
    return `${presentation.branch(lifePalace.earthlyBranchId)} · ${stars}`;
  }
  if (insightId === "body-palace") {
    const bodyPalace = chart.palaces.find((p) => p.id === chart.bodyPalaceId);
    if (!bodyPalace) return "";
    return `${presentation.palace(chart.bodyPalaceId)} · ${presentation.branch(bodyPalace.earthlyBranchId)}`;
  }
  if (insightId === "transformations") {
    return chart.transformations
      .map(
        (t) =>
          `${presentation.star(t.starId)} · ${presentation.transformation(t.id)}`,
      )
      .join(", ");
  }
  return "";
}

export function FreeIdentityPreview({
  chart,
  chartId,
  locale,
  loadEvidence,
  preview,
}: FreeIdentityPreviewProps) {
  const t = useTranslations("reports");
  const presentation = ziweiPresentation(locale);

  return (
    <section aria-labelledby="identity-preview-title" className="identity-preview">
      <p className="eyebrow">{t("preview.eyebrow")}</p>
      <h2 id="identity-preview-title">{t("preview.title")}</h2>
      <div className="identity-insights">
        {preview.insights.map((insight, index) => {
          const summary = getInsightSummary(insight.id, chart, presentation);

          return (
            <article className="identity-insight" key={insight.id}>
              <span>0{index + 1}</span>
              <h3>{presentation.insight(insight.id)}</h3>
              {summary ? <p className="insight-deterministic-summary">{summary}</p> : null}
              <EvidenceDrawer chartId={chartId} evidenceId={insight.evidence.evidenceId} locale={locale} loadEvidence={loadEvidence} />
            </article>
          );
        })}
      </div>
      <div className="identity-signals">
        <article>
          <p className="eyebrow">{t("preview.strength")}</p>
          <h3>{presentation.insight(preview.strengthSignal.id)}</h3>
          <EvidenceDrawer chartId={chartId} evidenceId={preview.strengthSignal.evidence.evidenceId} locale={locale} loadEvidence={loadEvidence} />
        </article>
        <article>
          <p className="eyebrow">{t("preview.tension")}</p>
          <h3>{presentation.insight(preview.tensionSignal.id)}</h3>
          <EvidenceDrawer chartId={chartId} evidenceId={preview.tensionSignal.evidence[0]!.evidenceId} locale={locale} loadEvidence={loadEvidence} />
        </article>
      </div>
      <p className="identity-coverage">
        {t("preview.coverage", {
          offer: presentation.offer(preview.paidPreview.sku),
          percent: preview.paidPreview.coveragePercent,
        })}
      </p>
    </section>
  );
}
