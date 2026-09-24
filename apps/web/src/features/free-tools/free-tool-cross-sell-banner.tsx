"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { sendBrowserAnalyticsEvent } from "../../analytics/browser-analytics";

export type FreeToolCrossSellKey =
  | "good-days"
  | "zodiac"
  | "lunar-calendar"
  | "dream-symbols"
  | "tarot"
  | "feng-shui"
  | "palmistry";

export type FreeToolCrossSellBannerProps = {
  tool: FreeToolCrossSellKey | (string & {});
  locale: "vi" | "en";
  className?: string;
  customFromSlug?: string;
  customQuestion?: string;
  customExplanation?: string;
  customCta?: string;
};

type ToolMeta = {
  i18nKey: "goodDays" | "zodiac" | "lunarCalendar" | "dreamSymbols" | "tarot" | "fengShui" | "palmistry";
  fromSlug: string;
};

const TOOL_META_MAP: Record<string, ToolMeta> = {
  "good-days": { i18nKey: "goodDays", fromSlug: "xem-ngay" },
  "xem-ngay": { i18nKey: "goodDays", fromSlug: "xem-ngay" },
  "zodiac": { i18nKey: "zodiac", fromSlug: "12-con-giap" },
  "12-con-giap": { i18nKey: "zodiac", fromSlug: "12-con-giap" },
  "lunar-calendar": { i18nKey: "lunarCalendar", fromSlug: "lich-am" },
  "lich-am": { i18nKey: "lunarCalendar", fromSlug: "lich-am" },
  "dream-symbols": { i18nKey: "dreamSymbols", fromSlug: "giai-mong" },
  "giai-mong": { i18nKey: "dreamSymbols", fromSlug: "giai-mong" },
  "tarot": { i18nKey: "tarot", fromSlug: "tarot" },
  "feng-shui": { i18nKey: "fengShui", fromSlug: "phong-thuy" },
  "huong-nha": { i18nKey: "fengShui", fromSlug: "phong-thuy" },
  "phong-thuy": { i18nKey: "fengShui", fromSlug: "phong-thuy" },
  "palmistry": { i18nKey: "palmistry", fromSlug: "xem-chi-tay" },
  "xem-chi-tay": { i18nKey: "palmistry", fromSlug: "xem-chi-tay" },
};

export function FreeToolCrossSellBanner({
  tool,
  locale,
  className = "",
  customFromSlug,
  customQuestion,
  customExplanation,
  customCta,
}: FreeToolCrossSellBannerProps) {
  const t = useTranslations("common.freeToolsCrossSell");
  const meta = TOOL_META_MAP[tool] ?? { i18nKey: "goodDays", fromSlug: "xem-ngay" };
  const fromSlug = customFromSlug ?? meta.fromSlug;
  const i18nKey = meta.i18nKey;

  const eyebrow = t(`${i18nKey}.eyebrow`);
  const question = customQuestion ?? t(`${i18nKey}.question`);
  const explanation = customExplanation ?? t(`${i18nKey}.explanation`);
  const cta = customCta ?? t(`${i18nKey}.cta`);

  const href = locale === "en"
    ? `/en/tao-la-so/tu-vi?from=${encodeURIComponent(fromSlug)}`
    : `/tao-la-so/tu-vi?from=${encodeURIComponent(fromSlug)}`;

  const handleClick = () => {
    void sendBrowserAnalyticsEvent("wizard_start", {
      locale,
      entry_point: `free_tool_${fromSlug}`,
      step: "entry",
    });
  };

  return (
    <aside
      aria-label={eyebrow}
      className={`tool-cross-sell-banner ${className}`.trim()}
      data-testid="free-tool-cross-sell-banner"
      data-tool={tool}
      data-from={fromSlug}
    >
      <div className="tool-cross-sell-content">
        <div className="tool-cross-sell-eyebrow">
          <span aria-hidden="true">✦</span>
          <span>{eyebrow}</span>
        </div>
        <h3 className="tool-cross-sell-title">{question}</h3>
        <p className="tool-cross-sell-explanation">{explanation}</p>
      </div>

      <div className="tool-cross-sell-actions">
        <Link
          className="tool-cross-sell-pill"
          href={href}
          onClick={handleClick}
          data-testid="free-tool-cross-sell-cta"
        >
          <span>{cta}</span>
          <span aria-hidden="true" style={{ fontSize: "16px", lineHeight: 1 }}>→</span>
        </Link>
      </div>

      <svg
        aria-hidden="true"
        className="tool-cross-sell-illustration"
        fill="none"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" />
        <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="54" stroke="currentColor" strokeDasharray="2 4" strokeWidth="1" />
        <circle cx="100" cy="100" r="28" stroke="currentColor" strokeWidth="1.5" />
        <line stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" x1="100" x2="100" y1="6" y2="194" />
        <line stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" x1="6" x2="194" y1="100" y2="100" />
        <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.5" strokeWidth="0.75" x1="34" x2="166" y1="34" y2="166" />
        <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.5" strokeWidth="0.75" x1="34" x2="166" y1="166" y2="34" />
        <polygon fill="currentColor" points="100,16 104,26 100,24 96,26" />
        <polygon fill="currentColor" points="100,184 104,174 100,176 96,174" />
        <polygon fill="currentColor" points="16,100 26,104 24,100 26,96" />
        <polygon fill="currentColor" points="184,100 174,104 176,100 174,96" />
      </svg>
    </aside>
  );
}
