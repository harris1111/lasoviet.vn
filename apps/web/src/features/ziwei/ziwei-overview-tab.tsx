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
  signInHref?: string;
  isGuest?: boolean;
};

export function ZiweiOverviewTab({
  chart,
  chartId,
  displayName,
  locale,
  loadEvidence,
  preview,
  onNavigateToPalaces,
  signInHref,
  isGuest,
}: ZiweiOverviewTabProps) {
  const t = useTranslations("ziwei");

  return (
    <div className="ziwei-overview-tab-content">
      <div className="container reading-overview-container">
        {/* Reuse FreeIdentityPreview (magnet offer + secure reveal/blur) */}
        <FreeIdentityPreview
          chart={chart}
          chartId={chartId}
          displayName={displayName}
          isGuest={isGuest}
          locale={locale}
          loadEvidence={loadEvidence}
          paidUpgradeEligible={false}
          preview={preview}
          signInHref={signInHref}
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
