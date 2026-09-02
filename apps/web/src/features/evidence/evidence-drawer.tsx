"use client";

import { useState } from "react";
import type { ZiweiEvidenceViewV1 } from "@lasoviet/contracts";

import {
  ziweiPresentation,
  type ZiweiPresentationLocale,
} from "../ziwei/ziwei-presentation";

type EvidenceDrawerProps = {
  chartId: string;
  evidenceId: string;
  locale: ZiweiPresentationLocale;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
};

export function EvidenceDrawer({
  chartId,
  evidenceId,
  locale,
  loadEvidence,
}: EvidenceDrawerProps) {
  const [evidence, setEvidence] = useState<ZiweiEvidenceViewV1["evidence"]>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const presentation = ziweiPresentation(locale);

  async function showEvidence() {
    setError(false);
    const result = await loadEvidence(chartId, evidenceId);
    if (!result.ok) {
      setError(true);
      return;
    }
    setEvidence(result.value.evidence);
    setOpen(true);
  }

  return (
    <>
      <button className="evidence-open" onClick={showEvidence} type="button">{presentation.chrome.evidenceOpen}</button>
      {error ? <p className="form-error" role="alert">{presentation.chrome.evidenceError}</p> : null}
      {open && evidence ? (
        <div aria-label={presentation.chrome.evidenceDialog} aria-modal="true" className="evidence-drawer" role="dialog">
          <div className="evidence-drawer-panel">
            <button aria-label={presentation.chrome.evidenceClose} className="evidence-close" onClick={() => setOpen(false)} type="button">{presentation.chrome.evidenceClose}</button>
            <p className="eyebrow">{presentation.chrome.evidenceEyebrow}</p>
            <h2>{presentation.evidence(evidence.id)}</h2>
            <dl className="evidence-detail-list">
              <dt>{presentation.chrome.interpretationBounds}</dt><dd>{evidence.interpretationBounds.join(" ")}</dd>
              <dt>{presentation.chrome.observableActions}</dt><dd>{evidence.allowedActionCategories.map(presentation.action).join(", ")}</dd>
              <dt>{presentation.chrome.factReferences}</dt><dd>{evidence.factReferences.map(presentation.fact).join("; ")}</dd>
              <dt>{presentation.chrome.limitations}</dt><dd>{evidence.limitations.map(presentation.limitation).join("; ")}</dd>
              <dt>{presentation.chrome.confidence}</dt><dd>{presentation.confidence(evidence.confidence)}</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
