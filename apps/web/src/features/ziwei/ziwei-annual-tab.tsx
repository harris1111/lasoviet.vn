"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ZiweiHoroscopeResultV1 } from "@lasoviet/contracts";

import type { ZiweiPresentationLocale } from "./ziwei-presentation";

export type ZiweiAnnualTabProps = {
  chartId: string;
  horoscope: ZiweiHoroscopeResultV1;
  locale: ZiweiPresentationLocale;
  onSelectToanDien?: () => void;
};

export function ZiweiAnnualTab({
  chartId,
  horoscope,
  locale,
  onSelectToanDien,
}: ZiweiAnnualTabProps) {
  const t = useTranslations("ziwei");
  const { yearly, daily } = horoscope;

  const chooseOfferUrl =
    locale === "en"
      ? `/en/la-so/${encodeURIComponent(chartId)}/chon-luan-giai`
      : `/la-so/${encodeURIComponent(chartId)}/chon-luan-giai`;

  return (
    <div className="annual-tab-content card">
      {/* 1. Year Head */}
      <div className="year-head">
        <span className="year-num">{yearly.targetYear}</span>
        <div>
          <h2 className="panel-title" style={{ margin: 0 }}>
            {t("annual.title", { lunarYear: yearly.lunarYear })}
          </h2>
          <p className="panel-sub" style={{ margin: "4px 0 0" }}>
            {t("annual.sub", {
              age: yearly.lunarAge,
              palace: yearly.annualPalaceName,
            })}
          </p>
        </div>
      </div>

      {/* 2. Summary */}
      <p className="year-summary-line" style={{ fontSize: "17px", margin: "0 0 14px" }}>
        {yearly.summary}
      </p>

      {/* 3. Months Grid (12 lunar months) */}
      <div className="months" id="months">
        {yearly.months.map((m) => {
          const cls =
            m.marker === "warn"
              ? "month warn"
              : m.marker === "good"
              ? "month good"
              : "month";

          return (
            <div
              aria-label={m.label}
              className={cls}
              key={m.monthIndex}
              tabIndex={0}
            >
              <small>{t("annual.monthPrefix")}</small>
              <b>{m.monthNumberDisplay}</b>
              <span className="dot" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {/* 4. Legend */}
      <div className="yr-legend">
        <span>
          <i style={{ background: "var(--son)" }} />
          {t("annual.legendWarn")}
        </span>
        <span>
          <i style={{ background: "#4F7A68" }} />
          {t("annual.legendGood")}
        </span>
        <span>
          <i style={{ background: "var(--border-soft)" }} />
          {t("annual.legendNeutral")}
        </span>
      </div>

      {/* 5. Offer Alert Card (Toàn diện CTA) */}
      <div className="card offer alert annual-offer-card" style={{ boxShadow: "none" }}>
        <div className="top">
          <h3>{t("annual.offerTitle")}</h3>
          <span className="tag tag-seal">{t("annual.offerTag")}</span>
        </div>
        <p>{t("annual.offerDesc")}</p>
        <div className="annual-offer-actions">
          {onSelectToanDien ? (
            <button
              className="btn btn-seal button-full"
              onClick={onSelectToanDien}
              type="button"
            >
              {t("annual.offerCta")}
            </button>
          ) : (
            <Link className="btn btn-seal button-full" href={chooseOfferUrl}>
              {t("annual.offerCta")}
            </Link>
          )}
        </div>
      </div>

      {/* 6. Today's forecast card ("Hôm nay của bạn") */}
      <div className="decade today-forecast-card" style={{ marginTop: "20px" }}>
        <span className="medallion" aria-hidden="true">
          <svg
            style={{ width: "24px", height: "24px", color: "var(--gold-500)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </span>
        <div>
          <b style={{ color: "var(--text-heading)" }}>{t("annual.todayTitle")}</b>
          <br />
          <span style={{ fontSize: "15px" }}>{daily.headline}</span>
        </div>
      </div>
    </div>
  );
}
