"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { LsvIcon } from "../../components/lsv-icon";
import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { COMPARE_ROW_IDS } from "./homepage-v3-data";

const COLUMNS = ["lsv", "web", "ai", "thay"] as const;
type Column = (typeof COLUMNS)[number];
const COLUMN_TITLE = { lsv: "colLsv", web: "colWeb", ai: "colAi", thay: "colThay" } as const;
const TAB_TITLE = { lsv: "tabLsv", web: "tabWeb", ai: "tabAi", thay: "tabThay" } as const;

/**
 * One strength and five limits per way of finding an answer; the first row is the strength.
 * `lead` and `defaultOpen` are optional so the live homepage keeps its current copy and
 * collapsed-by-default table; Trời Nam passes a shorter lead and opens the table directly.
 */
export function HomepageV3Compare({ lead, defaultOpen = false, alwaysVisible = false }: { lead?: string; defaultOpen?: boolean; alwaysVisible?: boolean } = {}) {
  const t = useTranslations("homepage-v3.compare");
  const locale = useLocale();
  const [active, setActive] = useState<Column>("lsv");
  const [strengthRow, ...limitRows] = COMPARE_ROW_IDS;

  const Evidence = alwaysVisible ? "div" : "details";

  return (
    <div className="hv3-container">
      <div className="hv3-compare-head">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{lead ?? t("lead")}</p>
      </div>

      <div className="hv3-compare-points" aria-label={locale === "vi" ? "Ba điểm để đối chiếu" : "Three ways to compare"}>
        {(locale === "vi"
          ? ["Đọc trên chính lá số", "Thấy quan hệ giữa các cung", "Chọn phần muốn đọc sâu"]
          : ["Read your own chart", "See palace relationships", "Choose what to explore deeper"]
        ).map((point, index) => <span key={point}><LsvIcon name={(["chart-palaces", "related-palaces", "reading-depth"] as const)[index] ?? "chart-palaces"} size={40} />{point}</span>)}
      </div>

      <Evidence className="hv3-compare-details" {...(alwaysVisible ? {} : { open: defaultOpen })}>
        {!alwaysVisible ? <summary>{locale === "vi" ? "Xem bảng so sánh đầy đủ" : "View the full comparison"}</summary> : null}

      <table className="hv3-compare-table" role="table">
        <caption className="hv3-sr">{t("tableLabel")}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <td role="cell" />
            {COLUMNS.map((column) => (
              <th key={column} role="columnheader" scope="col" data-col={column}>{t(COLUMN_TITLE[column])}</th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {COMPARE_ROW_IDS.map((id) => (
            <tr key={id} role="row">
              <th role="rowheader" scope="row">{t(`rows.${id}.k`)}</th>
              {COLUMNS.map((column) => (
                <td key={column} role="cell" data-col={column}>
                  <span aria-hidden="true" className="hv3-cmp-mark" data-strength={id === strengthRow} data-lsv={column === "lsv"}>
                    {column === "lsv" ? "✓" : id === strengthRow ? "✦" : "−"}
                  </span>
                  {t(`rows.${id}.${column}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot role="rowgroup">
          <tr role="row">
            <td role="cell" />
            <td role="cell" data-col="lsv"><HomepageV3GoWizard className="hv3-link">{t("ctaDesktop")}</HomepageV3GoWizard></td>
            <td role="cell" /><td role="cell" /><td role="cell" />
          </tr>
        </tfoot>
      </table>

      <div className="hv3-compare-mobile">
        <div role="group" aria-label={t("groupLabel")} className="hv3-tabs">
          {COLUMNS.map((column) => (
            <button key={column} type="button" aria-pressed={active === column} onClick={() => setActive(column)}>
              {t(TAB_TITLE[column])}
            </button>
          ))}
        </div>
        <div aria-live="polite" className="hv3-cmp-cards">
          <div className="hv3-cmp-card hv3-cmp-top" data-col={active}>
            <p className="hv3-cmp-card-title">{t("cardTitle", { name: t(TAB_TITLE[active]) })}</p>
            <p>{t(`rows.${strengthRow}.${active}`)}</p>
          </div>
          {limitRows.map((id) => (
            <div key={id} className="hv3-cmp-card">
              <p className="hv3-cmp-axis">{t(`rows.${id}.k`)}</p>
              <p className="hv3-cmp-value">{t(`rows.${id}.${active}`)}</p>
              {active !== "lsv" ? (
                <p className="hv3-cmp-fix"><strong>{t("fixLabel")} </strong>{t(`rows.${id}.lsv`)}</p>
              ) : null}
            </div>
          ))}
        </div>
        <HomepageV3GoWizard className="hv3-link">{t("cta")}</HomepageV3GoWizard>
      </div>
      </Evidence>
    </div>
  );
}
