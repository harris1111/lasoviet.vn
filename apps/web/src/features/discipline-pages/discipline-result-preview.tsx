import React from "react";
import { AstrologyResultPreview } from "./astrology-result-preview";
import { BaziResultPreview } from "./bazi-result-preview";
import { IchingResultPreview } from "./iching-result-preview";
import { NumerologyResultPreview } from "./numerology-result-preview";
import type { DisciplineKey, PreviewData } from "./discipline-page-model";

export type DisciplineResultPreviewProps<T = unknown> = {
  preview: PreviewData<T>;
  disciplineKey: DisciplineKey;
  locale: "vi" | "en";
  className?: string;
  children?: React.ReactNode;
};

export function DisciplineResultPreview<T = unknown>({
  preview,
  disciplineKey,
  locale,
  className,
  children,
}: DisciplineResultPreviewProps<T>) {
  const isIllustrative = preview.sourceKind === "illustrative";

  const previewContent =
    children ??
    (() => {
      switch (disciplineKey) {
        case "bat-tu":
          return <BaziResultPreview locale={locale} />;
        case "kinh-dich":
          return <IchingResultPreview locale={locale} />;
        case "chiem-tinh":
          return <AstrologyResultPreview locale={locale} />;
        case "than-so-hoc":
          return <NumerologyResultPreview locale={locale} />;
        default: {
          const fallbackKey: string = disciplineKey;
          return (
            <div className="discipline-preview-placeholder">
              <span className="discipline-trust-num">
                {fallbackKey.toUpperCase()}
              </span>
              <p className="discipline-trust-body">
                {isIllustrative
                  ? locale === "vi"
                    ? "Hồ sơ minh hoạ phương pháp đang sẵn sàng cho bộ môn này."
                    : "Methodology preview profile active for this discipline."
                  : locale === "vi"
                    ? "Dữ liệu tính toán trực tiếp từ hệ thống."
                    : "Live calculated results from backend engine."}
              </p>
            </div>
          );
        }
      }
    })();

  return (
    <div
      className={["discipline-result-frame", className].filter(Boolean).join(" ")}
      data-discipline={disciplineKey}
      data-source-kind={preview.sourceKind}
    >
      {isIllustrative ? (
        <div
          className="discipline-disclosure-badge"
          data-source-kind="illustrative"
          role="note"
        >
          <span aria-hidden="true">● </span>
          <span>{preview.disclosure}</span>
        </div>
      ) : (
        <div
          className="discipline-backend-provenance"
          data-source-kind="backend"
          role="status"
        >
          <span>{preview.provenance}</span>
        </div>
      )}
      {previewContent}
    </div>
  );
}
