"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { CANONICAL_BRANCH_IDS, getBranchDisplayName } from "../birth-profile/homepage-birth-prefill";
import { localizedPath } from "../homepage/homepage-utilities";
import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import {
  BRANCH_GLYPHS,
  BRANCH_GRID,
  PALACES,
  PALACE_SHORTCUTS,
  palaceOnBranch,
  palaceRelations,
  type PalaceId,
} from "./homepage-v3-data";

/** Chart-space centre of a branch cell, pulled toward the middle so lines sit inside the cells. */
function anchor(branchIndex: number): [number, number] {
  const [row, col] = BRANCH_GRID[CANONICAL_BRANCH_IDS[branchIndex] ?? "zi"];
  const x = (col - 0.5) * 100;
  const y = (row - 0.5) * 100;
  return [x + (200 - x) * 0.34, y + (200 - y) * 0.34];
}

export function HomepageV3Explore({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("homepage-v3.explore");
  const tp = useTranslations("homepage-v3.palaces");
  const [palaceId, setPalaceId] = useState<PalaceId>("menh");
  const chartRef = useRef<HTMLDivElement>(null);

  const selected = PALACES.find((palace) => palace.id === palaceId) ?? PALACES[0];
  const { trine, opposite } = palaceRelations(selected.branch);
  const origin = anchor(selected.branch);
  const [trineA, trineB] = [anchor(trine[0]), anchor(trine[1])];
  const oppositePoint = anchor(opposite);

  function pick(id: PalaceId, scroll = false) {
    setPalaceId(id);
    if (scroll) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      chartRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  return (
    <div className="hv3-container">
      <div className="hv3-head">
        <p className="hv3-eyebrow">{t("eyebrow")}</p>
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("lead")}</p>
      </div>

      <div className="hv3-shortcuts" role="group" aria-label={t("shortcutsLabel")}>
        {PALACE_SHORTCUTS.map((id) => (
          <button key={id} type="button" aria-pressed={palaceId === id} onClick={() => pick(id, true)}>
            {tp(`${id}.name`)}
          </button>
        ))}
        <p className="hv3-hint">{t("mobileHint")}</p>
      </div>

      <div className="hv3-explore-body">
        <div ref={chartRef} className="hv3-chart-wrap">
          <div role="group" aria-label={t("chartLabel")} className="hv3-chart">
            {CANONICAL_BRANCH_IDS.map((id, index) => {
              const palace = palaceOnBranch(index);
              const [row, col] = BRANCH_GRID[id];
              const state =
                palace.id === palaceId ? "selected" : trine.includes(index) ? "trine" : index === opposite ? "opposite" : "idle";
              const name = tp(`${palace.id}.name`);
              const branchName = getBranchDisplayName(id, locale);
              return (
                <button
                  key={id}
                  type="button"
                  className="hv3-cell"
                  data-state={state}
                  style={{ gridRow: row, gridColumn: col }}
                  aria-pressed={palace.id === palaceId}
                  aria-label={t("palaceAria", { name, branch: branchName })}
                  onClick={() => pick(palace.id)}
                >
                  <span className="hv3-cell-name">{name}</span>
                  <span className="hv3-cell-foot">
                    <span className="hv3-cell-glyph" lang="zh-Hant">{BRANCH_GLYPHS[id]}</span>
                    <span className="hv3-cell-branch">{branchName}</span>
                  </span>
                </button>
              );
            })}
            <div className="hv3-chart-core">
              <div>
                <span className="hv3-mono">{t("reading")}</span>
                <span className="hv3-core-name">{tp(`${selected.id}.name`)}</span>
              </div>
            </div>
            <svg className="hv3-chart-lines" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <line x1={origin[0]} y1={origin[1]} x2={trineA[0]} y2={trineA[1]} className="hv3-line-trine" />
              <line x1={origin[0]} y1={origin[1]} x2={trineB[0]} y2={trineB[1]} className="hv3-line-trine" />
              <line x1={trineA[0]} y1={trineA[1]} x2={trineB[0]} y2={trineB[1]} className="hv3-line-trine hv3-line-faint" />
              <line x1={origin[0]} y1={origin[1]} x2={oppositePoint[0]} y2={oppositePoint[1]} className="hv3-line-opposite" />
              <circle cx={origin[0]} cy={origin[1]} r={5} className="hv3-dot-trine" />
              <circle cx={trineA[0]} cy={trineA[1]} r={4} className="hv3-dot-trine" />
              <circle cx={trineB[0]} cy={trineB[1]} r={4} className="hv3-dot-trine" />
              <circle cx={oppositePoint[0]} cy={oppositePoint[1]} r={4} className="hv3-dot-opposite" />
            </svg>
          </div>
          <div className="hv3-legend">
            <span><i className="hv3-legend-trine" />{t("trine")}</span>
            <span><i className="hv3-legend-opposite" />{t("opposite")}</span>
          </div>
        </div>

        <div className="hv3-panel" aria-live="polite">
          <h3 className="hv3-h3-lg">{t("palacePrefix")} {tp(`${selected.id}.name`)}</h3>
          <p className="hv3-accent hv3-strong">{tp(`${selected.id}.title`)}</p>
          <p className="hv3-panel-desc">{tp(`${selected.id}.desc`)}</p>
          <div className="hv3-relations">
            <span><strong className="hv3-rel-trine">{t("trine")}:</strong> {trine.map((index) => tp(`${palaceOnBranch(index).id}.name`)).join(", ")}</span>
            <span><strong className="hv3-rel-opposite">{t("opposite")}:</strong> {tp(`${palaceOnBranch(opposite).id}.name`)}</span>
          </div>
          <p className="hv3-panel-note">{t("cycles")}</p>
          <div className="hv3-panel-actions">
            <HomepageV3GoWizard className="hv3-btn">{t("cta")}</HomepageV3GoWizard>
            <a href={localizedPath(locale, "/bao-cao-mau/tu-vi")} className="hv3-link">{t("sample")}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
