"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type {
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
} from "@lasoviet/contracts";

import { ZiweiResultSummary } from "./ziwei-result-summary";
import { ZiweiChart } from "./ziwei-chart";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";

export type ZiweiChartTabProps = {
  birthSummary: ZiweiBirthSummaryV1;
  chart: NormalizedZiweiChartV1;
  locale: ZiweiPresentationLocale;
  chartId: string;
};

export function ZiweiChartTab({
  birthSummary,
  chart,
  locale,
}: ZiweiChartTabProps) {
  const t = useTranslations("ziwei");
  const isEn = locale === "en";

  const wizardPath = isEn ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";
  const starGlossaryPath = isEn
    ? "/en/kien-thuc/tu-vi/14-chinh-tinh"
    : "/kien-thuc/tu-vi/14-chinh-tinh";

  return (
    <div className="ziwei-chart-tab-content">
      {/* 1. Result summary */}
      <div className="container">
        <ZiweiResultSummary
          birthSummary={birthSummary}
          chart={chart}
          locale={locale}
        />
      </div>

      {/* 2. Action row of 3 pills */}
      <div className="container chart-action-pills-wrap">
        <div className="chart-action-pills">
          <Link
            className="chart-pill-btn"
            href={wizardPath}
            title={t("chartActions.rebuildChart")}
          >
            <span aria-hidden="true" className="chart-pill-icon">↻</span>
            <span>{t("chartActions.rebuildChart")}</span>
          </Link>
          <Link
            className="chart-pill-btn"
            href={starGlossaryPath}
            title={t("chartActions.starLookup")}
          >
            <span aria-hidden="true" className="chart-pill-icon">📖</span>
            <span>{t("chartActions.starLookup")}</span>
          </Link>
          <div className="chart-pill-disabled-wrap">
            <button
              aria-describedby="download-disabled-note"
              aria-disabled="true"
              className="chart-pill-btn chart-pill-disabled"
              disabled
              type="button"
            >
              <span aria-hidden="true" className="chart-pill-icon">⬇</span>
              <span>{t("chartActions.downloadImage")}</span>
            </button>
            <span className="chart-pill-note" id="download-disabled-note">
              {t("chartActions.downloadDisabledNote")}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Traditional 4x4 chart */}
      <div className="result-layout container">
        <ZiweiChart
          birthSummary={birthSummary}
          chart={chart}
          locale={locale}
        />
      </div>

      {/* 4. Brightness legend only (no invented scores) */}
      <div className="container chart-legend-container">
        <div className="chart-brightness-legend" aria-label={t("chartActions.legend.title")}>
          <span className="chart-legend-title">{t("chartActions.legend.title")}</span>
          <div className="chart-legend-items">
            <span className="legend-item">
              <strong className="legend-marker legend-m">M</strong>
              <span>{t("chartActions.legend.exalted")}</span>
            </span>
            <span className="legend-item">
              <strong className="legend-marker legend-v">V</strong>
              <span>{t("chartActions.legend.prosperous")}</span>
            </span>
            <span className="legend-item">
              <strong className="legend-marker legend-d">Đ</strong>
              <span>{t("chartActions.legend.favorable")}</span>
            </span>
            <span className="legend-item">
              <strong className="legend-marker legend-b">B</strong>
              <span>{t("chartActions.legend.neutral")}</span>
            </span>
            <span className="legend-item">
              <strong className="legend-marker legend-h">H</strong>
              <span>{t("chartActions.legend.unfavorable")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Factual exploration / discovery strip (PR spec §6.2) */}
      <div className="container chart-discovery-strip-wrap">
        <div className="chart-discovery-strip" aria-label={t("chartActions.discoveryAriaLabel")}>
          <div className="discovery-stat-item">
            <span className="discovery-stat-num">12</span>
            <span className="discovery-stat-label">{t("chartActions.discovery.palacesCount")}</span>
          </div>
          <div className="discovery-stat-item">
            <span className="discovery-stat-num">03</span>
            <span className="discovery-stat-label">{t("chartActions.discovery.insightsCount")}</span>
          </div>
          <div className="discovery-stat-item">
            <span className="discovery-stat-num">03</span>
            <span className="discovery-stat-label">{t("chartActions.discovery.evidenceCount")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
