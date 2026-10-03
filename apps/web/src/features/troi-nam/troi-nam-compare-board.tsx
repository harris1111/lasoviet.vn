"use client";

import { useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";

import { LsvIcon } from "../../components/lsv-icon";
import { COMPARE_ROW_IDS } from "../homepage-v3/homepage-v3-data";
import { HomepageV3GoWizard } from "../homepage-v3/homepage-v3-go-wizard";

const COLUMNS = ["lsv", "web", "ai", "thay"] as const;
const OTHER_COLUMNS = ["web", "ai", "thay"] as const;
const COLUMN_TITLE = { lsv: "colLsv", web: "colWeb", ai: "colAi", thay: "colThay" } as const;
const TAB_TITLE = { lsv: "tabLsv", web: "tabWeb", ai: "tabAi", thay: "tabThay" } as const;
const ROW_ICON = {
  strength: "effect-focus",
  own: "birth-details",
  basis: "evidence-link",
  links: "related-palaces",
  return: "archive",
  depth: "la-balance",
} as const;
const PROOF = {
  vi: ["Đọc trên chính lá số", "Thấy quan hệ giữa các cung", "Chọn phần muốn đọc sâu"],
  en: ["Read your own chart", "See palace relationships", "Choose what to explore deeper"],
} as const;
const PROOF_ICON = ["chart-palaces", "related-palaces", "reading-depth"] as const;

/**
 * Comparison board for the Trời Nam homepage. Same copy and row ids as the shared
 * `HomepageV3Compare`; what changes is the reading order: Lá Số Việt is a framed, tinted
 * column with a check on every row, the other ways are muted and clamped to two lines (one
 * button opens them in full), and each criterion carries an icon. Phones keep the tab-and-card
 * layout so the three alternatives are never squeezed into a 340px table.
 */
export function TroiNamCompareBoard({ title, lead, sub }: { title: string; lead: string; sub: string }) {
  const t = useTranslations("homepage-v3.compare");
  const locale = useLocale() === "en" ? "en" : "vi";
  const [open, setOpen] = useState(false);
  const [strengthRow] = COMPARE_ROW_IDS;

  return (
    <div className="hv3-container tnc">
      <div className="tnc-head">
        <h2 className="hv3-h2">{title}</h2>
        <p className="hv3-lead">{lead}</p>
        <ul className="tnc-proof">
          {PROOF[locale].map((point, index) => (
            <li key={point} data-reveal="" style={{ "--i": index } as CSSProperties}>
              <LsvIcon name={PROOF_ICON[index] ?? "chart-palaces"} size={40} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="tnc-sub">{sub}</h3>

      <div className="tnc-board" data-open={open} data-reveal="">
        <table className="tnc-table">
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
                <th scope="row">
                  <span className="tnc-axis">
                    <LsvIcon name={ROW_ICON[id]} size={26} />
                    {t(`rows.${id}.k`)}
                  </span>
                </th>
                {COLUMNS.map((column) => (
                  <td key={column} data-col={column}>
                    <span className="tnc-cell">
                      <span
                        aria-hidden="true"
                        className="tnc-mark"
                        data-kind={column === "lsv" ? "yes" : id === strengthRow ? "star" : "no"}
                      >
                        {column === "lsv" ? "✓" : id === strengthRow ? "✦" : "×"}
                      </span>
                      <span className="tnc-text">{t(`rows.${id}.${column}`)}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td data-col="lsv">
                <HomepageV3GoWizard className="hv3-btn tnc-cta">{t("ctaDesktop")}</HomepageV3GoWizard>
              </td>
              <td colSpan={3} className="tnc-foot-note">
                <button type="button" className="tnc-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                  {open ? t("collapse") : t("expand")}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="tnc-mobile">
          {COMPARE_ROW_IDS.map((id) => (
            <section key={id} className="tnc-m-row" aria-label={t(`rows.${id}.k`)}>
              <h3 className="tnc-m-axis">
                <LsvIcon name={ROW_ICON[id]} size={26} />
                {t(`rows.${id}.k`)}
              </h3>
              <p className="tnc-m-lsv">
                <span aria-hidden="true" className="tnc-mark" data-kind="yes">✓</span>
                <span>
                  <span className="tnc-m-name">{t("tabLsv")}</span>
                  {t(`rows.${id}.lsv`)}
                </span>
              </p>
              <ul className="tnc-m-others">
                {OTHER_COLUMNS.map((column) => (
                  <li key={column}>
                    <span className="tnc-m-name">{t(TAB_TITLE[column])}</span>
                    <span>{t(`rows.${id}.${column}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <HomepageV3GoWizard className="hv3-btn tnc-cta">{t("cta")}</HomepageV3GoWizard>
        </div>
      </div>
    </div>
  );
}
