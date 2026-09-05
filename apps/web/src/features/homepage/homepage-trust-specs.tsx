import { useTranslations } from "next-intl";

export function HomepageTrustSpecs() {
  const t = useTranslations("common");
  const specs = ["spec1", "spec2", "spec3", "spec4", "spec5"] as const;

  return (
    <div className="container trust-specs-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.trustSpecs.eyebrow")}</p>
        <h2>{t("home.trustSpecs.title")}</h2>
      </div>
      <div className="specs-list">
        {specs.map((key) => (
          <article className="spec-item" key={key}>
            <h3>{t(`home.trustSpecs.${key}.title`)}</h3>
            <p>{t(`home.trustSpecs.${key}.copy`)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
