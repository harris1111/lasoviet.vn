"use client";

import type { FreeIdentityPreviewV1, ZiweiEvidenceViewV1 } from "@lasoviet/contracts";

import { EvidenceDrawer } from "../evidence/evidence-drawer";

type FreeIdentityPreviewProps = {
  chartId: string;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
};

function insightLabel(id: string) {
  return id.replaceAll("-", " ");
}

export function FreeIdentityPreview({ chartId, loadEvidence, preview }: FreeIdentityPreviewProps) {
  return (
    <section aria-labelledby="identity-preview-title" className="identity-preview">
      <p className="eyebrow">Xem trước miễn phí</p>
      <h2 id="identity-preview-title">Ba điểm để tự quan sát</h2>
      <div className="identity-insights">
        {preview.insights.map((insight, index) => (
          <article className="identity-insight" key={insight.id}>
            <span>0{index + 1}</span>
            <h3>{insightLabel(insight.id)}</h3>
            <p>{insight.evidence.interpretationBounds.at(0)}</p>
            <EvidenceDrawer chartId={chartId} evidenceId={insight.evidence.evidenceId} loadEvidence={loadEvidence} />
          </article>
        ))}
      </div>
      <div className="identity-signals">
        <article>
          <p className="eyebrow">Điểm mạnh</p>
          <h3>{insightLabel(preview.strengthSignal.id)}</h3>
          <EvidenceDrawer chartId={chartId} evidenceId={preview.strengthSignal.evidence.evidenceId} loadEvidence={loadEvidence} />
        </article>
        <article>
          <p className="eyebrow">Điểm căng cần quan sát</p>
          <h3>{insightLabel(preview.tensionSignal.id)}</h3>
          <EvidenceDrawer chartId={chartId} evidenceId={preview.tensionSignal.evidence[0]!.evidenceId} loadEvidence={loadEvidence} />
        </article>
      </div>
      <p className="identity-coverage">
        Phần xem trước bao quát {preview.paidPreview.coveragePercent}% nội dung của {preview.paidPreview.sku}.
      </p>
    </section>
  );
}
