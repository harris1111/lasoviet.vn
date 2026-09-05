import { useTranslations } from "next-intl";

export function HomepageProblem() {
  const t = useTranslations("common");
  const points = ["point1", "point2", "point3"] as const;

  return (
    <div className="container home-problem">
      <div className="section-heading">
        <p className="eyebrow">{t("home.problem.eyebrow")}</p>
        <h2>{t("home.problem.title")}</h2>
        <p className="problem-lead">{t("home.problem.lead")}</p>
      </div>
      <div className="problem-grid">
        {points.map((key) => (
          <article className="problem-card" key={key}>
            <h3>{t(`home.problem.${key}.title`)}</h3>
            <p>{t(`home.problem.${key}.copy`)}</p>
          </article>
        ))}
      </div>
      <p className="problem-bridge">{t("home.problem.bridge")}</p>
    </div>
  );
}
