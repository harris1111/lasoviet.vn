"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
  ZiweiEvidenceViewV1,
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
import type { ZiweiPresentationLocale } from "./ziwei-presentation";

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
}: ZiweiResultTabsProps) {
  const t = useTranslations("ziwei");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ZiweiResultTab>(initialState.tab);
  const [openId, setOpenId] = useState<string | undefined>(initialState.open);

  const tabListRef = useRef<HTMLDivElement>(null);

  // Sync state if server initialState updates (e.g. Back/Forward button)
  useEffect(() => {
    queueMicrotask(() => {
      setActiveTab(initialState.tab);
      setOpenId(initialState.open);
    });
  }, [initialState.tab, initialState.open]);

  // Use router.push on user interactions so browser history / Back / Forward updates state correctly
  function handleTabChange(nextTab: ZiweiResultTab, nextOpen?: string) {
    setActiveTab(nextTab);
    setOpenId(nextOpen);
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

  return (
    <div className="ziwei-result-tabs-shell">
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
                {tabLabel}
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
              openEvidenceId={openId}
              preview={preview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
