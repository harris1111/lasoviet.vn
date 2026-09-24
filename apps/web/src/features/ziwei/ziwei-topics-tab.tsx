"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  sampleTopicsVi,
  sampleTopicsEn,
  type SampleTopicDetail,
} from "../content/sample-topics-data";
import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type ZiweiTopicsTabProps = {
  chartId: string;
  locale: ZiweiPresentationLocale;
  openTopicId?: string;
  onOpenTopic: (topicId?: string) => void;
  isSample?: boolean;
};

export function ZiweiTopicsTab({
  chartId,
  locale,
  openTopicId,
  onOpenTopic,
  isSample,
}: ZiweiTopicsTabProps) {
  const t = useTranslations("ziwei");
  const presentation = ziweiPresentation(locale);
  const isEn = locale === "en";

  // Check if viewport is mobile (<= 768px)
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    queueMicrotask(() => {
      setIsMobile(mql.matches);
      setMounted(true);
    });

    function onChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Parent openTopicId is the SOLE source of truth
  const activeTopic = openTopicId as CanonicalTopicId | undefined;

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetPanelRef = useRef<HTMLDivElement>(null);

  const unlockSelectionHref = isSample
    ? isEn
      ? "/en/tao-la-so/tu-vi"
      : "/tao-la-so/tu-vi"
    : isEn
      ? `/en/la-so/${chartId}/chon-luan-giai`
      : `/la-so/${chartId}/chon-luan-giai`;

  function handleSelectTopic(topicId: CanonicalTopicId, btnElement?: HTMLButtonElement) {
    if (btnElement) {
      triggerRef.current = btnElement;
    }
    const next = activeTopic === topicId ? undefined : topicId;
    if (isSample && next === topicId) {
      const sampleItem = (isEn ? sampleTopicsEn : sampleTopicsVi)[topicId];
      if (sampleItem && !sampleItem.isOpen) {
        void sendBrowserAnalyticsEvent("locked_preview_view", {
          section_id: topicId,
          sku: "ZIWEI-SAMPLE",
        });
      }
    }
    onOpenTopic(next);
  }

  const handleCloseModal = useCallback(() => {
    onOpenTopic(undefined);
  }, [onOpenTopic]);

  // Focus restore strictly after inert cleanup and modal unmount (close button, Escape, backdrop, browser Back)
  const prevActiveTopicRef = useRef<CanonicalTopicId | undefined>(activeTopic);
  useEffect(() => {
    const prevTopic = prevActiveTopicRef.current;
    prevActiveTopicRef.current = activeTopic;

    if (prevTopic && !activeTopic && isMobile) {
      const targetTopic = prevTopic;
      const raf = requestAnimationFrame(() => {
        if (triggerRef.current && document.body.contains(triggerRef.current)) {
          triggerRef.current.focus();
        } else {
          const triggerBtn = document.querySelector<HTMLButtonElement>(
            `[data-topic-trigger="${targetTopic}"]`,
          );
          triggerBtn?.focus();
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeTopic, isMobile]);

  // Background isolation & focus trap for mobile dialog / bottom sheet (portal sibling to main)
  useEffect(() => {
    if (!activeTopic || !isMobile || !mounted) return;

    // Isolate all sibling root landmarks & body children (header, main, footer) using inert and aria-hidden
    const backgroundElements: Array<{ el: HTMLElement; prevAriaHidden: string | null; prevInert: boolean }> = [];

    const rootLandmarks = new Set<HTMLElement>();
    document.querySelectorAll<HTMLElement>("header, main, footer, [role='banner'], [role='main'], [role='contentinfo']").forEach((el) => {
      rootLandmarks.add(el);
    });
    if (typeof document !== "undefined" && document.body) {
      Array.from(document.body.children).forEach((child) => {
        if (child instanceof HTMLElement && !child.classList.contains("topic-mobile-sheet-overlay")) {
          rootLandmarks.add(child);
        }
      });
    }

    rootLandmarks.forEach((node) => {
      backgroundElements.push({
        el: node,
        prevAriaHidden: node.getAttribute("aria-hidden"),
        prevInert: (node as any).inert ?? false,
      });
      node.setAttribute("aria-hidden", "true");
      (node as any).inert = true;
    });

    const rafId = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

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
          if (document.activeElement === first || !sheetPanelRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !sheetPanelRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown);
      backgroundElements.forEach(({ el, prevAriaHidden, prevInert }) => {
        if (prevAriaHidden === null) {
          el.removeAttribute("aria-hidden");
        } else {
          el.setAttribute("aria-hidden", prevAriaHidden);
        }
        (el as any).inert = prevInert;
      });
    };
  }, [activeTopic, isMobile, mounted, handleCloseModal]);

  const activeSampleDetail =
    isSample && activeTopic
      ? (isEn ? sampleTopicsEn : sampleTopicsVi)[activeTopic]
      : undefined;

  const modalDialog =
    activeTopic && isMobile && mounted
      ? createPortal(
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
                {isSample && activeSampleDetail ? (
                  activeSampleDetail.isOpen ? (
                    <div className="topic-sample-full-reading">
                      <p className="sample-topic-source">{activeSampleDetail.source}</p>
                      <div className="sample-topic-prose">
                        {activeSampleDetail.prose.map((p, i) => (
                          <p key={i} className="sample-reading-p">
                            {p}
                          </p>
                        ))}
                      </div>
                      {activeSampleDetail.actions && activeSampleDetail.actions.length > 0 && (
                        <div className="sample-topic-actions">
                          <h4>{t("sample.actionsTitle")}</h4>
                          <ul className="sample-actions-list">
                            {activeSampleDetail.actions.map((act, i) => (
                              <li key={i}>
                                <span className="sample-act-num">{i + 1}</span>
                                <span className="sample-act-text">{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeSampleDetail.evidenceDetails &&
                        activeSampleDetail.evidenceDetails.length > 0 && (
                          <details className="sample-why-details">
                            <summary>{t("sample.whyTitle")}</summary>
                            <dl>
                              {activeSampleDetail.evidenceDetails.map((ev, i) => (
                                <div key={i} className="sample-why-row">
                                  <dt>{ev.label}</dt>
                                  <dd>{ev.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        )}
                      <div className="sample-byline-tag">
                        {activeSampleDetail.byline || t("sample.byline")}
                      </div>
                    </div>
                  ) : (
                    <div className="topic-sample-locked-reading">
                      <p className="sample-topic-source">{activeSampleDetail.source}</p>
                      <p className="sample-locked-excerpt">
                        {activeSampleDetail.lockedExcerpt}
                      </p>
                      <div className="sample-locked-veil">
                        <p className="sample-locked-notice">{t("sample.lockedNotice")}</p>
                        <Link
                          className="button button-primary button-pill full-width"
                          href={unlockSelectionHref}
                          onClick={() => {
                            void sendBrowserAnalyticsEvent("wizard_start", {
                              locale,
                              entry_point: "sample_topic_sheet_cta",
                              step: "entry",
                            });
                          }}
                        >
                          {t("sample.unlockCta")}
                        </Link>
                      </div>
                    </div>
                  )
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

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
          const sampleDetail: SampleTopicDetail | undefined = isSample
            ? (isEn ? sampleTopicsEn : sampleTopicsVi)[topicKey]
            : undefined;

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
                  <div className="topic-row-title-wrap">
                    <h3 className="topic-row-title">{palaceName}</h3>
                    {isSample && sampleDetail && (
                      <span
                        className={`topic-status-tag ${
                          sampleDetail.isOpen ? "is-open" : "is-locked"
                        }`}
                      >
                        {sampleDetail.isOpen ? t("sample.unlockedTag") : t("sample.lockedTag")}
                      </span>
                    )}
                  </div>
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

              {/* Desktop inline preview (strictly non-portal, rendered only on desktop when active) */}
              {isSelected && !isMobile ? (
                <div className="topic-desktop-inline-preview">
                  {isSample && sampleDetail ? (
                    sampleDetail.isOpen ? (
                      <div className="topic-sample-full-reading">
                        <p className="sample-topic-source">{sampleDetail.source}</p>
                        <div className="sample-topic-prose">
                          {sampleDetail.prose.map((p, i) => (
                            <p key={i} className="sample-reading-p">
                              {p}
                            </p>
                          ))}
                        </div>
                        {sampleDetail.actions && sampleDetail.actions.length > 0 && (
                          <div className="sample-topic-actions">
                            <h4>{t("sample.actionsTitle")}</h4>
                            <ul className="sample-actions-list">
                              {sampleDetail.actions.map((act, i) => (
                                <li key={i}>
                                  <span className="sample-act-num">{i + 1}</span>
                                  <span className="sample-act-text">{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sampleDetail.evidenceDetails &&
                          sampleDetail.evidenceDetails.length > 0 && (
                            <details className="sample-why-details">
                              <summary>{t("sample.whyTitle")}</summary>
                              <dl>
                                {sampleDetail.evidenceDetails.map((ev, i) => (
                                  <div key={i} className="sample-why-row">
                                    <dt>{ev.label}</dt>
                                    <dd>{ev.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            </details>
                          )}
                        <div className="sample-byline-tag">
                          {sampleDetail.byline || t("sample.byline")}
                        </div>
                      </div>
                    ) : (
                      <div className="topic-sample-locked-reading">
                        <p className="sample-topic-source">{sampleDetail.source}</p>
                        <p className="sample-locked-excerpt">
                          {sampleDetail.lockedExcerpt}
                        </p>
                        <div className="sample-locked-veil">
                          <p className="sample-locked-notice">{t("sample.lockedNotice")}</p>
                          <Link
                            className="button button-primary button-pill"
                            href={unlockSelectionHref}
                            onClick={() => {
                              void sendBrowserAnalyticsEvent("wizard_start", {
                                locale,
                                entry_point: "sample_topic_desktop_cta",
                                step: "entry",
                              });
                            }}
                          >
                            {t("sample.unlockCta")}
                          </Link>
                        </div>
                      </div>
                    )
                  ) : (
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
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Render mobile dialog via portal into document.body */}
      {modalDialog}
    </div>
  );
}
