"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
  ZiweiEvidenceViewV1,
  ZiweiHoroscopeResultV1,
} from "@lasoviet/contracts";

import {
  CANONICAL_RESULT_TABS,
  type ZiweiResultTab,
  type ParsedResultTabState,
  buildCanonicalTabUrl,
} from "./ziwei-tabs-state";
import { ZiweiChartTab } from "./ziwei-chart-tab";
import { ZiweiOverviewTab } from "./ziwei-overview-tab";
import { ZiweiPalacesTab } from "./ziwei-palaces-tab";
import { ZiweiTopicsTab } from "./ziwei-topics-tab";
import { ZiweiEvidenceTab } from "./ziwei-evidence-tab";
import { ZiweiAnnualTab } from "./ziwei-annual-tab";
import type { ZiweiPresentationLocale } from "./ziwei-presentation";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type ZiweiResultTabsProps = {
  initialState: ParsedResultTabState;
  basePath: string;
  birthSummary: ZiweiBirthSummaryV1;
  chart: NormalizedZiweiChartV1;
  chartId: string;
  displayName?: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
  preview: FreeIdentityPreviewV1;
  isSample?: boolean;
  horoscope?: ZiweiHoroscopeResultV1;
};

export function ZiweiResultTabs({
  initialState,
  basePath,
  birthSummary,
  chart,
  chartId,
  displayName,
  locale,
  loadEvidence,
  preview,
  isSample,
  horoscope,
}: ZiweiResultTabsProps) {
  const t = useTranslations("ziwei");
  const router = useRouter();

  // Controlled solely by parent initialState (derived from URL)
  const activeTab = initialState.tab;
  const openId = initialState.open;

  const tabListRef = useRef<HTMLDivElement>(null);

  // Push canonical URL so browser Back/Forward updates state
  function handleTabChange(nextTab: ZiweiResultTab, nextOpen?: string) {
    if (isSample) {
      void sendBrowserAnalyticsEvent("report_section_read", {
        sku: "ZIWEI-SAMPLE",
        section_id: nextTab,
        read_depth_percent: 100,
      });
    }
    const nextUrl = buildCanonicalTabUrl(basePath, {
      tab: nextTab,
      open: nextOpen,
    });
    router.push(nextUrl, { scroll: false });
  }

  // Keyboard navigation: ArrowLeft, ArrowRight, Home, End
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % CANONICAL_RESULT_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + CANONICAL_RESULT_TABS.length) % CANONICAL_RESULT_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = CANONICAL_RESULT_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = CANONICAL_RESULT_TABS[nextIndex]!;
    handleTabChange(nextTab, undefined);

    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  }

  const isProvisional = Boolean(
    chart.provisional || birthSummary.normalizedTime.precision === "unknown",
  );

  return (
    <div className="ziwei-result-tabs-shell">
      {/* Sample Banner if isSample */}
      {isSample && (
        <div className="sample-result-banner container">
          <div className="sample-banner-badge">{t("sample.badge")}</div>
          <p className="sample-banner-text">{t("sample.bannerText")}</p>
          <Link
            className="button button-small button-pill sample-banner-cta"
            href={locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi"}
            onClick={() => {
              void sendBrowserAnalyticsEvent("wizard_start", {
                locale,
                entry_point: "sample_banner_cta",
                step: "entry",
              });
            }}
          >
            {t("sample.bannerCta")}
          </Link>
        </div>
      )}

      {/* Provisional Banner if birth time is unknown or chart flagged provisional */}
      {isProvisional && (
        <div className="provisional-result-banner container" role="status">
          <div className="provisional-banner-badge">{t("provisional.badge")}</div>
          <div className="provisional-banner-content">
            <strong className="provisional-banner-title">{t("provisional.bannerTitle")}</strong>
            <p className="provisional-banner-text">{t("provisional.bannerDescription")}</p>
          </div>
          <Link
            className="button button-small button-pill provisional-banner-cta"
            href={locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi"}
          >
            {t("provisional.actionAddTime")}
          </Link>
        </div>
      )}

      {/* 1. Sticky Layer Tab Bar with fade edge & horizontal scroll */}
      <div className="result-tab-bar-container">
        <div
          aria-label={t("tabs.ariaLabel")}
          className="ui-layer-tab-bar result-sticky-tabs"
          ref={tabListRef}
          role="tablist"
        >
          {CANONICAL_RESULT_TABS.map((tabKey, index) => {
            const isSelected = activeTab === tabKey;
            const tabLabel = t(`tabs.${tabKey}`);

            return (
              <button
                aria-controls={`panel-${tabKey}`}
                aria-selected={isSelected}
                className={`ui-layer-tab-bar__tab result-tab-button${
                  isSelected ? " is-active" : ""
                }`}
                id={`tab-${tabKey}`}
                key={tabKey}
                onClick={() => handleTabChange(tabKey, undefined)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                <span>{tabLabel}</span>
                {tabKey === "nam-nay" && horoscope && (
                  <span
                    className="tab-count count"
                    style={{
                      marginLeft: "6px",
                      fontSize: "12px",
                      color: "var(--son, #ec8a74)",
                      fontWeight: 600,
                    }}
                  >
                    {horoscope.yearly.hanMonthCount} {t("tabs.hanCountSuffix")}
                  </span>
                )}
                {isSample && (
                  <span className="sample-tab-tag">{t("sample.tabBadge")}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Panels */}
      <div className="result-tab-panels">
        {activeTab === "chart" && (
          <div
            aria-labelledby="tab-chart"
            className="ui-tab-panel result-tab-panel"
            id="panel-chart"
            role="tabpanel"
            tabIndex={0}
          >
            <ZiweiChartTab
              birthSummary={birthSummary}
              chart={chart}
              chartId={chartId}
              locale={locale}
            />
          </div>
        )}

        {activeTab === "overview" && (
          <div
            aria-labelledby="tab-overview"
            className="ui-tab-panel result-tab-panel"
            id="panel-overview"
            role="tabpanel"
            tabIndex={0}
          >
            <ZiweiOverviewTab
              chart={chart}
              chartId={chartId}
              displayName={displayName}
              locale={locale}
              loadEvidence={loadEvidence}
              onNavigateToPalaces={() => handleTabChange("palaces", undefined)}
              preview={preview}
            />
          </div>
        )}

        {activeTab === "nam-nay" && (
          <div
            aria-labelledby="tab-nam-nay"
            className="ui-tab-panel result-tab-panel"
            id="panel-nam-nay"
            role="tabpanel"
            tabIndex={0}
          >
            {horoscope ? (
              <ZiweiAnnualTab
                chartId={chartId}
                horoscope={horoscope}
                locale={locale}
                onSelectToanDien={() => handleTabChange("topics", "career")}
              />
            ) : null}
          </div>
        )}

        {activeTab === "palaces" && (
          <div
            aria-labelledby="tab-palaces"
            className="ui-tab-panel result-tab-panel"
            id="panel-palaces"
            role="tabpanel"
            tabIndex={0}
          >
            <ZiweiPalacesTab
              chart={chart}
              locale={locale}
              onOpenPalace={(palaceSuffix) => handleTabChange("palaces", palaceSuffix)}
              openPalaceId={openId}
            />
          </div>
        )}

        {activeTab === "topics" && (
          <div
            aria-labelledby="tab-topics"
            className="ui-tab-panel result-tab-panel"
            id="panel-topics"
            role="tabpanel"
            tabIndex={0}
          >
            <ZiweiTopicsTab
              chartId={chartId}
              isSample={isSample}
              locale={locale}
              onOpenTopic={(topicId) => handleTabChange("topics", topicId)}
              openTopicId={openId}
            />
          </div>
        )}

        {activeTab === "evidence" && (
          <div
            aria-labelledby="tab-evidence"
            className="ui-tab-panel result-tab-panel"
            id="panel-evidence"
            role="tabpanel"
            tabIndex={0}
          >
            <ZiweiEvidenceTab
              chart={chart}
              chartId={chartId}
              locale={locale}
              loadEvidence={loadEvidence}
              onOpenEvidence={(evidenceSuffix) => handleTabChange("evidence", evidenceSuffix)}
              openEvidenceId={openId}
              preview={preview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
