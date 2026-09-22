"use client";

import React from "react";
import type {
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
  FreeIdentityPreviewV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { EvidenceDrawer } from "../evidence/evidence-drawer";
import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import {
  CANONICAL_ID_TO_EVIDENCE_SUFFIX,
  EVIDENCE_SUFFIX_TO_CANONICAL_ID,
  type CanonicalEvidenceOpenId,
} from "./ziwei-tabs-state";

export type ZiweiEvidenceTabProps = {
  chart: NormalizedZiweiChartV1;
  chartId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
  openEvidenceId?: string;
  onOpenEvidence: (evidenceSuffix?: string) => void;
};

export function ZiweiEvidenceTab({
  chart,
  chartId,
  locale,
  loadEvidence,
  preview,
  openEvidenceId,
  onOpenEvidence,
}: ZiweiEvidenceTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);

  // Map each actual insight.evidence.evidenceId through exact closed allowlist
  // Fail closed: filter out any insight whose evidenceId is not allowed/mapped
  const validEvidenceItems = preview.insights
    .map((insight) => {
      const canonicalId = insight.evidence.evidenceId;
      const suffix = CANONICAL_ID_TO_EVIDENCE_SUFFIX[canonicalId];
      if (!suffix) return null;
      return {
        insight,
        suffix,
        canonicalId: EVIDENCE_SUFFIX_TO_CANONICAL_ID[suffix],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="container ziwei-evidence-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("evidenceTab.title")}</p>
        <h2>{t("evidenceTab.title")}</h2>
        <p className="section-lead">{t("evidenceTab.subtitle")}</p>
      </div>

      <div className="evidence-cards-matrix">
        {validEvidenceItems.map((item, idx) => {
          const { insight, suffix, canonicalId } = item;
          const isCurrentlyOpen = openEvidenceId === suffix;
          const label = presentation.insight(insight.id);
          const bound =
            insight.evidence.interpretationBounds?.join("; ") ||
            (locale === "vi"
              ? "Chỉ dùng cho mục đích phản chiếu bản mệnh cá nhân."
              : "For personal reflective identity only.");

          return (
            <article className="evidence-matrix-card" key={insight.id}>
              <div className="matrix-card-head">
                <span className="matrix-badge">
                  {t("evidenceTab.sourceLabel")} 0{idx + 1}
                </span>
                <h3>{label}</h3>
              </div>
              <p className="matrix-card-desc">{bound}</p>
              <div className="matrix-card-action">
                <EvidenceDrawer
                  chart={chart}
                  chartId={chartId}
                  evidenceId={canonicalId}
                  isOpen={isCurrentlyOpen}
                  locale={locale}
                  loadEvidence={loadEvidence}
                  onOpenChange={(open) => {
                    onOpenEvidence(open ? suffix : undefined);
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
