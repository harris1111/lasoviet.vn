"use client";

import React from "react";
import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import { FreeIdentityPreview } from "../reports/free-identity-preview";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";

export type ZiweiOverviewTabProps = {
  chart: NormalizedZiweiChartV1;
  chartId: string;
  displayName?: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
  onNavigateToPalaces: () => void;
};

export function ZiweiOverviewTab({
  chart,
  chartId,
  displayName,
  locale,
  loadEvidence,
  preview,
  onNavigateToPalaces,
}: ZiweiOverviewTabProps) {
  const t = useTranslations("ziwei");

  return (
    <div className="ziwei-overview-tab-content">
      <div className="container reading-overview-container">
        {/* Reuse FreeIdentityPreview (3 deterministic highlights + 2 signals) */}
        <FreeIdentityPreview
          chart={chart}
          chartId={chartId}
          displayName={displayName}
          locale={locale}
          loadEvidence={loadEvidence}
          preview={preview}
          paidUpgradeEligible={false}
        />

        {/* Primary CTA switches to Palaces tab via URL */}
        <div className="overview-tab-cta-wrap">
          <button
            className="button button-pill overview-to-palaces-btn"
            onClick={onNavigateToPalaces}
            type="button"
          >
            {t("overviewTab.ctaPalaces")}
          </button>
        </div>
      </div>
    </div>
  );
}
