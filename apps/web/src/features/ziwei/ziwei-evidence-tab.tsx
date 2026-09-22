"use client";

import React, { useEffect, useState } from "react";
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
  onOpenEvidence?: (evidenceId?: string) => void;
};

// Map public URL suffix to canonical evidence ID
export function resolveCanonicalEvidenceId(suffixId: string, preview: FreeIdentityPreviewV1): string {
  // If suffix matches life-palace, body-palace, transformations directly or matches insight
  const matched = preview.insights.find((ins) => {
    const rawId = ins.evidence.evidenceId;
    return rawId === suffixId || rawId.endsWith(`.${suffixId}`) || rawId.includes(suffixId);
  });
  return matched ? matched.evidence.evidenceId : (preview.insights[0]?.evidence.evidenceId || "ziwei.identity.soul");
}

export function ZiweiEvidenceTab({
  chart,
  chartId,
  locale,
  loadEvidence,
  preview,
  openEvidenceId,
}: ZiweiEvidenceTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);

  // Derive exactly the 3 authorized references directly from preview.insights
  const authorizedInsights = preview.insights.slice(0, 3);

  // Support openEvidenceId hydration
  const [internalEvidenceId, setInternalEvidenceId] = useState<string | undefined>(openEvidenceId);
  const activeEvidenceId = openEvidenceId !== undefined ? openEvidenceId : internalEvidenceId;

  return (
    <div className="container ziwei-evidence-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("evidenceTab.title")}</p>
        <h2>{t("evidenceTab.title")}</h2>
        <p className="section-lead">{t("evidenceTab.subtitle")}</p>
      </div>

      <div className="evidence-cards-matrix">
        {authorizedInsights.map((insight, idx) => {
          const canonicalEvidenceId = insight.evidence.evidenceId;
          const label = presentation.insight(insight.id);
          const bound = insight.evidence.interpretationBounds?.join("; ") ||
            (locale === "vi" ? "Chỉ dùng cho mục đích phản chiếu bản mệnh cá nhân." : "For personal reflective identity only.");

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
                  evidenceId={canonicalEvidenceId}
                  locale={locale}
                  loadEvidence={loadEvidence}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
