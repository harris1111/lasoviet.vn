"use client";

import { useEffect, useRef } from "react";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type ReadDepthBucket = 0 | 25 | 50 | 75 | 100;

export function toReadDepthBucket(progressPercent: number): ReadDepthBucket {
  if (progressPercent >= 100) return 100;
  if (progressPercent >= 75) return 75;
  if (progressPercent >= 50) return 50;
  if (progressPercent >= 25) return 25;
  return 0;
}

export type ReportOpenedEvent = {
  name: "report_opened";
  properties: {
    sku: string;
    report_version: string;
  };
};

export type ReportSectionReadEvent = {
  name: "report_section_read";
  properties: {
    sku: string;
    section_id: string;
    read_depth_percent: ReadDepthBucket;
  };
};

export type ReportReaderAnalyticsState = {
  hasOpened: boolean;
  claimedSectionBuckets: Set<string>;
};

export function createReportReaderAnalyticsState(): ReportReaderAnalyticsState {
  return {
    hasOpened: false,
    claimedSectionBuckets: new Set(),
  };
}

export function claimReportOpened(
  state: ReportReaderAnalyticsState,
  sku: string,
  reportVersion: string,
): ReportOpenedEvent | null {
  if (state.hasOpened) return null;
  state.hasOpened = true;
  return {
    name: "report_opened",
    properties: {
      sku,
      report_version: reportVersion,
    },
  };
}

export function claimReportSectionRead(
  state: ReportReaderAnalyticsState,
  params: {
    sku: string;
    sectionId: string | undefined;
    progressPercent: number;
  },
): ReportSectionReadEvent | null {
  if (!params.sectionId) return null;
  const bucket = toReadDepthBucket(params.progressPercent);
  if (bucket === 0) return null;
  const key = `${params.sectionId}:${bucket}`;
  if (state.claimedSectionBuckets.has(key)) return null;
  state.claimedSectionBuckets.add(key);
  return {
    name: "report_section_read",
    properties: {
      sku: params.sku,
      section_id: params.sectionId,
      read_depth_percent: bucket,
    },
  };
}

export type UseReportReaderAnalyticsParams = {
  sku: string;
  reportVersion: string;
  activeSectionId?: string;
  progressPercent: number;
};

export function useReportReaderAnalytics({
  sku,
  reportVersion,
  activeSectionId,
  progressPercent,
}: UseReportReaderAnalyticsParams): void {
  const stateRef = useRef<ReportReaderAnalyticsState>(createReportReaderAnalyticsState());

  useEffect(() => {
    const claim = claimReportOpened(stateRef.current, sku, reportVersion);
    if (claim) {
      void sendBrowserAnalyticsEvent(claim.name, claim.properties);
    }
  }, [sku, reportVersion]);

  useEffect(() => {
    const claim = claimReportSectionRead(stateRef.current, {
      sku,
      sectionId: activeSectionId,
      progressPercent,
    });
    if (claim) {
      void sendBrowserAnalyticsEvent(claim.name, claim.properties);
    }
  }, [sku, activeSectionId, progressPercent]);
}
