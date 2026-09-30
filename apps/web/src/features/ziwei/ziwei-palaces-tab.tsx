"use client";

import React from "react";
import type { FreeIdentityPreviewV1, NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import { SecureLockedPreview } from "./secure-locked-preview";

export type ZiweiPalacesTabProps = {
  chart: NormalizedZiweiChartV1;
  chartId?: string;
  locale: ZiweiPresentationLocale;
  openPalaceId?: string;
  onOpenPalace: (palaceSuffixId?: string) => void;
  preview?: FreeIdentityPreviewV1;
  isGuest?: boolean;
  signInHref?: string;
};

export function ZiweiPalacesTab({
  chart,
  chartId,
  locale,
  openPalaceId,
  onOpenPalace,
  preview,
  isGuest,
  signInHref,
}: ZiweiPalacesTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);

  const palaces = chart.palaces;
  const isSoulPalace = (id: string) => id === chart.soulPalaceId;
  const isBodyPalace = (id: string) => id === chart.bodyPalaceId;

  // Parent openPalaceId is the SOLE source of truth
  const activePalaceSuffix = openPalaceId;

  function handleSelectPalace(suffix: string) {
    const next = activePalaceSuffix === suffix ? undefined : suffix;
    onOpenPalace(next);
  }

  // Pre-index palace title lines from preview if provided
  const titleLinesMap = new Map(
    (preview?.palaceTitleLines ?? []).map((line) => [line.palaceId, line]),
  );

  return (
    <div className="container ziwei-palaces-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("palacesTab.title")}</p>
        <h2>{t("palacesTab.title")}</h2>
        <p className="section-lead">{t("palacesTab.subtitle")}</p>
      </div>

      <div className="palace-rows-list" role="list">
        {palaces.map((palace) => {
          const suffixId = palace.id.split(".").pop()!;
          const isOpen = activePalaceSuffix === suffixId;
          const majorStars = palace.stars.filter(
            (s) => s.category === "major",
          );
          const branchName = presentation.branch(palace.earthlyBranchId);
          const stemName = palace.heavenlyStemId ? presentation.stem(palace.heavenlyStemId) : "";
          const cycleStateName = palace.cycleStateId ? presentation.cycleState(palace.cycleStateId) : "";
          const isSoul = isSoulPalace(palace.id);
          const isBody = isBodyPalace(palace.id);

          const titleLineData = titleLinesMap.get(palace.id);
          const palaceTitleLine = titleLineData?.title;

          // Status per FD-105: Đã đọc · Xem trước · Chưa mở (or legacy fallback)
          let statusBadgeText: string;
          let statusBadgeClass: string;
          let isUnopened = false;

          if (titleLineData) {
            if (titleLineData.state === "read") {
              statusBadgeText = locale === "vi" ? "Đã đọc" : "Read";
              statusBadgeClass = "badge-read";
            } else if (titleLineData.state === "preview") {
              statusBadgeText = locale === "vi" ? "Xem trước" : "Preview";
              statusBadgeClass = "badge-preview";
            } else {
              statusBadgeText = locale === "vi" ? "Chưa mở" : "Unopened";
              statusBadgeClass = "badge-unopened";
              isUnopened = true;
            }
          } else {
            const isPreview = isSoul || isBody;
            statusBadgeText = isPreview ? t("palacesTab.previewState") : t("palacesTab.unopenedState");
            statusBadgeClass = isPreview ? "badge-preview" : "badge-unopened";
            isUnopened = !isPreview;
          }

          const unlockHref = isGuest
            ? signInHref
            : (chartId ? (locale === "en" ? `/en/la-so/${chartId}/chon-luan-giai` : `/la-so/${chartId}/chon-luan-giai`) : undefined);

          return (
            <article
              className={`palace-row-card${isOpen ? " is-expanded" : ""}`}
              key={palace.id}
              role="listitem"
            >
              <div
                className="palace-row-summary"
                onClick={() => handleSelectPalace(suffixId)}
              >
                <div className="palace-row-left">
                  <div className="palace-row-name-group">
                    <span className="palace-stem-branch-badge">
                      {stemName} {branchName}
                    </span>
                    <h3 className="palace-row-name">{presentation.palace(palace.id)}</h3>
                    {palaceTitleLine ? (
                      <span className="palace-title-line">{palaceTitleLine}</span>
                    ) : null}
                  </div>
                  <div className="palace-row-markers">
                    {isSoul ? <span className="marker-soul">{presentation.chrome.soulMarker}</span> : null}
                    {isBody ? <span className="marker-body">{presentation.chrome.bodyMarker}</span> : null}
                  </div>
                </div>

                <div className="palace-row-center">
                  <div className="palace-row-stars">
                    {majorStars.length > 0 ? (
                      majorStars.map((st) => (
                        <span className="major-star-pill" key={st.id}>
                          <span className="star-name">{presentation.star(st.id)}</span>
                          {st.brightness ? (
                            <span className="star-brightness">
                              ({presentation.brightness(st.brightness)})
                            </span>
                          ) : null}
                        </span>
                      ))
                    ) : (
                      <span className="no-major-stars-text">
                        {t("palacesTab.noMajorStars")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="palace-row-right">
                  <span className={`palace-status-badge ${statusBadgeClass}`}>
                    {statusBadgeText}
                  </span>
                  <button
                    aria-expanded={isOpen}
                    className="palace-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPalace(suffixId);
                    }}
                    type="button"
                  >
                    <span className="sr-only">
                      {isOpen ? t("palacesTab.closeAction") : t("palacesTab.inspectAction")}{" "}
                      {presentation.palace(palace.id)}
                    </span>
                    <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                  </button>
                </div>
              </div>

              {/* Expanded palace detail drawer */}
              {isOpen ? (
                <div className="palace-row-detail-drawer">
                  {isUnopened ? (
                    <SecureLockedPreview
                      actionHref={unlockHref}
                      actionLabel={isGuest ? (locale === "vi" ? "Lưu lá số để mở" : "Save chart to reveal") : (locale === "vi" ? "Mở – 120 Lá" : "Unlock – 120 Lá")}
                      badge={locale === "vi" ? "Chưa mở" : "Locked"}
                      clippedSentences={titleLineData?.clippedOpening ? [titleLineData.clippedOpening] : []}
                      counts={{ points: 1, approximateWords: 650 }}
                      isGuest={isGuest}
                      lengthHint={4}
                      locale={locale}
                      priceLa={120}
                      signInHref={signInHref}
                      tagline={presentation.palace(palace.id)}
                      title={palaceTitleLine ?? presentation.palace(palace.id)}
                    />
                  ) : (
                    <div className="palace-facts-grid">
                      <div className="fact-item">
                        <span className="fact-label">{presentation.chrome.soulMarker} / {presentation.chrome.bodyMarker}:</span>
                        <span className="fact-val">
                          {isSoul ? presentation.chrome.soulMarker : (isBody ? presentation.chrome.bodyMarker : "—")}
                        </span>
                      </div>
                      <div className="fact-item">
                        <span className="fact-label">{t("palacesTab.cycleStateLabel")}</span>
                        <span className="fact-val">{cycleStateName}</span>
                      </div>
                      <div className="fact-item">
                        <span className="fact-label">{t("palacesTab.allStarsLabel")}</span>
                        <span className="fact-val">
                          {palace.stars.map((s) => presentation.star(s.id)).join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
