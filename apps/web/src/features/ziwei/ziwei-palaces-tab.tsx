"use client";

import React, { useState } from "react";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { useTranslations } from "next-intl";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";

export type ZiweiPalacesTabProps = {
  chart: NormalizedZiweiChartV1;
  locale: ZiweiPresentationLocale;
  openPalaceId?: string;
  onOpenPalace: (palaceSuffixId?: string) => void;
};

export function ZiweiPalacesTab({
  chart,
  locale,
  openPalaceId,
  onOpenPalace,
}: ZiweiPalacesTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);

  // Normalize 12 palaces in canonical order or chart order
  const palaces = chart.palaces;

  const [activePalaceSuffix, setActivePalaceSuffix] = useState<string | undefined>(
    openPalaceId,
  );

  function handleSelectPalace(suffix: string) {
    const next = activePalaceSuffix === suffix ? undefined : suffix;
    setActivePalaceSuffix(next);
    onOpenPalace(next);
  }

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
            (s) => (s as any).category === "major" || (s as any).type === "major" || (s as any).type === "principal" || Boolean(s.brightness),
          );
          const branchName = presentation.branch(palace.earthlyBranchId);
          const stemName = palace.heavenlyStemId ? presentation.stem(palace.heavenlyStemId) : "";
          const cycleStateName = palace.cycleStateId ? presentation.cycleState(palace.cycleStateId) : "";
          const isSoul = palace.id === chart.soulPalaceId;
          const isBody = palace.id === chart.bodyPalaceId;

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
                  {/* Status marker: Only provable 'preview' or 'unopened'; never 'read' */}
                  <span className={`palace-status-badge ${isSoul ? "badge-preview" : "badge-unopened"}`}>
                    {isSoul ? t("palacesTab.previewState") : t("palacesTab.unopenedState")}
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

              {/* Expanded palace detail drawer (factual/deterministic only) */}
              {isOpen ? (
                <div className="palace-row-detail-drawer">
                  <div className="palace-facts-grid">
                    <div className="fact-item">
                      <span className="fact-label">{presentation.chrome.soulMarker} / {presentation.chrome.bodyMarker}:</span>
                      <span className="fact-val">
                        {isSoul ? presentation.chrome.soulMarker : (isBody ? presentation.chrome.bodyMarker : "—")}
                      </span>
                    </div>
                    <div className="fact-item">
                      <span className="fact-label">Vòng Trường Sinh:</span>
                      <span className="fact-val">{cycleStateName}</span>
                    </div>
                    <div className="fact-item">
                      <span className="fact-label">Toàn bộ sao:</span>
                      <span className="fact-val">
                        {palace.stars.map((s) => presentation.star(s.id)).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
