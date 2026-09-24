"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

import { ZiweiResultTabs } from "../ziwei/ziwei-result-tabs";
import {
  parseResultTabState,
  type ParsedResultTabState,
} from "../ziwei/ziwei-tabs-state";
import {
  sampleBirthSummary,
  sampleChart,
  samplePreview,
  sampleEvidenceMap,
} from "./sample-ziwei-data";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

type SampleReportPageProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  route: RouteDefinitionV1;
  searchParams?: Record<string, string | string[] | undefined>;
};

export function SampleReportPage({
  content,
  locale,
  searchParams,
}: SampleReportPageProps) {
  const t = useTranslations("ziwei");
  const isEn = locale === "en";
  const chartHref = isEn ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";
  const basePath = isEn ? "/en/bao-cao-mau/tu-vi" : "/bao-cao-mau/tu-vi";

  // Parse initial tab state from searchParams
  const tabState: ParsedResultTabState = parseResultTabState(searchParams);

  // Send FD-081 analytics event on mount
  useEffect(() => {
    void sendBrowserAnalyticsEvent("offer_view", {
      offer_id: "sample_report_tu_vi",
      placement: "sample_report",
      sku: "ZIWEI-SAMPLE",
    });
  }, []);

  async function loadEvidence(_chartId: string, evidenceId: string) {
    const item = sampleEvidenceMap[evidenceId];
    if (item) {
      return { ok: true as const, value: item };
    }
    return {
      ok: false as const,
      error: { code: "EVIDENCE_NOT_FOUND" },
    };
  }

  return (
    <main className="sample-report-page">
      {/* 1. Hero section: Real anonymized sample chart presentation with "BẢN MẪU" stamp */}
      <section aria-labelledby="sample-hero-heading" className="sample-hero container">
        <div className="sample-hero-content">
          <p className="eyebrow">{t("sample.heroEyebrow")}</p>
          <h1 id="sample-hero-heading">
            {content.title || t("sample.heroTitle")}
          </h1>
          <p className="sample-hero-lead">{t("sample.heroLead")}</p>
          <div className="sample-byline-row">
            <span className="sample-byline-text">{t("sample.byline")}</span>
          </div>
        </div>
        <div className="sample-hero-stamp" aria-hidden="true">
          <span className="sample-stamp-box">
            {isEn ? "SAMPLE" : "BẢN\nMẪU"}
          </span>
        </div>
      </section>

      {/* 2. UI-04 Result Tabs Component */}
      <ZiweiResultTabs
        basePath={basePath}
        birthSummary={sampleBirthSummary}
        chart={sampleChart}
        chartId="sample-tu-vi"
        displayName={isEn ? "Sample (Female · 1992)" : "Bản mẫu (Nữ · 1992)"}
        initialState={tabState}
        isSample={true}
        locale={locale}
        loadEvidence={loadEvidence}
        preview={samplePreview}
      />

      {/* 3. Final End CTA */}
      <section aria-labelledby="sample-end-heading" className="sample-end-cta container">
        <div className="sample-end-cta-card">
          <h2 id="sample-end-heading">{t("sample.endCtaHeading")}</h2>
          <p className="sample-end-lead">{t("sample.endCtaLead")}</p>
          <Link
            className="button button-primary button-lg button-pill"
            href={chartHref}
            onClick={() => {
              void sendBrowserAnalyticsEvent("wizard_start", {
                locale,
                entry_point: "sample_report_end_cta",
                step: "entry",
              });
            }}
          >
            {t("sample.endCtaButton")}
          </Link>
        </div>
      </section>

      {/* 4. Mobile Sticky Bottom Bar (viewport <= 768px) */}
      <div
        aria-label={t("sample.mobileBottomTitle")}
        className="sample-mobile-bottom-bar"
        role="complementary"
      >
        <div className="sample-mobile-bottom-content">
          <div className="sample-mobile-bottom-text">
            <span className="sample-mobile-bottom-title">{t("sample.mobileBottomTitle")}</span>
            <span className="sample-mobile-bottom-sub">{t("sample.mobileBottomSubtitle")}</span>
          </div>
          <Link
            className="button button-primary button-small button-pill"
            href={chartHref}
            onClick={() => {
              void sendBrowserAnalyticsEvent("wizard_start", {
                locale,
                entry_point: "sample_mobile_sticky_cta",
                step: "entry",
              });
            }}
          >
            {t("sample.mobileBottomCta")}
          </Link>
        </div>
      </div>
    </main>
  );
}
