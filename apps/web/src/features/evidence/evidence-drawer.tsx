"use client";

import { useState } from "react";
import type { ZiweiEvidenceViewV1 } from "@lasoviet/contracts";

type EvidenceDrawerProps = {
  chartId: string;
  evidenceId: string;
  loadEvidence(chartId: string, evidenceId: string): Promise<
    | { ok: true; value: ZiweiEvidenceViewV1 }
    | { ok: false; error: { code: string } }
  >;
};

function readable(value: string) {
  return value.replaceAll(".", " / ").replaceAll("_", " ");
}

export function EvidenceDrawer({ chartId, evidenceId, loadEvidence }: EvidenceDrawerProps) {
  const [evidence, setEvidence] = useState<ZiweiEvidenceViewV1["evidence"]>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

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
      <button className="evidence-open" onClick={showEvidence} type="button">Xem căn cứ</button>
      {error ? <p className="form-error" role="alert">Không thể mở căn cứ lúc này.</p> : null}
      {open && evidence ? (
        <div aria-label="Căn cứ luận giải" aria-modal="true" className="evidence-drawer" role="dialog">
          <div className="evidence-drawer-panel">
            <button aria-label="Đóng căn cứ" className="evidence-close" onClick={() => setOpen(false)} type="button">Đóng</button>
            <p className="eyebrow">Căn cứ luận giải</p>
            <h2>{readable(evidence.id)}</h2>
            <dl className="evidence-detail-list">
              <dt>Nhận định</dt><dd>Tín hiệu phản chiếu bản mệnh, không phải kết luận tất định.</dd>
              <dt>Điều kiện</dt><dd>{evidence.interpretationBounds.join(" ")}</dd>
              <dt>Điều có thể quan sát</dt><dd>{evidence.allowedActionCategories.map(readable).join(", ")}</dd>
              <dt>Căn cứ</dt><dd>{evidence.factReferences.map(readable).join("; ")}</dd>
              <dt>Giới hạn</dt><dd>{evidence.limitations.map(readable).join("; ")}</dd>
              <dt>Độ tin cậy</dt><dd>{evidence.confidence}</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
