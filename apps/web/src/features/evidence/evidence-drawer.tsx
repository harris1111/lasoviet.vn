"use client";

import { useEffect, useRef, useState } from "react";
import type {
  NormalizedZiweiChartV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";
import { getDetailedEvidenceExplanation } from "../ziwei/ziwei-free-insights";

export type EvidenceDrawerProps = {
  chart?: NormalizedZiweiChartV1;
  chartId: string;
  evidenceId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
};

export function EvidenceDrawer({
  chart,
  chartId,
  evidenceId,
  locale,
  loadEvidence,
}: EvidenceDrawerProps) {
  const [evidence, setEvidence] = useState<ZiweiEvidenceViewV1["evidence"]>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const presentation = ziweiPresentation(locale);

  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function showEvidence() {
    setError(false);
    setLoading(true);
    try {
      const result = await loadEvidence(chartId, evidenceId);
      if (!result.ok) {
        setError(true);
        return;
      }
      setEvidence(result.value.evidence);
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    triggerButtonRef.current?.focus();
  }

  // Accessible Escape key, focus initial close button, and trap Tab/Shift+Tab
  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "Tab") {
        if (!panelRef.current) return;
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0]!;
        const lastElement = focusableElements[focusableElements.length - 1]!;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Compute rich human-readable explanation if chart is available
  const explanation =
    chart && evidence
      ? getDetailedEvidenceExplanation(evidence.id, chart, locale)
      : undefined;

  return (
    <>
      <button
        className="evidence-open"
        disabled={loading}
        onClick={showEvidence}
        ref={triggerButtonRef}
        type="button"
      >
        {loading ? (locale === "vi" ? "Đang tải..." : "Loading...") : presentation.chrome.evidenceOpen}
      </button>
      {error ? <p className="form-error" role="alert">{presentation.chrome.evidenceError}</p> : null}
      {open && evidence ? (
        <div
          aria-labelledby="evidence-drawer-title"
          aria-modal="true"
          className="evidence-drawer"
          onClick={handleClose}
          role="dialog"
        >
          <div
            className="evidence-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            ref={panelRef}
          >
            <button
              aria-label={presentation.chrome.evidenceClose}
              className="evidence-close"
              onClick={handleClose}
              ref={closeButtonRef}
              type="button"
            >
              {presentation.chrome.evidenceClose}
            </button>
            <p className="eyebrow">{explanation?.eyebrow || presentation.chrome.evidenceEyebrow}</p>
            <h2 id="evidence-drawer-title">{explanation?.title || presentation.evidence(evidence.id)}</h2>

            {explanation ? (
              <dl className="evidence-detail-list">
                <dt>{explanation.sections.location.label}</dt>
                <dd>{explanation.sections.location.value}</dd>

                <dt>{explanation.sections.keyFactors.label}</dt>
                <dd>{explanation.sections.keyFactors.value}</dd>

                <dt>{explanation.sections.plainMeaning.label}</dt>
                <dd>{explanation.sections.plainMeaning.value}</dd>

                <dt>{explanation.sections.supportingOrTension.label}</dt>
                <dd>{explanation.sections.supportingOrTension.value}</dd>

                <dt>{explanation.sections.selfObservation.label}</dt>
                <dd>{explanation.sections.selfObservation.value}</dd>
              </dl>
            ) : (
              <dl className="evidence-detail-list">
                <dt>{presentation.chrome.chartFacts}</dt>
                <dd>{evidence.factReferences.map(presentation.fact).join("; ")}</dd>
              </dl>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
