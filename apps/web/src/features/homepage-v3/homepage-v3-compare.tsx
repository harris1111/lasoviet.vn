"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { HomepageV3GoWizard } from "./homepage-v3-go-wizard";
import { COMPARE_ROW_IDS } from "./homepage-v3-data";

const COLUMNS = ["lsv", "web", "ai", "thay"] as const;
const COLUMN_TITLE = { lsv: "colLsv", web: "colWeb", ai: "colAi", thay: "colThay" } as const;

export function HomepageV3Compare() {
  const t = useTranslations("homepage-v3.compare");
  const [active, setActive] = useState(0);
  const activeRow = COMPARE_ROW_IDS[active];

  return (
    <div className="hv3-container">
      <div className="hv3-head">
        <h2 className="hv3-h2">{t("title")}</h2>
        <p className="hv3-lead">{t("lead")}</p>
      </div>

      <table className="hv3-compare-table">
        <caption className="hv3-sr">{t("tableLabel")}</caption>
        <thead>
          <tr>
            <td />
            {COLUMNS.map((column) => (
              <th key={column} scope="col" data-col={column}>{t(COLUMN_TITLE[column])}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROW_IDS.map((id) => (
            <tr key={id}>
              <th scope="row">{t(`rows.${id}.k`)}</th>
              {COLUMNS.map((column) => (
                <td key={column} data-col={column}>{t(`rows.${id}.${column}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td data-col="lsv"><HomepageV3GoWizard className="hv3-link">{t("cta")}</HomepageV3GoWizard></td>
            <td /><td /><td />
          </tr>
        </tfoot>
      </table>

      <div className="hv3-compare-mobile">
        <div role="tablist" aria-label={t("tabsLabel")} className="hv3-tabs">
          {COMPARE_ROW_IDS.map((id, index) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`hv3-cmp-tab-${id}`}
              aria-selected={active === index}
              aria-controls="hv3-cmp-panel"
              onClick={() => setActive(index)}
            >
              {t(`rows.${id}.k`)}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="hv3-cmp-panel" aria-labelledby={`hv3-cmp-tab-${activeRow}`} className="hv3-cmp-cards">
          {COLUMNS.map((column) => (
            <div key={column} className="hv3-cmp-card" data-col={column}>
              <p className="hv3-cmp-card-title">{t(COLUMN_TITLE[column])}</p>
              <p>{t(`rows.${activeRow}.${column}`)}</p>
            </div>
          ))}
        </div>
        <HomepageV3GoWizard className="hv3-link">{t("cta")}</HomepageV3GoWizard>
      </div>
    </div>
  );
}
