"use client";

import type { FreeIdentityPreviewV1, ZiweiEvidenceViewV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { EvidenceDrawer } from "../evidence/evidence-drawer";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";

type FreeIdentityPreviewProps = {
  chartId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
};

export function FreeIdentityPreview({
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
        {preview.insights.map((insight, index) => (
          <article className="identity-insight" key={insight.id}>
            <span>0{index + 1}</span>
            <h3>{presentation.insight(insight.id)}</h3>
            <p>{insight.evidence.interpretationBounds.at(0)}</p>
            <EvidenceDrawer chartId={chartId} evidenceId={insight.evidence.evidenceId} locale={locale} loadEvidence={loadEvidence} />
          </article>
        ))}
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
