import { useTranslations } from "next-intl";

export function HomepageCapabilityMatrix() {
  const t = useTranslations("common");

  const rows = [
    { key: "row1", free: true, standard: true, comprehensive: true },
    { key: "row2", free: true, standard: true, comprehensive: true },
    { key: "row3", free: true, standard: true, comprehensive: true },
    { key: "row4", free: false, standard: true, comprehensive: true },
    { key: "row5", free: false, standard: false, comprehensive: true },
    { key: "row6", free: true, standard: true, comprehensive: true },
  ] as const;

  return (
    <div className="container capability-matrix-wrap">
      <div className="section-heading text-center">
        <p className="eyebrow">{t("home.capabilityMatrix.eyebrow")}</p>
        <h2>{t("home.capabilityMatrix.title")}</h2>
        <p className="section-lead">{t("home.capabilityMatrix.subtitle")}</p>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="matrix-table-wrap">
        <table className="capability-table">
          <thead>
            <tr>
              <th scope="col" className="matrix-col-feature">
                {t("home.capabilityMatrix.title")}
              </th>
              <th scope="col" className="matrix-col-tier">
                {t("home.capabilityMatrix.colFree")}
              </th>
              <th scope="col" className="matrix-col-tier">
                {t("home.capabilityMatrix.colStandard")}
              </th>
              <th scope="col" className="matrix-col-tier matrix-col-highlight">
                {t("home.capabilityMatrix.colComprehensive")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="matrix-feature-name">
                  {t(`home.capabilityMatrix.${row.key}.feature`)}
                </th>
                <td className="matrix-cell">
                  <span className={row.free ? "matrix-check" : "matrix-dash"} aria-label={row.free ? "Có" : "Không"}>
                    {row.free ? "✓" : "—"}
                  </span>
                </td>
                <td className="matrix-cell">
                  <span className={row.standard ? "matrix-check" : "matrix-dash"} aria-label={row.standard ? "Có" : "Không"}>
                    {row.standard ? "✓" : "—"}
                  </span>
                </td>
                <td className="matrix-cell matrix-cell-highlight">
                  <span className={row.comprehensive ? "matrix-check matrix-check-gold" : "matrix-dash"} aria-label={row.comprehensive ? "Có" : "Không"}>
                    {row.comprehensive ? "✓" : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card Rows: All 3 columns visible without horizontal scroll */}
      <div className="matrix-mobile-cards">
        {rows.map((row) => (
          <div className="matrix-mobile-card" key={`mobile-${row.key}`}>
            <h3 className="matrix-mobile-feature">
              {t(`home.capabilityMatrix.${row.key}.feature`)}
            </h3>
            <div className="matrix-mobile-tiers">
              <div className={`matrix-badge-item ${row.free ? "matrix-badge-active" : "matrix-badge-inactive"}`}>
                <span className="matrix-badge-label">{t("home.capabilityMatrix.colFree")}</span>
                <span className="matrix-badge-mark">{row.free ? "✓" : "—"}</span>
              </div>
              <div className={`matrix-badge-item ${row.standard ? "matrix-badge-active" : "matrix-badge-inactive"}`}>
                <span className="matrix-badge-label">{t("home.capabilityMatrix.colStandard")}</span>
                <span className="matrix-badge-mark">{row.standard ? "✓" : "—"}</span>
              </div>
              <div className={`matrix-badge-item matrix-badge-highlight ${row.comprehensive ? "matrix-badge-active" : "matrix-badge-inactive"}`}>
                <span className="matrix-badge-label">{t("home.capabilityMatrix.colComprehensive")}</span>
                <span className="matrix-badge-mark">{row.comprehensive ? "✓" : "—"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
