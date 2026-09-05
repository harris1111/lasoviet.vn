import { useTranslations } from "next-intl";

export function HomepageMethod() {
  const t = useTranslations("common");
  const pillars = ["pillar1", "pillar2", "pillar3"] as const;

  return (
    <div className="container method-section">
      <div className="section-heading">
        <p className="eyebrow">{t("home.aboutMethod.eyebrow")}</p>
        <h2>{t("home.aboutMethod.title")}</h2>
        <p className="section-lead">{t("home.aboutMethod.lead")}</p>
      </div>
      <div className="pillars-grid">
        {pillars.map((key) => (
          <article className="pillar-card" key={key}>
            <h3>{t(`home.aboutMethod.${key}.title`)}</h3>
            <p>{t(`home.aboutMethod.${key}.copy`)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
