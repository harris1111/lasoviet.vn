"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";

import { BRANCH_METADATA, CANONICAL_BRANCH_IDS, getBranchDisplayName } from "../birth-profile/homepage-birth-prefill";
import { HeroCenterLogo } from "./hero-logo/HeroCenterLogo";
import { BRANCH_GRID } from "./homepage-v3-data";
import type { HeroStage } from "./homepage-v3-hero-stage";

type Locale = "en" | "vi";

/** Cell origin (x, y) and label centre (x, y) on the 400-unit chart, per row/column. */
const CELL_ORIGIN: readonly number[] = [13, 106, 200, 294];
const LABEL_X: readonly number[] = [59, 153, 247, 341];
const LABEL_Y: readonly number[] = [48, 142, 236, 330];
const pick = (list: readonly number[], index: number) => list[index] ?? 0;

const CELLS = CANONICAL_BRANCH_IDS.map((id) => {
  const [row, col] = BRANCH_GRID[id];
  const r = row - 1;
  const c = col - 1;
  return {
    id,
    label: BRANCH_METADATA[id].viName.toUpperCase(),
    x: pick(CELL_ORIGIN, c) + 3,
    y: pick(CELL_ORIGIN, r) + 3,
    left: `${pick(LABEL_X, c) / 4}%`,
    top: `${(pick(LABEL_Y, r) + 8) / 4}%`,
  };
});

const pad2 = (value: string) => value.padStart(2, "0");

/**
 * The painted chart next to the birth form. Everything here is decoration driven by `hero`,
 * which is derived from the same form values the submit handler validates.
 */
export function HomepageV3HeroChart({ hero, locale }: { hero: HeroStage; locale: Locale }) {
  const t = useTranslations("homepage-v3.heroChart");
  const [open, setOpen] = useState(false);
  // Transitions stay off until the first paint, so a restored draft lands on its stage without replaying it.
  const [live, setLive] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLive(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const { date, time, stage, branchIndex, name } = hero;
  let dateLine = "";
  if (date) {
    dateLine = `${pad2(date.day)} · ${pad2(date.month)} · ${date.year}`;
    if (date.calendarType === "lunar") dateLine += ` ${date.isLeapMonth ? t("lunarLeap") : t("lunar")}`;
    if (time?.kind === "exact") dateLine += ` · ${pad2(time.hour)}:${pad2(time.minute)}`;
    if (time?.kind === "branch") {
      dateLine += ` · ${t("hourOf", { name: getBranchDisplayName(CANONICAL_BRANCH_IDS[time.index] ?? "zi", locale) })}`;
    }
  }

  return (
    <div
      className="hv3-chart"
      data-stage={stage}
      data-live={live}
      data-open={open}
      data-dated={Boolean(date)}
      style={{ "--hc-branch": branchIndex ?? -1 } as CSSProperties}
    >
      <div className="hv3-chart-paint" aria-hidden="true">
        <div className="hv3-chart-dim" />
        <div className="hv3-chart-reveal" />
        <div className="hv3-chart-fade" />
      </div>

      <div className="hv3-chart-face">
        <svg viewBox="0 0 400 400" role="img" aria-label={t("chartAria")} className="hv3-chart-svg">
          <defs>
            <linearGradient id="hv3-chart-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--hc-ln-a)", stopOpacity: 0.32 }} />
              <stop offset="0.42" style={{ stopColor: "var(--hc-ln-b)", stopOpacity: 0.66 }} />
              <stop offset="1" style={{ stopColor: "var(--hc-ln-a)", stopOpacity: 0.28 }} />
            </linearGradient>
            <radialGradient id="hv3-chart-inner">
              <stop offset="0" style={{ stopColor: "var(--hc-inner)", stopOpacity: 0.5 }} />
              <stop offset="1" style={{ stopColor: "var(--hc-inner)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          {CELLS.map((cell, index) => (
            <rect key={cell.id} x={cell.x} y={cell.y} width="88" height="88" rx="2" className="hv3-chart-cell" data-on={branchIndex === index} />
          ))}
          <g fill="none" stroke="url(#hv3-chart-line)" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16 C70 14 105 15 199 15 S336 16 387 14 L386 388 C325 387 239 389 199 387 S75 386 13 387 Z" strokeWidth="1.1" />
            <path className="hv3-chart-grid" d="M106 15 L106 105 M106 295 L106 387 M200 15 L200 105 M200 295 L200 387 M294 15 L294 105 M294 295 L294 387 M13 106 L106 106 M294 106 L386 106 M13 200 L106 200 M294 200 L386 200 M13 294 L106 294 M294 294 L386 294" strokeWidth="0.8" />
            <path d="M106 106 H294 V294 H106 Z" strokeWidth="0.8" />
            <path d="M135 135 C183 133 217 133 265 135 L265 265 C215 267 181 266 135 265 Z" strokeWidth="0.65" strokeDasharray="92 7 6 8 24 8" opacity="0.52" />
            <path d="M35 19 h39 M16 34 v32 M327 17 h40 M387 324 v38 M35 387 h27" strokeWidth="2.2" opacity="0.78" />
          </g>
          <ellipse cx="200" cy="200" rx="85" ry="77" fill="url(#hv3-chart-inner)" />
        </svg>
        {CELLS.map((cell, index) => (
          <span key={cell.id} aria-hidden="true" className="hv3-chart-label" data-on={branchIndex === index} style={{ left: cell.left, top: cell.top }}>
            <span className="hv3-chart-branch">{cell.label}</span>
            <span className="hv3-chart-hour">{t("birthHour")}</span>
          </span>
        ))}
        <div className="hv3-chart-center" aria-hidden="true">
          <HeroCenterLogo dateValid={hero.dateValid} timeValid={hero.timeValid} genderSelected={hero.genderSelected} />
          <span className="hv3-chart-date">{dateLine}</span>
          <span className="hv3-chart-name">{name}</span>
        </div>
      </div>

      <div className="hv3-chart-side" aria-hidden="true">
        <span className="hv3-chart-date">{dateLine}</span>
        <span className="hv3-chart-name">{name}</span>
      </div>

      <button type="button" className="hv3-chart-toggle" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {open ? t("close") : t("open")}
      </button>
    </div>
  );
}
