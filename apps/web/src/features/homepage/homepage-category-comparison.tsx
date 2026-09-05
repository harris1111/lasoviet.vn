import { useTranslations } from "next-intl";

export function HomepageCategoryComparison() {
  const t = useTranslations("common");
  const rows = ["row1", "row2", "row3", "row4", "row5", "row6"] as const;

  return (
    <div className="container category-comparison-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.categoryComparison.eyebrow")}</p>
        <h2>{t("home.categoryComparison.title")}</h2>
      </div>
      <div className="table-responsive">
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">{t("home.categoryComparison.criteria")}</th>
              <th scope="col">{t("home.categoryComparison.currentWeb")}</th>
              <th scope="col">{t("home.categoryComparison.traditional")}</th>
              <th scope="col" className="col-lasoviet">{t("home.categoryComparison.lasoviet")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rowKey) => (
              <tr key={rowKey}>
                <th scope="row" className="row-criterion">{t(`home.categoryComparison.${rowKey}.criterion`)}</th>
                <td className="col-muted">{t(`home.categoryComparison.${rowKey}.currentWeb`)}</td>
                <td className="col-muted">{t(`home.categoryComparison.${rowKey}.traditional`)}</td>
                <td className="col-highlight">{t(`home.categoryComparison.${rowKey}.lasoviet`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
