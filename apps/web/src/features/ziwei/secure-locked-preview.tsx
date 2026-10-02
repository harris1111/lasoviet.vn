"use client";

import React from "react";
import Link from "next/link";

export type SecureLockedPreviewProps = {
  title: string;
  badge?: string;
  tagline?: string;
  clippedSentences?: string[];
  counts?: {
    points?: number;
    evidenceItems?: number;
    approximateWords?: number;
  };
  lengthHint?: number;
  priceLa?: number;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  isGuest?: boolean;
  signInHref?: string;
  locale?: "vi" | "en";
};

export function SecureLockedPreview({
  title,
  badge,
  tagline,
  clippedSentences = [],
  counts,
  lengthHint = 4,
  priceLa,
  actionLabel,
  actionHref,
  onAction,
  isGuest,
  signInHref,
  locale = "vi",
}: SecureLockedPreviewProps) {
  const barsCount = Math.max(2, Math.min(8, lengthHint));
  const defaultBadge = badge ?? (locale === "vi" ? "Chưa mở" : "Locked");

  // Determine button label and target
  let finalActionLabel = actionLabel;
  let finalHref = actionHref;

  if (!finalActionLabel) {
    if (isGuest && signInHref) {
      finalActionLabel = locale === "vi" ? "Lưu lá số để mở" : "Save chart to reveal";
      finalHref = signInHref;
    } else if (priceLa) {
      finalActionLabel = locale === "vi" ? "Mở – " + priceLa + " Lá" : "Unlock – " + priceLa + " Lá";
    } else {
      finalActionLabel = locale === "vi" ? "Xem chi tiết" : "View details";
    }
  }

  // Compose counts text safely
  const countParts: string[] = [];
  if (counts?.approximateWords) {
    countParts.push(locale === "vi" ? "Khoảng " + counts.approximateWords + " từ" : "~" + counts.approximateWords + " words");
  }
  if (counts?.points) {
    countParts.push(locale === "vi" ? counts.points + " điểm luận giải" : counts.points + " key aspects");
  }
  if (counts?.evidenceItems) {
    countParts.push(locale === "vi" ? counts.evidenceItems + " căn cứ lá số" : counts.evidenceItems + " chart factors");
  }

  return (
    <div className="secure-locked-preview-card" data-locked="true">
      <div className="locked-preview-header">
        <span className="locked-preview-badge">{defaultBadge}</span>
        {tagline ? <span className="locked-preview-tagline">{tagline}</span> : null}
      </div>

      <h4 className="locked-preview-title">{title}</h4>

      {clippedSentences.length > 0 ? (
        <div className="locked-preview-clipped">
          {clippedSentences.map((sentence, idx) => (
            <p className="locked-clipped-sentence" key={idx}>
              {sentence}
            </p>
          ))}
        </div>
      ) : null}

      {/* Pure client-side placeholder bars: ZERO text content inside, aria-hidden, hidden in print */}
      <div
        aria-hidden="true"
        className="locked-preview-blur-bars"
        data-bars-count={barsCount}
      >
        {Array.from({ length: barsCount }).map((_, idx) => (
          <div
            className={"blur-bar blur-bar-" + ((idx % 4) + 1)}
            key={idx}
            style={{ width: (88 - (idx % 3) * 12) + "%" }}
          />
        ))}
      </div>

      <div className="locked-preview-footer">
        {countParts.length > 0 ? (
          <span className="locked-preview-counts">
            {countParts.join(" · ")}
          </span>
        ) : <span />}

        <div className="locked-preview-actions">
          {finalHref ? (
            <Link className="button button-small button-pill locked-action-btn" href={finalHref}>
              {finalActionLabel}
            </Link>
          ) : onAction ? (
            <button
              className="button button-small button-pill locked-action-btn"
              onClick={onAction}
              type="button"
            >
              {finalActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
