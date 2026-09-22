"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "./ziwei-presentation";
import {
  CANONICAL_TOPIC_IDS,
  type CanonicalTopicId,
} from "./ziwei-tabs-state";
import { getPalaceLifeArea } from "./ziwei-chart-relations";

export type ZiweiTopicsTabProps = {
  chartId: string;
  locale: ZiweiPresentationLocale;
  openTopicId?: string;
  onOpenTopic: (topicId?: string) => void;
};

export function ZiweiTopicsTab({
  chartId,
  locale,
  openTopicId,
  onOpenTopic,
}: ZiweiTopicsTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);
  const isEn = locale === "en";

  // Parent openTopicId is the SOLE source of truth
  const activeTopic = openTopicId as CanonicalTopicId | undefined;

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetPanelRef = useRef<HTMLDivElement>(null);

  const unlockSelectionHref = isEn
    ? `/en/la-so/${chartId}/chon-luan-giai`
    : `/la-so/${chartId}/chon-luan-giai`;

  function handleSelectTopic(topicId: CanonicalTopicId, btnElement?: HTMLButtonElement) {
    if (btnElement) {
      triggerRef.current = btnElement;
    }
    const next = activeTopic === topicId ? undefined : topicId;
    onOpenTopic(next);
  }

  const handleCloseModal = useCallback(() => {
    onOpenTopic(undefined);
    if (triggerRef.current) {
      triggerRef.current.focus();
    } else if (activeTopic) {
      // Focus the exact selected topic trigger for deep-link restoration
      const triggerBtn = document.querySelector<HTMLButtonElement>(
        `[data-topic-trigger="${activeTopic}"]`,
      );
      triggerBtn?.focus();
    }
  }, [activeTopic, onOpenTopic]);

  // Keyboard accessibility & focus trap for mobile dialog / bottom sheet
  useEffect(() => {
    if (!activeTopic) return;

    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseModal();
        return;
      }

      if (e.key === "Tab") {
        if (!sheetPanelRef.current) return;
        const focusable = sheetPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTopic, handleCloseModal]);

  return (
    <div className="container ziwei-topics-tab-content">
      <div className="section-heading">
        <p className="eyebrow">{t("topicsTab.title")}</p>
        <h2>{t("topicsTab.title")}</h2>
        <p className="section-lead">{t("topicsTab.subtitle")}</p>
      </div>

      <div className="topics-list-container" role="list">
        {CANONICAL_TOPIC_IDS.map((topicKey, index) => {
          const palaceFullId = ZIWEI_PALACE_IDS[index]!;
          const palaceName = presentation.palace(palaceFullId);
          // Canonical domain area metadata from getPalaceLifeArea (no handwritten claims)
          const lifeArea = getPalaceLifeArea(palaceFullId, locale);
          const domainTeaser = lifeArea.domain;
          const isSelected = activeTopic === topicKey;

          return (
            <article
              className={`topic-row-item${isSelected ? " is-active" : ""}`}
              key={topicKey}
              role="listitem"
            >
              <div className="topic-row-summary">
                <div className="topic-row-num">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="topic-row-body">
                  <h3 className="topic-row-title">{palaceName}</h3>
                  <p className="topic-row-teaser">{domainTeaser}</p>
                </div>
                <div className="topic-row-actions">
                  <button
                    aria-expanded={isSelected}
                    className="button button-small button-pill topic-inspect-btn"
                    data-topic-trigger={topicKey}
                    onClick={(e) => handleSelectTopic(topicKey, e.currentTarget)}
                    type="button"
                  >
                    {isSelected ? t("topicsTab.closePreview") : t("topicsTab.openPreview")}
                  </button>
                </div>
              </div>

              {/* Desktop inline preview (only rendered on desktop, hidden on mobile) */}
              {isSelected ? (
                <div className="topic-desktop-inline-preview">
                  <div className="topic-preview-box">
                    <h4>
                      {t("topicsTab.previewTitle")}: {palaceName}
                    </h4>
                    <p className="topic-preview-notice">{t("topicsTab.notice")}</p>
                    <div className="topic-preview-actions">
                      <Link className="button button-pill" href={unlockSelectionHref}>
                        {t("topicsTab.unlockCta")}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Mobile accessible dialog / bottom sheet (strictly hidden on desktop) */}
      {activeTopic ? (
        <div
          aria-labelledby="mobile-sheet-title"
          aria-modal="true"
          className="topic-mobile-sheet-overlay"
          onClick={handleCloseModal}
          role="dialog"
        >
          <div
            className="topic-mobile-sheet"
            onClick={(e) => e.stopPropagation()}
            ref={sheetPanelRef}
          >
            <div className="sheet-drag-handle" aria-hidden="true" />
            <div className="sheet-header">
              <h3 id="mobile-sheet-title">
                {presentation.palace(
                  ZIWEI_PALACE_IDS[CANONICAL_TOPIC_IDS.indexOf(activeTopic)]!,
                )}
              </h3>
              <button
                aria-label={t("topicsTab.closePreview")}
                className="sheet-close-btn"
                onClick={handleCloseModal}
                ref={closeBtnRef}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="sheet-body">
              <p className="sheet-domain-prose">
                {
                  getPalaceLifeArea(
                    ZIWEI_PALACE_IDS[CANONICAL_TOPIC_IDS.indexOf(activeTopic)]!,
                    locale,
                  ).domain
                }
              </p>
              <div className="sheet-notice-card">
                <p>{t("topicsTab.notice")}</p>
              </div>
              <div className="sheet-cta-wrap">
                <Link className="button button-pill full-width" href={unlockSelectionHref}>
                  {t("topicsTab.unlockCta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
